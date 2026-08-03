#!/usr/bin/env python3
"""
Redundancy analysis over the labour-compliance element/form matrix.

Input : Master_Labour_Forms_Element_Repetition.xlsx
Output: metrics printed to stdout + derived CSVs alongside this script.

Definitions used throughout:
  D  distinct data elements                      (registry rows)
  N  total asks = sum over elements of k         (form x element incidence cells)
  k  occurrences of an element across filings
  b  breadth: how many instruments ask the element (max 8)
  R  redundancy ratio = 1 - D/N
"""

import csv
import os
from collections import Counter

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(HERE, "Master_Labour_Forms_Element_Repetition.xlsx")

# Element_Repetition column layout
COL_CODE, COL_DESC = 0, 1
INSTRUMENT_COLS = range(2, 10)   # SS, OSH, IR, EPF, TDS, ESI, PT, LWF
COL_TOTAL, COL_PROVENANCE = 11, 12


def as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def load():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    sheet = wb["Element_Repetition"]
    rows = list(sheet.iter_rows(values_only=True))
    header = rows[0]
    elements = []
    for row in rows[1:]:
        if not row[COL_CODE]:
            continue
        counts = [as_int(row[i]) for i in INSTRUMENT_COLS]
        elements.append(
            {
                "code": row[COL_CODE],
                "description": row[COL_DESC],
                "counts": counts,
                "k": as_int(row[COL_TOTAL]),
                "breadth": sum(1 for c in counts if c > 0),
                # redundancy split: repeats inside one instrument vs across instruments
                "within": sum(c - 1 for c in counts if c > 0),
                "cross": sum(1 for c in counts if c > 0) - 1,
                "provenance": row[COL_PROVENANCE],
            }
        )
    return header, elements, wb


def reconcile(elements):
    """The extract is only trustworthy if the instrument columns sum to TOTAL."""
    bad = [e["code"] for e in elements if sum(e["counts"]) != e["k"]]
    return bad


def coverage_curve(elements):
    """Prefilling the top-n elements removes (asks they cover - n) asks."""
    ordered = sorted(elements, key=lambda e: -e["k"])
    curve, covered = [], 0
    for n, element in enumerate(ordered, 1):
        covered += element["k"]
        curve.append({"n": n, "code": element["code"], "covered": covered,
                      "eliminated": covered - n})
    return curve


def main():
    header, elements, _ = load()

    bad = reconcile(elements)
    D = len(elements)
    N = sum(e["k"] for e in elements)
    redundant = N - D

    print(f"reconciliation mismatches : {len(bad)} {bad if bad else ''}")
    print(f"D (distinct elements)     : {D}")
    print(f"N (total asks)            : {N}")
    print(f"redundant asks (N-D)      : {redundant}")
    print(f"R = 1 - D/N               : {1 - D / N:.4f}")
    print(f"mean k                    : {N / D:.2f}")

    print("\nk-distribution")
    dist = Counter(e["k"] for e in elements)
    for k in sorted(dist, reverse=True):
        print(f"  k={k:<3} elements={dist[k]:<4} asks={k * dist[k]}")

    print("\nredundancy decomposition")
    within = sum(e["within"] for e in elements)
    cross = sum(e["cross"] for e in elements)
    print(f"  within-instrument : {within:<4} ({100 * within / redundant:.1f}% of redundancy)")
    print(f"  cross-instrument  : {cross:<4} ({100 * cross / redundant:.1f}% of redundancy)")

    print("\ncoverage curve")
    curve = coverage_curve(elements)
    for n in (6, 10, 15, 20, 26, 41, 68, 120):
        point = curve[n - 1]
        print(f"  top-{n:<4} covers {point['covered']:<4} asks, "
              f"eliminates {point['eliminated']:<4} "
              f"({100 * point['eliminated'] / redundant:.1f}% of achievable)")

    gov = [e for e in elements if e["provenance"]]
    print(f"\nalready held by government: {len(gov)} elements, "
          f"{sum(e['k'] for e in gov)} asks "
          f"({100 * sum(e['k'] for e in gov) / N:.1f}% of N)")

    # derived CSVs
    with open(os.path.join(HERE, "elements_ranked.csv"), "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["rank", "code", "k", "breadth", "within", "cross",
                         "provenance", "description"])
        for rank, e in enumerate(sorted(elements, key=lambda x: -x["k"]), 1):
            writer.writerow([rank, e["code"], e["k"], e["breadth"], e["within"],
                             e["cross"], e["provenance"] or "", e["description"] or ""])

    with open(os.path.join(HERE, "coverage_curve.csv"), "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["n", "element_added", "asks_covered", "asks_eliminated",
                         "pct_of_achievable"])
        for point in curve:
            writer.writerow([point["n"], point["code"], point["covered"],
                             point["eliminated"],
                             round(100 * point["eliminated"] / redundant, 1)])

    print("\nwrote elements_ranked.csv and coverage_curve.csv")


if __name__ == "__main__":
    main()
