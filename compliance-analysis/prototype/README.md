# Prototype: straight-through filing from the books

A runnable demonstration that nine statutory filings across GST, Income Tax and
labour can be generated from one set of accounting records, with no re-keying.

```bash
cd compliance-analysis/prototype
python3 engine.py          # stdlib only, no dependencies
```

Read `STORY.md` for the narrative, the numbers and the viability verdict.

Statutory rates in `statutes.py` are ILLUSTRATIVE and must be verified against
current notifications before any real use.
