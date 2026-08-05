"""
Executable definition dictionary.

Feeds one person / establishment / pay record through EVERY instrument's
definition and returns a verdict per instrument, with the reason.

This is the operational answer to "how do you define employee differently
across acts": you don't pick one. You keep one record and run N predicates
over it. The divergence stays visible instead of being averaged away.

Predicates encode the algebra in Definition_Algebra (Labour_Codes_Definitions_
Full_Comparative.xlsx). They are an ENCODING of that legal analysis and need
review by the analyst who wrote it before any operational use.

    python3 classify.py            # runs the worked cases
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# the supervisory wage dial - same clause, four settings
THETA = {"Wage Code": 15000, "IR Code": 18000, "OSH Code": 18000, "TG LWF": 1600}

CLOSED_WORK_LIST = {"skilled", "unskilled", "manual", "operational", "supervisory",
                    "managerial", "administrative", "technical", "clerical"}


# ---------------------------------------------------------------- employee ---

def employee_wage_code(p):
    """EMP_W = a  (the constant): c AND d AND E AND work in W."""
    if p["is_apprentice"]:
        return False, "apprentice excluded (common to all four codes)"
    if p["wages"] <= 0:
        return False, "fails c: not employed on wages"
    if not p["hire_or_reward"]:
        return False, "fails d: not for hire or reward"
    if p["work_nature"] not in CLOSED_WORK_LIST:
        return False, f"fails W: '{p['work_nature']}' outside the closed work list"
    if p["engagement_route"] != "direct":
        return False, "no f limb: engaged through a contractor, so not an employee OF THIS establishment"
    return True, "a satisfied: on wages, for hire or reward, work within the closed list"


def employee_ir_code(p):
    """EMP_IR = a - c - E + b: no wages hook, scope swapped to industrial establishment."""
    if p["is_apprentice"]:
        return False, "apprentice excluded"
    if not p["hire_or_reward"]:
        return False, "fails d"
    if p["work_nature"] not in CLOSED_WORK_LIST:
        return False, "fails W"
    if not p["industrial_establishment"]:
        return False, "fails b: premises is not an industrial establishment"
    if p["engagement_route"] != "direct":
        return False, "no f limb: engaged through a contractor"
    return True, "a - c - E + b: wages hook absent, industrial-establishment premises"


def employee_osh_code(p):
    """EMP_OSH = a - d + e + g: hire-or-reward dropped, open list, mines proviso."""
    if p["is_apprentice"]:
        return False, "apprentice excluded"
    if p["sector"] == "mine" and p["working_in_mine"]:
        return True, "g: mines proviso - employee whether for wages or not"
    if p["wages"] <= 0:
        return False, "fails c (and not covered by the mines proviso)"
    if p["engagement_route"] != "direct":
        return False, "no f limb: engaged through a contractor"
    return True, "a - d + e + g: hire-or-reward not required, open work list"


def employee_ss_code(p):
    """EMP_SS = a - d + e + f: contractor route included."""
    if p["is_apprentice"]:
        return False, "apprentice excluded"
    if p["wages"] <= 0:
        return False, "fails c"
    if p["engagement_route"] not in ("direct", "contractor"):
        return False, "fails f: engagement route outside {direct, contractor}"
    route = "through a contractor" if p["engagement_route"] == "contractor" else "directly"
    return True, f"a - d + e + f: engaged {route}"


def ss_member(p, ceiling=21000):
    """SS_member = EMP_SS x h - the ceiling-gated PF/ESI membership set."""
    covered, reason = employee_ss_code(p)
    if not covered:
        return False, reason
    if p["wages"] > ceiling:
        return False, f"h: wages {p['wages']:,} exceed the notified ceiling {ceiling:,}"
    return True, f"h satisfied: within the {ceiling:,} ceiling"


def ss_counted(p):
    """SS_counted = EMP_SS (i disables h) - the threshold-counting set."""
    covered, reason = employee_ss_code(p)
    if not covered:
        return False, reason
    return True, "i: counts for coverage thresholds regardless of the ceiling"


def employee_tg_pt(p):
    """EMP_PT(TG): salary-only test, minus casual wage earners."""
    if p["is_casual_wage_earner"]:
        return False, "casual wage earner excluded via s.2(j)"
    if p["wages"] <= 0:
        return False, "no salary or wages"
    return True, "s.2(e) residual limb: any person engaged in employment of an employer"


def employee_tg_lwf(p):
    """EMP_LWF(TG): the worker-machine at theta = 1,600, plus the 30-day box."""
    if p["is_apprentice"]:
        return False, "apprentice excluded (via certified standing orders)"
    if p["part_time"]:
        return False, "employed on a PART-TIME basis - expressly excluded"
    if not p["hire_or_reward"] or p["wages"] <= 0:
        return False, "LWF KEEPS hire-or-reward (like the constant a, unlike SS/OSH)"
    if p["engagement_route"] != "direct":
        return False, "TG LWF has NO contractor limb - contract staff outside the fund"
    if p["work_nature"] in ("managerial", "administrative", "operational"):
        return False, f"'{p['work_nature']}' capacity outside the 6-item list"
    if p["work_nature"] == "supervisory" and p["wages"] > THETA["TG LWF"]:
        return False, (f"supervisory drawing {p['wages']:,} > theta 1,600 "
                       "[THETA FOSSILISED - excludes every supervisor in the state]")
    if p["days_employed_in_12_months"] < 30:
        return False, "fewer than 30 days in the preceding 12 months"
    return True, "within the 6-item work list, under theta, 30-day box met"


def employee_ts_se(p):
    """EMP_SE(TG): apprentice INCLUDED - unique in the stack."""
    if p["sector"] in ("mine", "factory"):
        return False, "S&E applies to shops and commercial establishments, not this sector"
    if p["live_in_dependent_kin_unpaid"]:
        return False, "employer's live-in dependent kin without wages - excluded"
    if p["is_apprentice"]:
        return True, "apprentice INCLUDED - the opposite of every other instrument"
    return True, "wholly or principally employed in connection with the establishment"


def employee_tds(p):
    """EMP_TDS: common-law relation x s.17 salary. The widest net is the undefined one."""
    if p["engagement_route"] == "contractor":
        return False, "genuine contractor - outside the salary net (194C instead)"
    if p["wages"] <= 0:
        return False, "no salary"
    return True, "common-law employment relation + s.17 salary"


EMPLOYEE_TESTS = [
    ("Wage Code s.2(k)", employee_wage_code),
    ("IR Code s.2(l)", employee_ir_code),
    ("OSH Code s.2(t)", employee_osh_code),
    ("SS Code s.2(26)", employee_ss_code),
    ("  -> SS member (h)", ss_member),
    ("  -> SS counted (i)", ss_counted),
    ("TG PT s.2(e)", employee_tg_pt),
    ("TG LWF s.2(2)", employee_tg_lwf),
    ("TS S&E s.2(8)", employee_ts_se),
    ("IT Act TDS", employee_tds),
]


# ------------------------------------------------------------------ worker ---

def worker(p, theta, scope_ok):
    """w(theta, scope) - one formula, one constant differs."""
    if p["is_apprentice"]:
        return False, "apprentice excluded"
    if not scope_ok:
        return False, "outside the required scope"
    if p["work_nature"] in ("managerial", "administrative"):
        return False, f"'{p['work_nature']}' capacity excluded"
    if p["work_nature"] == "supervisory" and p["wages"] > theta:
        return False, f"supervisory drawing {p['wages']:,} > theta {theta:,}"
    return True, f"within scope, theta {theta:,} not breached"


WORKER_TESTS = [
    ("Wage Code s.2(z)  w(15000, industry)",
     lambda p: worker(p, 15000, p["in_industry"])),
    ("IR Code s.2(zr)   w(18000, industry)",
     lambda p: worker(p, 18000, p["in_industry"])),
    ("OSH Code s.2(zzl) w(18000, establishment)",
     lambda p: worker(p, 18000, True)),
    ("TG LWF s.2(2)     w(1600, establishment)",
     lambda p: worker(p, 1600, True)),
]


# --------------------------------------------------------------- employer ---

def employer_verdicts(candidate):
    """Relational (who engages) vs functional (who disburses) - two concepts."""
    out = []
    relational = candidate["employs_directly_or_through"]
    functional = candidate["responsible_for_disbursement"]
    for name in ("Wage Code s.2(l)", "SS Code s.2(27)", "OSH Code s.2(u)", "TS S&E s.2(9)"):
        out.append((name, relational, "relational: employs one or more employees"
                    if relational else "does not engage anyone"))
    out.append(("IR Code s.2(m)", relational or candidate["employs_workers"],
                "relational + 'employee or worker'"))
    out.append(("TG LWF s.2(3)", relational,
                "relational; factory limb DANGLES on Factories Act 1948"))
    out.append(("TG PT s.2(f)", functional,
                "FUNCTIONAL: responsible for disbursement of salary"
                if functional else "does not disburse salary"))
    out.append(("IT Act (deductor)", functional,
                "FUNCTIONAL: person paying salary"))
    return out


# ---------------------------------------------------------- establishment ---

def establishment_verdicts(est):
    """EST_W = s ; EST_SS = s+s1+s2 ; EST_OSH = (s+s1) x s3 + s4 ; EST_IR = b."""
    out = []
    place = est["place_of_activity"]
    out.append(("Wage Code s.2(m)", place, "s: a place, no headcount test"))
    out.append(("SS Code s.2(29)", place,
                f"s+s1+s2: branch MERGER - {est['branches']} branches = ONE establishment"))
    osh_ok = place and (est["worker_count"] >= 10 or est["hazardous_notified"])
    out.append(("OSH Code s.2(v)", osh_ok,
                f"(s+s1) x s3: {est['worker_count']} workers "
                + ("meets" if osh_ok else "below") + " the 10 built into the definition"
                + (" [hazardous override -> 0]" if est["hazardous_notified"] else "")))
    out.append(("IR Code s.2(r)", est["industrial_establishment"],
                "b: industrial establishment or undertaking, own deeming"))
    out.append(("TG PT s.2(j) Expl.", place,
                f"branch SPLIT: {est['branches']} branches = {est['branches']} separate PERSONS"
                " - directly opposite to SS"))
    return out


def factory_verdicts(est):
    """Threshold, counting-set and process-enum all differ."""
    if not est["manufacturing"]:
        return [("SS Code s.2(32)", False, "not manufacturing"),
                ("OSH Code s.2(w)", False, "not manufacturing")]
    ss_threshold = 10 if est["power_aided"] else 20
    osh_threshold = 20 if est["power_aided"] else 40
    ss_ok = est["employee_count"] >= ss_threshold and est["kind"] not in ("mine", "hotel")
    osh_ok = est["worker_count"] >= osh_threshold
    return [
        ("SS Code s.2(32)", ss_ok,
         f"counts EMPLOYEES: {est['employee_count']} vs threshold {ss_threshold}"),
        ("OSH Code s.2(w)", osh_ok,
         f"counts WORKERS: {est['worker_count']} vs threshold {osh_threshold}"),
    ]


# ------------------------------------------------------------------- wages ---

WAGE_MATRIX_ORDER = ["Codes", "TG PT", "TG LWF", "TS S&E"]


def wage_bases(components):
    """Same pay slip, four statutory wage bases."""
    def total(rule):
        return sum(v for k, v in components.items() if rule(k))

    codes = total(lambda k: k in ("basic", "dearness_allowance", "retaining_allowance"))
    pt = codes + components.get("perquisites_s17", 0) + components.get("house_accommodation", 0)
    lwf = codes + components.get("statutory_bonus", 0)
    se = codes + components.get("statutory_bonus", 0)   # HRA expressly out
    tds = sum(components.values())
    return {"Codes (wg)": codes, "TG PT s.2(m)": pt, "TG LWF s.2(12)": lwf,
            "TS S&E s.2(23)": se, "IT Act s.17": tds}


# ------------------------------------------------------------- worked cases ---

def person(**overrides):
    base = {"name": "", "wages": 0, "work_nature": "clerical", "hire_or_reward": True,
            "is_apprentice": False, "industrial_establishment": True, "in_industry": True,
            "sector": "manufacturing", "working_in_mine": False,
            "engagement_route": "direct", "part_time": False,
            "days_employed_in_12_months": 365, "is_casual_wage_earner": False,
            "live_in_dependent_kin_unpaid": False}
    base.update(overrides)
    return base


def show(title, verdicts):
    print(f"\n  {title}")
    for name, ok, reason in verdicts:
        print(f"    {'YES' if ok else 'no ':<4} {name:<38} {reason}")


def run_person(p, heading, tests=EMPLOYEE_TESTS):
    print("\n" + "=" * 78)
    print(heading)
    print("=" * 78)
    print(f"  {p['name']}  |  wages {p['wages']:,}  |  {p['work_nature']}  "
          f"|  route: {p['engagement_route']}")
    verdicts = []
    for name, test in tests:
        ok, reason = test(p)
        verdicts.append((name, ok, reason))
    show("EMPLOYEE under each instrument", verdicts)
    yes = sum(1 for _, ok, _ in verdicts if ok)
    print(f"\n    -> {yes} of {len(verdicts)} instruments say YES from ONE record")
    return verdicts


def main():
    with open(os.path.join(HERE, "terms.json")) as handle:
        dictionary = json.load(handle)
    print(f"Definition dictionary v{dictionary['version']} - "
          f"{len(dictionary['terms'])} terms, "
          f"{len(dictionary['dangling_pointer_ledger'])} dangling pointers")

    # ---- case 1: the Rs 16,500 Hyderabad supervisor -----------------------
    supervisor = person(name="R. Venkatesh, Supervisor", wages=16500,
                        work_nature="supervisory")
    run_person(supervisor, "CASE 1  The Rs 16,500 supervisor - one salary slip, five regimes")
    show("WORKER under each instrument",
         [(n, *t(supervisor)) for n, t in WORKER_TESTS])
    print("\n    the theta ladder: 1,600 (LWF) << 15,000 (Wage) < 18,000 (IR/OSH)")
    print("    same clause, three settings, 11x apart - one salary, opposite verdicts")

    # ---- case 2: contract labour -----------------------------------------
    contract = person(name="S. Ganesh, Housekeeping", wages=12000,
                      work_nature="unskilled", engagement_route="contractor")
    run_person(contract, "CASE 2  Contract labour - the 'f' limb")
    print("    only SS carries the contractor limb (f). That single limb is the")
    print("    entire reason the PF/ESI contractor machinery exists.")

    # ---- case 3: unpaid mine worker --------------------------------------
    miner = person(name="Unpaid mine worker", wages=0, work_nature="manual",
                   sector="mine", working_in_mine=True, hire_or_reward=False)
    run_person(miner, "CASE 3  Unpaid mine worker - the 'g' proviso")

    # ---- case 4: apprentice ----------------------------------------------
    apprentice = person(name="Trainee under Apprentices Act", wages=9000,
                        work_nature="skilled", is_apprentice=True)
    run_person(apprentice, "CASE 4  Apprentice - excluded everywhere except one")

    # ---- case 5: establishment shapes ------------------------------------
    print("\n" + "=" * 78)
    print("CASE 5  One premises, four establishment concepts")
    print("=" * 78)
    est = {"place_of_activity": True, "branches": 3, "worker_count": 15,
           "employee_count": 18, "industrial_establishment": True,
           "manufacturing": True, "power_aided": True, "hazardous_notified": False,
           "kind": "factory"}
    print(f"  3 branches | 18 employees | 15 workers | manufacturing with power")
    show("ESTABLISHMENT", establishment_verdicts(est))
    show("FACTORY", factory_verdicts(est))
    print("\n    the same premises is a factory for SS (ESI route) and NOT for OSH")
    print("    (no licence) - because the counting FUNCTION differs, not just the number")
    print("    branch topology is code-relative: 1 establishment for EPF, 3 persons for PT")

    # ---- case 6: employer, two concepts ----------------------------------
    print("\n" + "=" * 78)
    print("CASE 6  Employer - relational vs functional")
    print("=" * 78)
    paymaster = {"employs_directly_or_through": False, "employs_workers": False,
                 "responsible_for_disbursement": True}
    print("  A shared-services paymaster: disburses salary, engages nobody")
    show("EMPLOYER", employer_verdicts(paymaster))
    print("\n    the deduction duty and the engagement duty can attach to")
    print("    DIFFERENT persons - no single 'employer' field can hold both")

    # ---- case 7: wage bases ----------------------------------------------
    print("\n" + "=" * 78)
    print("CASE 7  One pay slip, five wage bases")
    print("=" * 78)
    slip = {"basic": 30000, "dearness_allowance": 5400, "retaining_allowance": 0,
            "house_rent_allowance": 12000, "overtime": 2200, "statutory_bonus": 3000,
            "conveyance": 1600, "house_accommodation": 4000, "perquisites_s17": 6000}
    print("  " + "  ".join(f"{k}={v:,}" for k, v in slip.items()))
    print()
    for name, value in wage_bases(slip).items():
        print(f"    {name:<20} INR {value:>8,}")
    print("\n    the four CODES agree (the one real harmonisation success).")
    print("    PT, LWF, S&E and TDS each diverge - and TG LWF's base points at")
    print("    the repealed Payment of Wages Act 1936.")

    print("\n" + "=" * 78)
    print("Every verdict above came from ONE record per subject.")
    print("Nothing was harmonised. The divergence is encoded and stays visible.")
    print("=" * 78)


if __name__ == "__main__":
    main()
