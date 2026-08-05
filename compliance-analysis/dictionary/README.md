# Executable definition dictionary

```bash
python3 classify.py
```

`terms.json` encodes the four apex terms (employee, employer, establishment,
wages) plus worker and factory across 8 instruments — the four labour codes,
three Telangana acts, and the IT Act's TDS machinery.

`classify.py` runs one record through every instrument's definition and returns
a verdict per instrument, with the reason.

**Nothing is harmonised.** One record, N predicates, divergence stays visible.

Source analysis: `Labour_Codes_Definitions_Full_Comparative.xlsx` and
`Big4_Feature_Matrix.xlsx`. The machine predicates are an encoding of that legal
analysis and need review before operational use.
