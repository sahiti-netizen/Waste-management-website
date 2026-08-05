"""
Payroll readiness audit.

The whole straight-through model rests on one assumption: that an SME's payroll
record already carries the dimensions the statutory predicates filter on. This
script tests that assumption against a real payroll file.

Usage:
    python3 payroll_readiness.py <payroll.csv|payroll.xlsx>
    python3 payroll_readiness.py --demo        # typical SME sheet, no file needed

It reads only the HEADER ROW. No payroll values are read, so the file needs no
anonymisation before running this.
"""

import sys

# Each dimension names the filings that break without it. "derivable_from" means
# the dimension can be reconstructed if those other columns are present.
REQUIRED_DIMENSIONS = [
    {"code": "EMP_ID", "label": "Stable employee identifier",
     "synonyms": ["emp id", "employee id", "emp code", "empno", "employee code", "token", "ticket no"],
     "breaks": ["every person-level schedule"], "criticality": "fatal"},

    {"code": "EMP_NAME", "label": "Employee name",
     "synonyms": ["name", "employee name", "emp name", "worker name"],
     "breaks": ["EPF ECR", "ESI", "24Q", "wage register"], "criticality": "fatal"},

    {"code": "UAN", "label": "Universal Account Number",
     "synonyms": ["uan", "uan no", "uan number", "pf uan"],
     "breaks": ["EPF ECR"], "criticality": "fatal"},

    {"code": "ESIC_IP_NO", "label": "ESIC insured person number",
     "synonyms": ["ip no", "ipno", "esic no", "esi no", "insurance no", "esic ip"],
     "breaks": ["ESI contribution"], "criticality": "fatal"},

    {"code": "EMP_PAN", "label": "Employee PAN",
     "synonyms": ["pan", "pan no", "employee pan", "pan number"],
     "breaks": ["Form 24Q", "Form 16"], "criticality": "fatal"},

    {"code": "BASIC", "label": "Basic wage, separately stated",
     "synonyms": ["basic", "basic pay", "basic salary", "basic wage"],
     "breaks": ["EPF_WAGES (needs basic+DA, not gross)"], "criticality": "fatal"},

    {"code": "DA", "label": "Dearness allowance, separately stated",
     "synonyms": ["da", "dearness", "dearness allowance", "d.a."],
     "breaks": ["EPF_WAGES"], "criticality": "high",
     "note": "If the establishment genuinely pays no DA, record an explicit zero "
             "rather than omitting the column."},

    {"code": "GROSS", "label": "Gross wages",
     "synonyms": ["gross", "gross wages", "gross salary", "total earnings", "gross pay"],
     "breaks": ["ESI coverage test", "PT slab", "OSH wage aggregates"], "criticality": "fatal"},

    {"code": "DAYS_PAID", "label": "Days worked / paid",
     "synonyms": ["days paid", "days worked", "paid days", "present days", "days present", "working days", "attendance"],
     "breaks": ["EPF ECR (NCP days)", "ESI", "OSH attendance aggregates"], "criticality": "fatal"},

    {"code": "LOP_DAYS", "label": "Loss-of-pay days, separate from days paid",
     "synonyms": ["lop", "lop days", "loss of pay", "absent days", "lwp", "unpaid days"],
     "breaks": ["EPF ECR non-contributory period"], "criticality": "high"},

    {"code": "EMP_SEX", "label": "Gender",
     "synonyms": ["sex", "gender", "m/f"],
     "breaks": ["OSH annual return", "maternity returns", "HEADCOUNT_BY_SEX"], "criticality": "high"},

    {"code": "EMP_DOJ", "label": "Date of joining",
     "synonyms": ["doj", "date of joining", "joining date", "date joined"],
     "breaks": ["EPF ECR (new joiners)", "gratuity", "OSH return"], "criticality": "high"},

    {"code": "HAZARDOUS_FLAG", "label": "Engaged in hazardous process",
     "synonyms": ["hazardous", "hazardous process", "risk category", "process type"],
     "breaks": ["OSH annual return", "HEADCOUNT_HAZARDOUS", "safety returns"],
     "criticality": "high",
     "note": "Rarely present. Usually derivable from department or section if a "
             "department-to-process mapping is agreed once.",
     "derivable_from": ["DEPARTMENT"]},

    {"code": "EMPLOYMENT_TYPE", "label": "Direct vs contract vs apprentice",
     "synonyms": ["type", "employment type", "category", "emp type", "direct/contract", "nature of employment"],
     "breaks": ["contract labour returns", "principal employer aggregates"], "criticality": "high"},

    {"code": "DEPARTMENT", "label": "Department or section",
     "synonyms": ["department", "dept", "section", "cost centre", "cost center", "unit"],
     "breaks": ["hazardous-process derivation", "OSH section-wise returns"], "criticality": "medium"},

    {"code": "DESIGNATION", "label": "Designation",
     "synonyms": ["designation", "grade", "post", "role", "job title"],
     "breaks": ["wage register", "OSH return"], "criticality": "medium"},

    {"code": "PT_STATE", "label": "State of work for professional tax",
     "synonyms": ["state", "location", "branch", "work location", "pt state"],
     "breaks": ["PT return where the entity operates in more than one state"],
     "criticality": "medium",
     "note": "Only material for multi-state establishments, but silently wrong "
             "when missing."},
]


def normalise(text):
    return "".join(ch for ch in str(text).lower().strip() if ch.isalnum() or ch == " ")


def audit(headers):
    """Match header row against required dimensions."""
    normalised = [normalise(h) for h in headers]
    results = []
    for dimension in REQUIRED_DIMENSIONS:
        matched = None
        for header, raw in zip(normalised, headers):
            if any(header == normalise(s) for s in dimension["synonyms"]):
                matched = raw
                break
        if matched is None:  # looser pass, but on whole words only - a bare
            # substring test makes "da" match "days present"
            for header, raw in zip(normalised, headers):
                words = header.split()
                if any(all(w in words for w in normalise(s).split())
                       for s in dimension["synonyms"]):
                    matched = raw
                    break
        results.append({**dimension, "found_as": matched, "present": matched is not None})
    return results


def report(results):
    present = [r for r in results if r["present"]]
    missing = [r for r in results if not r["present"]]
    recoverable = [r for r in missing
                   if any(d in {x["code"] for x in present} for d in r.get("derivable_from", []))]
    hard_missing = [r for r in missing if r not in recoverable]

    print(f"\nPAYROLL READINESS: {len(present)}/{len(results)} dimensions present\n")

    print("PRESENT")
    for r in present:
        print(f"  [ok]      {r['code']:<18} found as '{r['found_as']}'")

    if recoverable:
        print("\nMISSING BUT RECOVERABLE")
        for r in recoverable:
            print(f"  [derive]  {r['code']:<18} from {', '.join(r['derivable_from'])}")
            if r.get("note"):
                print(f"            {r['note']}")

    if hard_missing:
        print("\nMISSING - THESE BREAK FILINGS")
        for r in sorted(hard_missing, key=lambda x: {"fatal": 0, "high": 1, "medium": 2}[x["criticality"]]):
            print(f"  [{r['criticality'].upper():<6}] {r['code']:<18} {r['label']}")
            print(f"            breaks: {', '.join(r['breaks'])}")
            if r.get("note"):
                print(f"            {r['note']}")

    fatal = [r for r in hard_missing if r["criticality"] == "fatal"]
    print("\n" + "-" * 66)
    if fatal:
        print(f"VERDICT: NOT READY. {len(fatal)} fatal gap(s) - straight-through")
        print("         filing is impossible until these are captured at source.")
    elif hard_missing:
        print(f"VERDICT: PARTIAL. Core filings derivable; {len(hard_missing)} gap(s)")
        print("         block specific returns.")
    else:
        print("VERDICT: READY. All statutory predicates resolvable.")
    print("-" * 66)
    return {"present": len(present), "total": len(results), "fatal": len(fatal)}


DEMO_HEADERS = ["S.No", "Emp Code", "Name of Employee", "Designation",
                "Days Present", "Basic", "HRA", "Conveyance", "Other Allowance",
                "Gross Salary", "PF", "ESI", "PT", "TDS", "Advance",
                "Total Deductions", "Net Payable", "Bank A/c"]


def main():
    if len(sys.argv) < 2 or sys.argv[1] == "--demo":
        print("DEMO: headers typical of an SME payroll sheet")
        print("      " + " | ".join(DEMO_HEADERS))
        report(audit(DEMO_HEADERS))
        return

    path = sys.argv[1]
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        sheet = openpyxl.load_workbook(path, read_only=True).worksheets[0]
        headers = [c for c in next(sheet.iter_rows(max_row=1, values_only=True)) if c]
    else:
        import csv
        with open(path, newline="", encoding="utf-8-sig") as handle:
            headers = next(csv.reader(handle))
    print(f"Audited: {path}")
    report(audit(headers))


if __name__ == "__main__":
    main()
