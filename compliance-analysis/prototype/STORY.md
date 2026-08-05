# One origin point, nine filings — a working demonstration

Run it: `cd prototype && python3 engine.py`

## The story

**Shreyas Precision Components Private Limited** machines auto components at
Plot 47, IDA Jeedimetla, Hyderabad. It is a mid-size manufacturer: 180 people on
the rolls, roughly ₹19 crore of annual turnover, selling to OEMs in Telangana,
Tamil Nadu, Maharashtra and Karnataka. It engages two labour contractors for
housekeeping and material handling.

It is registered under GST in Telangana, holds PAN and TAN, is covered by EPF and
ESI, deducts Telangana professional tax and labour welfare fund, files TDS
returns on salary and on contractor payments, and files annual returns under the
labour codes.

**April 2026.** In today's world, its accountant will over the following weeks
key the establishment's name into nine different portals, retype the same
address five times, recompute wages four different ways in four different
spreadsheets, and copy challan numbers across five filings. Roughly a week of
work, most of it transcription, all of it a fresh opportunity to make an error
that reconciles nowhere.

In this prototype, the accountant does none of that. They run payroll and post
their invoices — which they already do — and the nine filings generate
themselves.

## What the entity actually captures — once

| Store | Records | What it is |
|---|---|---|
| Entity master | 18 fields | Registrations, address, signatory. Filled at incorporation. |
| Payroll subledger | 180 lines | One line per employee per month — the atoms. |
| Sales register | 42 invoices | Already captured for invoicing and e-invoicing. |
| Purchase register | 28 bills | Already captured for payables. |
| Remittance log | 5 challans | TRRN/UTR from the banking leg. |
| **Summary journal** | **3 entries** | Posted *from* the subledgers. |

**273 atom records.** Nothing is entered for the purpose of compliance. Every
record already exists because the business runs on it.

## The critical detail: the journal entry is lossy

The payroll posting reads:

```
Dr  Salaries and Wages              63,15,548
Dr  Employer PF Contribution         3,03,290
Dr  Employer ESI Contribution           19,858
    Cr  Salaries Payable                      59,23,289
    Cr  PF Payable                             6,06,580
    Cr  ESI Payable                              24,444
    Cr  Professional Tax Payable                 34,700
    Cr  TDS Payable - Salary                     49,683
                                    ─────────────────
                          Dr 66,38,696 = Cr 66,38,696
```

That entry **cannot** regenerate 180 employees, their UANs, their days worked, or
their gender. It aggregated all of it away. This is precisely why "accounting
entries as the origin point" fails if *entries* means posted summaries.

Every journal entry therefore carries a `subledger_ref` back to the atoms it
summarises. **The origin point is the books in the wide sense — ledger plus
subledgers at atomic granularity — not the general ledger.**

## The heart of it: one payroll, four legal definitions of "wages"

This is the single most important thing the prototype demonstrates.

| Element | April 2026 | Scope predicate |
|---|---|---|
| `GROSS_WAGES` | ₹63,15,548 | all components, no ceiling |
| `EPF_WAGES` | ₹25,27,355 | `min(basic + da, 15000)` where EPF member |
| `ESI_WAGES` | ₹6,11,150 | `gross` where `gross ≤ 21000` |
| `TAXABLE_SALARY` | ₹6,22,86,576 | annual projection less standard deduction |

Four numbers. One payroll register. **None interchangeable.**

Note also the temporal mismatch: `TAXABLE_SALARY` is an *annual* projection while
the others are *monthly*. A dictionary that records only "wages, money, INR"
would silently permit comparing them. Recording `temporal_type` is what stops it.

Headcount behaves identically — one person list, four `WHERE` clauses:

| Element | Count | Predicate |
|---|---|---|
| `HEADCOUNT_TOTAL` | 180 | all on rolls |
| `HEADCOUNT_EPF_MEMBERS` | 180 | `epf_member = true` |
| `HEADCOUNT_ESI_COVERED` | 32 | `gross ≤ 21000` |
| `HEADCOUNT_HAZARDOUS` | 55 | `hazardous_process = true` |

**This is the answer to "how do you harmonise definitions that legally differ?"
You don't. You keep one atom store and give each statute its own predicate.**

## The nine filings, generated

| Filing | Authority | Domain | Fields |
|---|---|---|---|
| GSTR-1 | GSTN | GST | 10 |
| GSTR-3B | GSTN | GST | 11 |
| EPF ECR | EPFO | Labour | 13 |
| ESI Contribution | ESIC | Labour | 11 |
| PT Return (TG) | Telangana CTD | Labour | 9 |
| Form 24Q | Income Tax | Income Tax | 10 |
| Form 26Q | Income Tax | Income Tax | 8 |
| OSH Annual Return | Labour Dept | Labour | 13 |
| ITR / Tax Audit schedule | Income Tax | Income Tax | 9 |

**94 field values emitted from 49 distinct elements — R = 47.9%.** Every one
derived, zero keyed. `EST_NAME`, `RETURN_PERIOD` and `AUTHORISED_PERSON` are each
bound by all nine filings from a single stored value.

## Every filed number is auditable

```
EPF-ECR / EPF_EE_CONTRIB
  filed value  : INR 303,290
  derived from : 180 payroll lines
  rule         : sum(epf_employee) where epf_member

    SPC1000  basic+da  14,258  -> epf_wages 14,258  -> ee 1,711
    SPC1001  basic+da  15,419  -> epf_wages 15,000  -> ee 1,800   <- ceiling bites
    SPC1002  basic+da  12,115  -> epf_wages 12,115  -> ee 1,454
```

An inspector walks any filed figure back to named individuals. Formulae chained
between forms cannot do this; aggregation over tagged atoms can.

## The architecture

```
  entity master ─┐
  payroll ───────┤
  sales ─────────┼─→ [ dictionary: 49 elements ]─→[ form specs ]─→ 9 filings
  purchases ─────┤     definitions, units,          declarative
  remittances ───┘     temporal types, predicates    bindings
```

Adding a tenth filing means adding a **spec entry**, not writing code. That is
the property that makes this scale to 89 labour forms and beyond.

Two cross-domain dependencies are live in the run and worth noting:

- `S43B_PAID_STATUS` — an **income tax** element resolved entirely from **labour**
  remittance atoms. Whether PF/ESI dues were actually paid determines their
  deductibility.
- `CONTRACTOR_LIST` — one purchase register serving both the **26Q** TDS return
  and the **OSH** annual return.

## Viability verdict

**Technically viable — demonstrated here end to end.** The data modelling is not
the hard part, and nothing in this run required a technology that does not exist.

**What is genuinely hard, in order:**

1. **Payroll digitisation.** The prototype assumes a payroll subledger exists at
   employee-per-month granularity. In much of the Indian SME base it is a
   spreadsheet or a notebook. This gates the largest block of value and is an
   adoption problem, not an architecture problem.
2. **Identifier fragmentation.** This entity holds PAN, TAN, GSTIN, CIN, LIN, EPF
   code, ESIC code, PT and LWF registrations — nine identities for one business.
   Until they resolve to a spine, the entity master stays a retyping exercise.
3. **Book-to-tax bridge.** GST and labour are aggregations. Income tax is a legal
   *transformation* — depreciation under the IT Act, s.43B timing, s.40
   disallowances, 3CD certification. The prototype only gestures at this
   (`S43B_PAID_STATUS`); a real build needs a rules engine and professional
   sign-off inside the loop.
4. **State variation.** PT and LWF are state subjects; labour is Concurrent.
   Jurisdiction must be a first-class dimension from day one.
5. **Definitional adjudication.** The four wage bases here are the *known* cases.
   Across 89 labour forms there will be more, and each needs a lawyer's sign-off
   before it can be bound.

**What this prototype does not prove:** that the statutory parameters are current
(they are illustrative — see `statutes.py`), that real portal schemas accept
these structures, that authorities would accept derived filings without
re-keying, or that the residual event-driven filings (accidents, strikes, court
matters — 34 elements in the labour analysis) can be automated at all. They
cannot, and they should stay as forms.

## Files

| File | Purpose |
|---|---|
| `statutes.py` | Statutory rates, ceilings, slabs. Illustrative — verify before use. |
| `books.py` | Entity master and four subledgers, generated deterministically. |
| `dictionary.json` | 49 elements with definitions, units, temporal types, predicates. |
| `engine.py` | Resolvers, form specs, generation, provenance. |
| `out/*.json` | The nine generated filings. |
