"""
Statutory parameters used by the derivation engine.

ILLUSTRATIVE VALUES - VERIFY BEFORE ANY REAL USE.
Rates, ceilings and slabs change by notification and by state. Every constant
here carries the shape the engine needs; none should be treated as current law.
Each entry names the instrument it comes from so a domain expert can check it.
"""

# --- EPF (EPF & MP Act / EPF Scheme) -------------------------------------
EPF_WAGE_CEILING = 15000          # statutory wage ceiling for contribution
EPF_EMPLOYEE_RATE = 0.12
EPF_EMPLOYER_RATE = 0.12
EPS_RATE = 0.0833                 # employer share diverted to pension
EDLI_RATE = 0.005
EPF_ADMIN_RATE = 0.005

# --- ESI (ESI Act) --------------------------------------------------------
ESI_WAGE_CEILING = 21000          # coverage threshold on gross wages
ESI_EMPLOYEE_RATE = 0.0075
ESI_EMPLOYER_RATE = 0.0325

# --- Professional Tax (Telangana PT Act) ---------------------------------
# (lower_bound_inclusive, upper_bound_inclusive_or_None, monthly_tax)
PT_SLABS_TELANGANA = [
    (0, 14999, 0),
    (15000, 19999, 150),
    (20000, None, 200),
]

# --- Labour Welfare Fund (Telangana LWF) ---------------------------------
LWF_EMPLOYEE_ANNUAL = 2
LWF_EMPLOYER_ANNUAL = 5
LWF_DEDUCTION_MONTH = 12          # deducted in December

# --- Income Tax (new regime slabs, salaried) -----------------------------
IT_STANDARD_DEDUCTION = 75000
IT_SLABS = [                      # (upper_bound_or_None, rate)
    (400000, 0.00),
    (800000, 0.05),
    (1200000, 0.10),
    (1600000, 0.15),
    (2000000, 0.20),
    (2400000, 0.25),
    (None, 0.30),
]
IT_CESS_RATE = 0.04
IT_REBATE_87A_LIMIT = 1200000     # taxable income up to which rebate applies

# --- TDS on contractor payments (s.194C) ---------------------------------
TDS_194C_COMPANY = 0.02
TDS_194C_INDIVIDUAL = 0.01

# --- GST ------------------------------------------------------------------
GST_RATE_AUTO_COMPONENTS = 0.18
STATE_CODE_TELANGANA = "36"


def professional_tax(monthly_gross):
    """Telangana PT is a slab on monthly gross wages, not a percentage."""
    for lower, upper, tax in PT_SLABS_TELANGANA:
        if monthly_gross >= lower and (upper is None or monthly_gross <= upper):
            return tax
    return 0


def income_tax_on(annual_taxable):
    """Slab tax plus cess, with the 87A rebate applied below the limit."""
    if annual_taxable <= IT_REBATE_87A_LIMIT:
        return 0
    tax, previous_bound = 0.0, 0
    for bound, rate in IT_SLABS:
        if bound is None:
            tax += max(0, annual_taxable - previous_bound) * rate
            break
        if annual_taxable > previous_bound:
            tax += (min(annual_taxable, bound) - previous_bound) * rate
        previous_bound = bound
    return round(tax * (1 + IT_CESS_RATE))
