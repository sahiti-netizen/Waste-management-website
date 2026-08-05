"""
The books of Shreyas Precision Components Pvt Ltd, generated deterministically.

This module builds the ORIGIN POINT: entity master plus four subledgers
(payroll, sales, purchase, remittance) plus the summary journal that posts
from them. Nothing downstream reads anything except these structures.

The key design point is visible in build_journal(): the journal entry is a
LOSSY SUMMARY of the payroll subledger. "Dr Salaries 82,00,000" cannot
regenerate 180 employees. Every entry therefore carries a subledger_ref back
to the atoms it summarises - that back-reference is what makes derivation
possible at all.
"""

import random

import statutes as st

SEED = 20260401
MONTH = "2026-04"
FINANCIAL_YEAR = "2026-27"

ENTITY_MASTER = {
    "EST_NAME": "Shreyas Precision Components Private Limited",
    "EST_ADDRESS": {
        "premise": "Plot 47, Phase III",
        "street": "IDA Jeedimetla",
        "city": "Hyderabad",
        "district": "Medchal-Malkajgiri",
        "state": "Telangana",
        "pin": "500055",
    },
    "EMPLOYER_NAME": "Shreyas Precision Components Private Limited",
    "ENTITY_TYPE": "Private Limited Company",
    "NATURE_OF_BUSINESS": "Manufacture of precision machined auto components",
    "NIC_CODE": "29301",
    "CIN": "U29301TG2014PTC094782",
    "PAN": "AAJCS7412N",
    "TAN": "HYDS29187B",
    "GST_NO": "36AAJCS7412N1ZK",
    "LIN": "1-2938-4756-1",
    "EPF_CODE": "TG/HYD/0048291",
    "ESIC_EMPLOYER_CODE": "52000384710001099",
    "PT_REG_NO": "36PT0049182",
    "LWF_REG_NO": "TG-LWF-118273",
    "AUTHORISED_PERSON": {
        "name": "Lakshmi Prasad Venkataraman",
        "designation": "Director",
        "pan": "AFZPV1183K",
    },
    "BANK_ACCOUNT": {"ifsc": "HDFC0001234", "account": "50200041827364"},
    "COMMENCEMENT_DATE": "2014-06-11",
}

FIRST_NAMES = ["Anitha", "Ravi", "Sridhar", "Kavitha", "Mahesh", "Padma", "Suresh",
               "Latha", "Venkatesh", "Swapna", "Naresh", "Bhavani", "Kiran",
               "Shanthi", "Prakash", "Vijaya", "Rajesh", "Sunitha", "Ganesh", "Radha"]
LAST_NAMES = ["Reddy", "Rao", "Kumar", "Sharma", "Naidu", "Goud", "Yadav",
              "Chary", "Prasad", "Devi", "Murthy", "Sastry"]

DEPARTMENTS = ["Machining", "Assembly", "Quality", "Maintenance", "Stores",
               "Administration"]
HAZARDOUS_DEPARTMENTS = {"Machining", "Maintenance"}


def _rupees(value):
    return int(round(value))


def build_workforce(count=180):
    """Employee master - the person-level atoms behind every labour filing."""
    rng = random.Random(SEED)
    workforce = []
    for index in range(count):
        department = rng.choice(DEPARTMENTS)
        # wage bands: most of the shopfloor sits below the ESI ceiling
        if department == "Administration":
            basic = rng.choice([28000, 34000, 45000, 62000])
        elif department == "Quality":
            basic = rng.choice([16000, 19000, 24000])
        else:
            basic = rng.choice([9500, 11000, 12500, 14000, 16500])

        workforce.append({
            "emp_id": f"SPC{1000 + index}",
            "EMP_NAME": f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}",
            "UAN": f"1{rng.randint(10**10, 10**11 - 1)}",
            "ESIC_IP_NO": f"52{rng.randint(10**8, 10**9 - 1)}",
            "PAN": f"{'ABCDEFGHIJ'[index % 10]}XYPS{1000 + index}{'ABCDEFGHIJ'[index % 10]}",
            "EMP_DOB": f"19{rng.randint(70, 99)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}",
            "EMP_SEX": rng.choice(["M", "M", "F"]),
            "EMP_DOJ": f"20{rng.randint(14, 25)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}",
            "EMP_DESIGNATION": {
                "Machining": "Machine Operator", "Assembly": "Assembly Technician",
                "Quality": "Quality Inspector", "Maintenance": "Maintenance Fitter",
                "Stores": "Stores Assistant", "Administration": "Executive",
            }[department],
            "EMP_DEPT": department,
            "hazardous_process": department in HAZARDOUS_DEPARTMENTS,
            "employment_type": "DIRECT",
            "basic": basic,
            "da": _rupees(basic * 0.18),
            "hra": _rupees(basic * 0.40),
            "conveyance": 1600,
            "special_allowance": _rupees(basic * 0.22),
            "epf_member": True,
        })
    return workforce


def build_payroll(workforce, month=MONTH, days_in_month=30):
    """
    One line per employee per month - the finest granularity any filing needs.

    Every statutory wage base is computed HERE, on the same line, from the same
    components. Four different definitions of "wages" coexist on one record:
    that is the whole point, and it is why a single WAGES element in a
    dictionary would be wrong.
    """
    rng = random.Random(SEED + 1)
    lines = []
    for employee in workforce:
        lop_days = rng.choice([0, 0, 0, 0, 1, 2])
        days_paid = days_in_month - lop_days
        proration = days_paid / days_in_month

        basic = _rupees(employee["basic"] * proration)
        da = _rupees(employee["da"] * proration)
        hra = _rupees(employee["hra"] * proration)
        conveyance = _rupees(employee["conveyance"] * proration)
        special = _rupees(employee["special_allowance"] * proration)
        overtime = _rupees(rng.choice([0, 0, 0, 850, 1400, 2200])
                           if employee["hazardous_process"] else 0)
        gross = basic + da + hra + conveyance + special + overtime

        # --- four statutory bases, one set of components -------------------
        epf_wages = min(basic + da, st.EPF_WAGE_CEILING) if employee["epf_member"] else 0
        esi_covered = gross <= st.ESI_WAGE_CEILING
        esi_wages = gross if esi_covered else 0
        pt_basis = gross
        annual_taxable = max(0, gross * 12 - st.IT_STANDARD_DEDUCTION)

        epf_employee = _rupees(epf_wages * st.EPF_EMPLOYEE_RATE)
        eps_employer = _rupees(epf_wages * st.EPS_RATE)
        epf_employer = _rupees(epf_wages * st.EPF_EMPLOYER_RATE) - eps_employer
        esi_employee = _rupees(esi_wages * st.ESI_EMPLOYEE_RATE)
        esi_employer = _rupees(esi_wages * st.ESI_EMPLOYER_RATE)
        professional_tax = st.professional_tax(pt_basis)
        tds = _rupees(st.income_tax_on(annual_taxable) / 12)

        deductions = epf_employee + esi_employee + professional_tax + tds
        lines.append({
            "month": month, "emp_id": employee["emp_id"],
            "EMP_NAME": employee["EMP_NAME"], "UAN": employee["UAN"],
            "ESIC_IP_NO": employee["ESIC_IP_NO"], "PAN": employee["PAN"],
            "EMP_SEX": employee["EMP_SEX"], "EMP_DOJ": employee["EMP_DOJ"],
            "EMP_DESIGNATION": employee["EMP_DESIGNATION"],
            "EMP_DEPT": employee["EMP_DEPT"],
            "hazardous_process": employee["hazardous_process"],
            "employment_type": employee["employment_type"],
            "days_in_month": days_in_month, "lop_days": lop_days,
            "ATTENDANCE_DAYS": days_paid,
            "basic": basic, "da": da, "hra": hra, "conveyance": conveyance,
            "special_allowance": special, "overtime": overtime, "gross": gross,
            "epf_member": employee["epf_member"], "epf_wages": epf_wages,
            "esi_covered": esi_covered, "esi_wages": esi_wages,
            "pt_basis": pt_basis, "annual_taxable": annual_taxable,
            "epf_employee": epf_employee, "epf_employer": epf_employer,
            "eps_employer": eps_employer,
            "esi_employee": esi_employee, "esi_employer": esi_employer,
            "professional_tax": professional_tax, "tds": tds,
            "total_deductions": deductions, "net_pay": gross - deductions,
        })
    return lines


def build_sales(month=MONTH):
    """Sales register - invoice-level atoms behind GSTR-1 and the P&L."""
    rng = random.Random(SEED + 2)
    customers = [
        ("Bharat Auto Systems Ltd", "36AABCB1234F1Z5", "Telangana", True),
        ("Deccan Motors Pvt Ltd", "36AACCD5678G1Z9", "Telangana", True),
        ("Chennai Drivetrain Ltd", "33AAECC9012H1Z3", "Tamil Nadu", False),
        ("Pune Precision Works", "27AADCP3456J1Z7", "Maharashtra", False),
        ("Karnataka Gearbox Co", "29AAFCK7890K1Z1", "Karnataka", False),
    ]
    invoices = []
    for number in range(1, 43):
        name, gstin, state, intra = customers[number % len(customers)]
        taxable = rng.choice([185000, 264000, 312500, 428000, 596000, 742000])
        tax = _rupees(taxable * st.GST_RATE_AUTO_COMPONENTS)
        invoices.append({
            "invoice_no": f"SPC/26-27/{number:04d}",
            "invoice_date": f"{month}-{min(28, (number % 28) + 1):02d}",
            "customer_name": name, "customer_gstin": gstin,
            "place_of_supply": state, "intra_state": intra,
            "HSN_CODE": rng.choice(["87089900", "84831099", "87082900"]),
            "taxable_value": taxable,
            "cgst": _rupees(tax / 2) if intra else 0,
            "sgst": _rupees(tax / 2) if intra else 0,
            "igst": 0 if intra else tax,
            "invoice_total": taxable + tax,
            "supply_type": "B2B",
        })
    return invoices


def build_purchases(month=MONTH):
    """Purchase register - ITC atoms, plus the contractor bills that carry TDS."""
    rng = random.Random(SEED + 3)
    purchases = []
    vendors = [
        ("Sri Balaji Steels", "36AAGCS2345L1Z4", "GOODS", True, None),
        ("Hyderabad Tooling Co", "36AAHCH6789M1Z8", "GOODS", True, None),
        ("Nagpur Alloys Ltd", "27AAICN1234N1Z2", "GOODS", False, None),
        ("Sai Manpower Services", "36AAJCS5678P1Z6", "SERVICE", True, "COMPANY"),
        ("Ganesh Housekeeping", "36AAKCG9012Q1Z0", "SERVICE", True, "INDIVIDUAL"),
    ]
    for number in range(1, 29):
        name, gstin, kind, intra, contractor = vendors[number % len(vendors)]
        taxable = rng.choice([96000, 148000, 213000, 305000, 412000])
        tax = _rupees(taxable * st.GST_RATE_AUTO_COMPONENTS)
        tds_rate = (st.TDS_194C_COMPANY if contractor == "COMPANY"
                    else st.TDS_194C_INDIVIDUAL if contractor else 0)
        purchases.append({
            "bill_no": f"P/{number:04d}",
            "bill_date": f"{month}-{min(28, (number % 28) + 1):02d}",
            "vendor_name": name, "vendor_gstin": gstin, "vendor_kind": kind,
            "intra_state": intra, "taxable_value": taxable,
            "cgst": _rupees(tax / 2) if intra else 0,
            "sgst": _rupees(tax / 2) if intra else 0,
            "igst": 0 if intra else tax,
            "itc_eligible": True,
            "is_contract_labour": contractor is not None,
            "contractor_constitution": contractor,
            "tds_section": "194C" if contractor else None,
            "tds_amount": _rupees(taxable * tds_rate),
        })
    return purchases


def build_journal(payroll, sales, purchases, month=MONTH):
    """
    Summary postings. Deliberately lossy - each carries subledger_ref back to
    the atoms, which is the only reason anything downstream can be derived.
    """
    def total(rows, field):
        return sum(row[field] for row in rows)

    gross = total(payroll, "gross")
    entries = [{
        "je_id": "JE-PAY-001", "date": f"{month}-30",
        "narration": f"Payroll for {month}",
        "subledger_ref": "payroll", "atom_count": len(payroll),
        "lines": [
            {"account": "Salaries and Wages", "dr": gross},
            {"account": "Employer PF Contribution",
             "dr": total(payroll, "epf_employer") + total(payroll, "eps_employer")},
            {"account": "Employer ESI Contribution", "dr": total(payroll, "esi_employer")},
            {"account": "Salaries Payable", "cr": total(payroll, "net_pay")},
            {"account": "PF Payable",
             "cr": total(payroll, "epf_employee") + total(payroll, "epf_employer")
                   + total(payroll, "eps_employer")},
            {"account": "ESI Payable",
             "cr": total(payroll, "esi_employee") + total(payroll, "esi_employer")},
            {"account": "Professional Tax Payable", "cr": total(payroll, "professional_tax")},
            {"account": "TDS Payable - Salary (24Q)", "cr": total(payroll, "tds")},
        ],
    }, {
        "je_id": "JE-SAL-001", "date": f"{month}-30",
        "narration": f"Sales for {month}",
        "subledger_ref": "sales", "atom_count": len(sales),
        "lines": [
            {"account": "Trade Receivables", "dr": total(sales, "invoice_total")},
            {"account": "Revenue from Operations", "cr": total(sales, "taxable_value")},
            {"account": "Output CGST", "cr": total(sales, "cgst")},
            {"account": "Output SGST", "cr": total(sales, "sgst")},
            {"account": "Output IGST", "cr": total(sales, "igst")},
        ],
    }, {
        "je_id": "JE-PUR-001", "date": f"{month}-30",
        "narration": f"Purchases and services for {month}",
        "subledger_ref": "purchases", "atom_count": len(purchases),
        "lines": [
            {"account": "Purchases / Services", "dr": total(purchases, "taxable_value")},
            {"account": "Input CGST", "dr": total(purchases, "cgst")},
            {"account": "Input SGST", "dr": total(purchases, "sgst")},
            {"account": "Input IGST", "dr": total(purchases, "igst")},
            {"account": "Trade Payables",
             "cr": total(purchases, "taxable_value") + total(purchases, "cgst")
                   + total(purchases, "sgst") + total(purchases, "igst")
                   - total(purchases, "tds_amount")},
            {"account": "TDS Payable - 194C", "cr": total(purchases, "tds_amount")},
        ],
    }]
    return entries


def build_remittances(payroll, purchases, month=MONTH):
    """Challan/UTR atoms. These carry PAYMENT_REFS, which no filing can derive."""
    def total(rows, field):
        return sum(row[field] for row in rows)

    return [
        {"challan_type": "EPF ECR", "trrn": "TG2026040001827",
         "amount": total(payroll, "epf_employee") + total(payroll, "epf_employer")
                   + total(payroll, "eps_employer"),
         "paid_on": "2026-05-14", "utr": "HDFCR52026051400182"},
        {"challan_type": "ESI", "trrn": "ESI20260400091823",
         "amount": total(payroll, "esi_employee") + total(payroll, "esi_employer"),
         "paid_on": "2026-05-15", "utr": "HDFCR52026051500377"},
        {"challan_type": "PT Telangana", "trrn": "PT36202604001192",
         "amount": total(payroll, "professional_tax"),
         "paid_on": "2026-05-10", "utr": "HDFCR52026051000914"},
        {"challan_type": "TDS 24Q", "trrn": "0000120260507012",
         "amount": total(payroll, "tds"),
         "paid_on": "2026-05-07", "utr": "HDFCR52026050700238"},
        {"challan_type": "TDS 26Q", "trrn": "0000120260507013",
         "amount": total(purchases, "tds_amount"),
         "paid_on": "2026-05-07", "utr": "HDFCR52026050700239"},
    ]


def build_books(month=MONTH):
    workforce = build_workforce()
    payroll = build_payroll(workforce, month)
    sales = build_sales(month)
    purchases = build_purchases(month)
    return {
        "month": month,
        "financial_year": FINANCIAL_YEAR,
        "entity": ENTITY_MASTER,
        "workforce": workforce,
        "payroll": payroll,
        "sales": sales,
        "purchases": purchases,
        "journal": build_journal(payroll, sales, purchases, month),
        "remittances": build_remittances(payroll, purchases, month),
    }
