"""
Derivation engine: books -> elements -> filings.

Three moving parts:

  RESOLVERS   one function per dictionary element. Reads ONLY the books.
              Returns (value, atom_count) so every figure is traceable.
  FORM_SPECS  declarative. A filing is a list of element codes; adding a new
              filing means adding a spec, not writing code.
  generate()  walks a spec, resolves each element, records provenance.

No filing ever reads another filing. Every value traces to atoms.
"""

import json
import os
from collections import Counter, defaultdict

import books as books_module
import statutes as st

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")


# --------------------------------------------------------------------------
# resolvers: element code -> (value, number of atom records touched)
# --------------------------------------------------------------------------

def _sum(rows, field):
    return sum(row[field] for row in rows), len(rows)


RESOLVERS = {
    # entity master - supplied once, reused everywhere
    "EST_NAME":            lambda b: (b["entity"]["EST_NAME"], 1),
    "EST_ADDRESS":         lambda b: (b["entity"]["EST_ADDRESS"], 1),
    "EMPLOYER_NAME":       lambda b: (b["entity"]["EMPLOYER_NAME"], 1),
    "ENTITY_TYPE":         lambda b: (b["entity"]["ENTITY_TYPE"], 1),
    "PAN":                 lambda b: (b["entity"]["PAN"], 1),
    "TAN":                 lambda b: (b["entity"]["TAN"], 1),
    "GST_NO":              lambda b: (b["entity"]["GST_NO"], 1),
    "CIN":                 lambda b: (b["entity"]["CIN"], 1),
    "LIN":                 lambda b: (b["entity"]["LIN"], 1),
    "EPF_CODE":            lambda b: (b["entity"]["EPF_CODE"], 1),
    "ESIC_EMPLOYER_CODE":  lambda b: (b["entity"]["ESIC_EMPLOYER_CODE"], 1),
    "PT_REG_NO":           lambda b: (b["entity"]["PT_REG_NO"], 1),
    "AUTHORISED_PERSON":   lambda b: (b["entity"]["AUTHORISED_PERSON"], 1),
    "RETURN_PERIOD":       lambda b: (b["month"], 0),

    # ---- the four wage bases: same atoms, different statutory predicates ----
    "GROSS_WAGES":   lambda b: _sum(b["payroll"], "gross"),
    "EPF_WAGES":     lambda b: _sum([r for r in b["payroll"] if r["epf_member"]], "epf_wages"),
    "ESI_WAGES":     lambda b: _sum([r for r in b["payroll"] if r["esi_covered"]], "esi_wages"),
    "PT_BASIS":      lambda b: _sum(b["payroll"], "pt_basis"),
    "TAXABLE_SALARY": lambda b: _sum(b["payroll"], "annual_taxable"),

    "ATTENDANCE_DAYS": lambda b: _sum(b["payroll"], "ATTENDANCE_DAYS"),
    "EPF_EE_CONTRIB":  lambda b: _sum(b["payroll"], "epf_employee"),
    "EPF_ER_CONTRIB":  lambda b: _sum(b["payroll"], "epf_employer"),
    "EPS_CONTRIB":     lambda b: _sum(b["payroll"], "eps_employer"),
    "ESI_EE_CONTRIB":  lambda b: _sum(b["payroll"], "esi_employee"),
    "ESI_ER_CONTRIB":  lambda b: _sum(b["payroll"], "esi_employer"),
    "PROFESSIONAL_TAX": lambda b: _sum(b["payroll"], "professional_tax"),
    "TDS_SALARY":      lambda b: _sum(b["payroll"], "tds"),
    "TDS_CONTRACTOR":  lambda b: _sum(b["purchases"], "tds_amount"),

    # ---- headcounts: one person list, four different WHERE clauses ---------
    "HEADCOUNT_TOTAL":         lambda b: (len(b["payroll"]), len(b["payroll"])),
    "HEADCOUNT_EPF_MEMBERS":   lambda b: (sum(1 for r in b["payroll"] if r["epf_member"]), len(b["payroll"])),
    "HEADCOUNT_ESI_COVERED":   lambda b: (sum(1 for r in b["payroll"] if r["esi_covered"]), len(b["payroll"])),
    "HEADCOUNT_HAZARDOUS":     lambda b: (sum(1 for r in b["payroll"] if r["hazardous_process"]), len(b["payroll"])),
    "HEADCOUNT_BY_SEX":        lambda b: (dict(Counter(r["EMP_SEX"] for r in b["payroll"])), len(b["payroll"])),

    # ---- GST ---------------------------------------------------------------
    "TAXABLE_TURNOVER": lambda b: _sum(b["sales"], "taxable_value"),
    "OUTPUT_CGST":      lambda b: _sum(b["sales"], "cgst"),
    "OUTPUT_SGST":      lambda b: _sum(b["sales"], "sgst"),
    "OUTPUT_IGST":      lambda b: _sum(b["sales"], "igst"),
    "ITC_CGST":         lambda b: _sum([p for p in b["purchases"] if p["itc_eligible"]], "cgst"),
    "ITC_SGST":         lambda b: _sum([p for p in b["purchases"] if p["itc_eligible"]], "sgst"),
    "ITC_IGST":         lambda b: _sum([p for p in b["purchases"] if p["itc_eligible"]], "igst"),

    "SALARY_EXPENSE":   lambda b: _sum(b["payroll"], "gross"),
    # scoped by the binding form: an EPF return carries only its own challan
    "PAYMENT_REFS":     lambda b, scope=None: ([{"type": r["challan_type"], "trrn": r["trrn"],
                                                 "amount": r["amount"], "utr": r["utr"]}
                                                for r in b["remittances"]
                                                if scope is None or r["challan_type"] in scope],
                                               len(b["remittances"])),
    "S43B_PAID_STATUS": lambda b: ([{"due": r["challan_type"], "amount": r["amount"],
                                     "paid_on": r["paid_on"], "allowable": True}
                                    for r in b["remittances"]], len(b["remittances"])),
}


def _hsn_summary(b):
    grouped = defaultdict(lambda: {"taxable_value": 0, "tax": 0, "invoices": 0})
    for invoice in b["sales"]:
        bucket = grouped[invoice["HSN_CODE"]]
        bucket["taxable_value"] += invoice["taxable_value"]
        bucket["tax"] += invoice["cgst"] + invoice["sgst"] + invoice["igst"]
        bucket["invoices"] += 1
    return ([{"hsn": k, **v} for k, v in sorted(grouped.items())], len(b["sales"]))


def _b2b_invoices(b):
    return ([{"gstin": i["customer_gstin"], "invoice_no": i["invoice_no"],
              "date": i["invoice_date"], "taxable_value": i["taxable_value"],
              "cgst": i["cgst"], "sgst": i["sgst"], "igst": i["igst"],
              "place_of_supply": i["place_of_supply"]}
             for i in b["sales"] if i["supply_type"] == "B2B"], len(b["sales"]))


def _contractor_list(b):
    grouped = defaultdict(lambda: {"gstin": "", "amount": 0, "tds": 0, "bills": 0})
    for purchase in b["purchases"]:
        if not purchase["is_contract_labour"]:
            continue
        bucket = grouped[purchase["vendor_name"]]
        bucket["gstin"] = purchase["vendor_gstin"]
        bucket["amount"] += purchase["taxable_value"]
        bucket["tds"] += purchase["tds_amount"]
        bucket["bills"] += 1
    return ([{"contractor": k, **v} for k, v in sorted(grouped.items())], len(b["purchases"]))


RESOLVERS["HSN_SUMMARY"] = _hsn_summary
RESOLVERS["B2B_INVOICES"] = _b2b_invoices
RESOLVERS["CONTRACTOR_LIST"] = _contractor_list

# per-person schedules that certain filings carry line by line
PERSON_SCHEDULES = {
    "EPF_ECR_LINES": lambda b: ([{"UAN": r["UAN"], "EMP_NAME": r["EMP_NAME"],
                                  "EPF_WAGES": r["epf_wages"], "EPF_EE": r["epf_employee"],
                                  "EPS": r["eps_employer"], "EPF_ER": r["epf_employer"],
                                  "ATTENDANCE_DAYS": r["ATTENDANCE_DAYS"]}
                                 for r in b["payroll"] if r["epf_member"]], len(b["payroll"])),
    "ESI_LINES": lambda b: ([{"ESIC_IP_NO": r["ESIC_IP_NO"], "EMP_NAME": r["EMP_NAME"],
                              "ESI_WAGES": r["esi_wages"], "ESI_EE": r["esi_employee"],
                              "ATTENDANCE_DAYS": r["ATTENDANCE_DAYS"]}
                             for r in b["payroll"] if r["esi_covered"]], len(b["payroll"])),
    "TDS_DEDUCTEE_LINES": lambda b: ([{"EMP_PAN": r["PAN"], "EMP_NAME": r["EMP_NAME"],
                                       "TAXABLE_SALARY": r["annual_taxable"],
                                       "TDS_SALARY": r["tds"]}
                                      for r in b["payroll"] if r["tds"] > 0], len(b["payroll"])),
}
RESOLVERS.update(PERSON_SCHEDULES)


# --------------------------------------------------------------------------
# form specs - declarative. Adding a filing = adding an entry here.
# --------------------------------------------------------------------------

FORM_SPECS = [
    {"form_id": "GSTR-1", "authority": "GSTN", "domain": "GST", "cadence": "monthly",
     "elements": ["GST_NO", "EST_NAME", "RETURN_PERIOD", "TAXABLE_TURNOVER",
                  "OUTPUT_CGST", "OUTPUT_SGST", "OUTPUT_IGST", "B2B_INVOICES",
                  "HSN_SUMMARY", "AUTHORISED_PERSON"]},

    {"form_id": "GSTR-3B", "authority": "GSTN", "domain": "GST", "cadence": "monthly",
     "elements": ["GST_NO", "EST_NAME", "RETURN_PERIOD", "TAXABLE_TURNOVER",
                  "OUTPUT_CGST", "OUTPUT_SGST", "OUTPUT_IGST",
                  "ITC_CGST", "ITC_SGST", "ITC_IGST", "AUTHORISED_PERSON"]},

    {"form_id": "EPF-ECR", "authority": "EPFO", "domain": "Labour", "cadence": "monthly",
     "elements": ["EPF_CODE", "EST_NAME", "EST_ADDRESS", "LIN", "RETURN_PERIOD",
                  "HEADCOUNT_EPF_MEMBERS", "EPF_WAGES", "EPF_EE_CONTRIB",
                  "EPF_ER_CONTRIB", "EPS_CONTRIB", "EPF_ECR_LINES",
                  {"code": "PAYMENT_REFS", "scope": ["EPF ECR"]}, "AUTHORISED_PERSON"]},

    {"form_id": "ESI-Contribution", "authority": "ESIC", "domain": "Labour", "cadence": "monthly",
     "elements": ["ESIC_EMPLOYER_CODE", "EST_NAME", "EST_ADDRESS", "RETURN_PERIOD",
                  "HEADCOUNT_ESI_COVERED", "ESI_WAGES", "ESI_EE_CONTRIB",
                  "ESI_ER_CONTRIB", "ESI_LINES",
                  {"code": "PAYMENT_REFS", "scope": ["ESI"]}, "AUTHORISED_PERSON"]},

    {"form_id": "PT-Return-TG", "authority": "Telangana CTD", "domain": "Labour", "cadence": "monthly",
     "elements": ["PT_REG_NO", "EST_NAME", "EST_ADDRESS", "RETURN_PERIOD",
                  "HEADCOUNT_TOTAL", "PT_BASIS", "PROFESSIONAL_TAX",
                  {"code": "PAYMENT_REFS", "scope": ["PT Telangana"]}, "AUTHORISED_PERSON"]},

    {"form_id": "Form-24Q", "authority": "Income Tax", "domain": "Income Tax", "cadence": "quarterly",
     "elements": ["TAN", "PAN", "EST_NAME", "EST_ADDRESS", "RETURN_PERIOD",
                  "TDS_SALARY", "TAXABLE_SALARY", "TDS_DEDUCTEE_LINES",
                  {"code": "PAYMENT_REFS", "scope": ["TDS 24Q"]}, "AUTHORISED_PERSON"]},

    {"form_id": "Form-26Q", "authority": "Income Tax", "domain": "Income Tax", "cadence": "quarterly",
     "elements": ["TAN", "PAN", "EST_NAME", "RETURN_PERIOD", "TDS_CONTRACTOR",
                  "CONTRACTOR_LIST", {"code": "PAYMENT_REFS", "scope": ["TDS 26Q"]}, "AUTHORISED_PERSON"]},

    {"form_id": "OSH-Annual-Return", "authority": "Labour Dept", "domain": "Labour", "cadence": "annual",
     "elements": ["LIN", "EST_NAME", "EST_ADDRESS", "EMPLOYER_NAME", "ENTITY_TYPE",
                  "RETURN_PERIOD", "HEADCOUNT_TOTAL", "HEADCOUNT_BY_SEX",
                  "HEADCOUNT_HAZARDOUS", "ATTENDANCE_DAYS", "GROSS_WAGES",
                  "CONTRACTOR_LIST", "AUTHORISED_PERSON"]},

    {"form_id": "ITR-Sch-Tax-Audit", "authority": "Income Tax", "domain": "Income Tax", "cadence": "annual",
     "elements": ["PAN", "CIN", "EST_NAME", "ENTITY_TYPE", "RETURN_PERIOD",
                  "TAXABLE_TURNOVER", "SALARY_EXPENSE", "S43B_PAID_STATUS",
                  "AUTHORISED_PERSON"]},
]


def binding_code(binding):
    """A binding is either a bare element code or {code, scope}."""
    return binding if isinstance(binding, str) else binding["code"]


def generate(spec, book_set):
    """Resolve every element in a form spec, recording provenance for each."""
    filing = {"form_id": spec["form_id"], "authority": spec["authority"],
              "domain": spec["domain"], "cadence": spec["cadence"], "fields": {}}
    trace = []
    for binding in spec["elements"]:
        code = binding_code(binding)
        scope = None if isinstance(binding, str) else binding.get("scope")
        resolver = RESOLVERS.get(code)
        if resolver is None:
            filing["fields"][code] = None
            trace.append({"element": code, "status": "UNRESOLVED", "atoms": 0})
            continue
        value, atom_count = (resolver(book_set, scope) if scope is not None
                             else resolver(book_set))
        filing["fields"][code] = value
        trace.append({"element": code, "status": "derived", "atoms": atom_count,
                      "scope": scope})
    filing["_provenance"] = trace
    return filing


def main():
    book_set = books_module.build_books()
    os.makedirs(OUT, exist_ok=True)

    atom_count = (len(book_set["payroll"]) + len(book_set["sales"])
                  + len(book_set["purchases"]) + len(book_set["remittances"])
                  + len(book_set["entity"]))

    print("=" * 74)
    print("SHREYAS PRECISION COMPONENTS PVT LTD - straight-through filing run")
    print(f"Period {book_set['month']}   FY {book_set['financial_year']}")
    print("=" * 74)
    print(f"\nBOOKS (the single origin point)")
    print(f"  entity master fields   : {len(book_set['entity'])}")
    print(f"  payroll lines          : {len(book_set['payroll'])}")
    print(f"  sales invoices         : {len(book_set['sales'])}")
    print(f"  purchase bills         : {len(book_set['purchases'])}")
    print(f"  remittance challans    : {len(book_set['remittances'])}")
    print(f"  summary journal entries: {len(book_set['journal'])}")

    with open(os.path.join(HERE, "dictionary.json")) as handle:
        dictionary = {e["code"]: e for e in json.load(handle)["elements"]}

    print("\nTHE SAME PAYROLL, FOUR STATUTORY WAGE BASES")
    for code in ["GROSS_WAGES", "EPF_WAGES", "ESI_WAGES", "TAXABLE_SALARY"]:
        value, atoms = RESOLVERS[code](book_set)
        element = dictionary[code]
        period = "annual" if code == "TAXABLE_SALARY" else "monthly"
        print(f"  {code:<16} INR {value:>13,}  [{period}]  "
              f"{element.get('scope_predicate', element['definition'])[:44]}")
    print("  one payroll register -> four numbers, none interchangeable.")
    print("  note the temporal mismatch: TAXABLE_SALARY is an ANNUAL projection,")
    print("  the rest are monthly. Comparing them without temporal_type is the")
    print("  single commonest way these mappings go wrong.")

    print("\nHEADCOUNT UNDER FOUR DEFINITIONS")
    for code in ["HEADCOUNT_TOTAL", "HEADCOUNT_EPF_MEMBERS",
                 "HEADCOUNT_ESI_COVERED", "HEADCOUNT_HAZARDOUS"]:
        value, _ = RESOLVERS[code](book_set)
        print(f"  {code:<24} {value:>5}")

    print("\nGENERATED FILINGS")
    filings, field_values, element_uses = [], 0, Counter()
    for spec in FORM_SPECS:
        filing = generate(spec, book_set)
        filings.append(filing)
        unresolved = [t["element"] for t in filing["_provenance"]
                      if t["status"] == "UNRESOLVED"]
        codes = [binding_code(x) for x in spec["elements"]]
        field_values += len(codes)
        element_uses.update(codes)
        path = os.path.join(OUT, f"{spec['form_id']}.json")
        with open(path, "w") as handle:
            json.dump(filing, handle, indent=2, default=str)
        flag = f"  UNRESOLVED: {unresolved}" if unresolved else ""
        print(f"  {spec['form_id']:<22} {spec['domain']:<12} "
              f"{len(spec['elements']):>2} fields  -> out/{spec['form_id']}.json{flag}")

    distinct_elements = len(element_uses)
    print("\n" + "=" * 74)
    print("RESULT")
    print("=" * 74)
    print(f"  filings generated                 : {len(filings)}")
    print(f"  total field values emitted (N)    : {field_values}")
    print(f"  distinct elements used (D)        : {distinct_elements}")
    print(f"  redundancy avoided  R = 1 - D/N   : {1 - distinct_elements/field_values:.1%}")
    print(f"  atom records captured once        : {atom_count}")
    print(f"  human data-entry events required  : 0 (books already exist)")

    print("\n  most-reused elements:")
    for code, uses in element_uses.most_common(6):
        print(f"    {code:<22} bound by {uses} of {len(FORM_SPECS)} filings")

    # provenance drill-down: every filed figure traces back to atoms
    print("\nPROVENANCE DRILL-DOWN  (EPF-ECR / EPF_EE_CONTRIB)")
    value, atoms = RESOLVERS["EPF_EE_CONTRIB"](book_set)
    print(f"    filed value  : INR {value:,}")
    print(f"    derived from : {atoms} payroll lines")
    print(f"    rule         : sum(epf_employee) where epf_member")
    sample = [r for r in book_set["payroll"] if r["epf_member"]][:3]
    for row in sample:
        print(f"      {row['emp_id']}  basic+da {row['basic'] + row['da']:>7,}  "
              f"-> epf_wages {row['epf_wages']:>6,}  -> ee {row['epf_employee']:>5,}")
    print(f"      ... and {atoms - 3} more lines")
    print("    an inspector can walk any filed number back to named individuals.")

    with open(os.path.join(OUT, "_summary.json"), "w") as handle:
        json.dump({"filings": len(filings), "field_values": field_values,
                   "distinct_elements": distinct_elements,
                   "R": round(1 - distinct_elements / field_values, 4),
                   "atoms": atom_count,
                   "element_uses": element_uses.most_common()}, handle, indent=2)


if __name__ == "__main__":
    main()
