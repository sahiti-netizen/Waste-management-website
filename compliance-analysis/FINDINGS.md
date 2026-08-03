# Labour compliance — data element redundancy analysis

Source: `Master_Labour_Forms_Element_Repetition.xlsx`
Reproduce with: `python3 analyse.py`

## Scope

89 forms across 8 instruments — SS Rules 2026 (31), OSH Rules 2026 (27),
IR Rules 2026 (15), EPF Scheme 2026 (10), TDS salary (2), ESI (2), PT (1), LWF (1).

**Known gap:** Code on Wages (Central) Rules 2026 not yet extracted. The
registers / wage-slip family it contains is expected to repeat elements that are
already high-frequency here (`WAGE_COMPONENTS`, `EMP_NAME`, `ATTENDANCE_DAYS`),
so every redundancy figure below should be read as a **floor**, not a ceiling.

## Headline

| Metric | Value |
|---|---|
| Distinct elements (D) | 120 |
| Total asks (N) | 376 |
| Redundant asks (N − D) | 256 |
| Redundancy ratio R = 1 − D/N | **68.1%** |
| Mean occurrences per element | 3.13 |
| Reconciliation mismatches | 0 |

Instrument columns sum exactly to the TOTAL column across all 120 rows — the
extract is internally consistent.

## The distribution is bimodal, not flat

| Band | Elements | Asks | Share of N |
|---|---|---|---|
| k ≥ 10 | 6 | 111 | 29.5% |
| k = 4–9 | 20 | 114 | 30.3% |
| k = 2–3 | 42 | 99 | 26.3% |
| k = 1 | 52 | 52 | 13.8% |

Six elements carry nearly 30% of all asks. At the other end, **52 of 120
elements (43%) appear exactly once** and contribute zero harmonisation value.

## Only 68 elements are harmonisable

The coverage curve saturates at n = 68 — the singletons cannot be reduced by
definition, so 256 eliminated asks is the hard ceiling.

| Prefill top-n | Asks eliminated | % of achievable | % of all asks |
|---|---|---|---|
| 6 | 105 | 41.0% | 27.9% |
| 10 | 133 | 52.0% | 35.4% |
| 15 | 162 | 63.3% | 43.1% |
| 20 | 181 | 70.7% | 48.1% |
| 26 | 199 | 77.7% | 52.9% |
| 41 | 229 | 89.5% | 60.9% |
| **68** | **256** | **100%** | **68.1%** |

**MVP boundary: 20 elements.** They deliver ~71% of everything achievable.
Past ~41 elements the marginal return per element added falls below 2 asks.

## Two-thirds of the duplication needs no inter-departmental coordination

| Redundancy type | Asks | Share |
|---|---|---|
| **Within-instrument** (same rule-set asks the same element repeatedly) | **173** | **67.6%** |
| Cross-instrument (different statutes ask the same element) | 83 | 32.4% |

This is the most actionable finding in the dataset. The dominant problem is not
that different laws disagree — it is that a *single* rule-set asks the same
element over and over across its own forms:

| Element | Instrument | Times asked within that one instrument |
|---|---|---|
| EST_NAME | SS Rules | 13 |
| EST_NAME | OSH Rules | 10 |
| LIN | OSH Rules | 8 |
| EST_NAME | EPF Scheme | 6 |
| EST_NAME | IR Rules | 5 |
| EMP_NAME | SS Rules | 6 |
| EMP_NAME | OSH Rules | 6 |
| EMPLOYER_NAME | OSH Rules | 6 |
| EST_ADDRESS | SS Rules | 6 |
| AUTHORISED_PERSON | SS Rules | 6 |

Each row is fixable by one ministry amending its own rules — no negotiation
with another department required.

## 31.6% of all asks are for data government already holds

Eight elements, tagged in the source as already held by government, account for
**119 of 376 asks**:

`EST_NAME` (37), `EMP_NAME` (19), `LIN` (15), `EST_ADDRESS` (14),
`EMPLOYER_NAME` (13), `PAN` (8), `UAN` (7), `EPF_CODE` (6)

These are once-only-fetch candidates: the correct fix is deletion from the form
plus API retrieval, not mapping.

## Frequency weighting changes the priority order

Form-count redundancy and annualised transmission volume rank differently. A
full-stack Telangana establishment transmits **574 element-values per year** on
calendar-recurring filings alone.

| Element | k (form count) | Annual transmissions |
|---|---|---|
| WAGE_COMPONENTS | 13 | **55** |
| PAYMENT_REFS | 4 | 41 |
| EMP_NAME | 19 | 40 |
| CONTRACTOR_LIST | 8 | 38 |
| EPF_CODE | 6 | 36 |
| EST_NAME | 37 | 35 |

`PAYMENT_REFS` is asked on only 4 forms but transmitted 41 times a year;
`EST_NAME` tops the form count but ranks 6th by volume. **Prioritise the build
by annual transmissions, not by k.** The top 10 elements by volume account for
60.5% of all annual transmissions.

## Cross-instrument coordination targets

Elements spanning 3+ instruments — where harmonisation requires agreement
between departments, and where Tier C definitional conflict is most likely:

`EST_NAME` (7 instruments), `EMP_NAME` (6), `WAGE_COMPONENTS` (6),
`EMP_DOJ` (5), `LIN` (4), `EST_ADDRESS` (4), `UAN` (4), `ATTENDANCE_DAYS` (4),
`HEADCOUNT_MATRIX` (4), `CONTRIBUTION_PAID` (4), `PAYMENT_REFS` (4)

`WAGE_COMPONENTS` and `ATTENDANCE_DAYS` are the highest-risk pair: both span
many instruments *and* carry statutory definitions that differ by Act.

## Data gaps to close

1. **Code on Wages Rules 2026** — not extracted. Will raise both D and N.
2. **8 elements missing from `Frequency_Weighted`** — `EMP_RELIGION`,
   `EMP_DEPT`, `EMP_SUPERANNUATION`, `MANAGER_DETAILS`, `SECTOR_BLOCK`,
   `FIN_STATEMENTS`, `PRODUCTION_DATA`, `GROUP_COMPANIES`. All are k=1, so the
   omission does not affect conclusions, but the sheet should reconcile to 120.
3. **No definitional adjudication yet.** Every figure here assumes elements
   sharing a code are semantically identical. Until the footnote/instruction
   text is compared across forms, 68.1% is an upper bound — the achievable
   figure is 68.1% minus whatever splits into legally distinct concepts.

## Recommended sequence

1. **Delete, don't map** — remove the 8 government-held elements from forms and
   fetch them (119 asks, 31.6% of N).
2. **Within-instrument dedup** — one ministry, one amendment cycle each
   (173 asks, 67.6% of the redundancy).
3. **Payroll-register-once** — derive `WAGE_COMPONENTS`, `ATTENDANCE_DAYS`,
   `CONTRIBUTION_*`, `TAX_DEDUCTED` from a single monthly submission
   (largest annualised volume block).
4. **Definitional adjudication** of the 22 cross-instrument elements before any
   shared registry is committed to.
5. **Cross-instrument harmonisation** — slowest, needs coordination
   (83 asks, 32.4%).
