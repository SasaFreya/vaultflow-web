#!/usr/bin/env python3
"""VaultFlow A/B test analyzer — proportion z-test + SRM check.

Usage:
  python3 scripts/ab_analyze.py docs/experiments/exp-01.csv

CSV columns: user_id, cohort, activated_7d (0/1), [import_success], [crashed]
"""

from __future__ import annotations

import csv
import math
import sys
from statistics import NormalDist

ND = NormalDist()


def proportion_z_test(success_a: int, n_a: int, success_b: int, n_b: int) -> dict:
    p_a = success_a / n_a if n_a else 0
    p_b = success_b / n_b if n_b else 0
    p_pool = (success_a + success_b) / (n_a + n_b) if (n_a + n_b) else 0
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / n_a + 1 / n_b)) if n_a and n_b else 0
    diff = p_b - p_a
    z = diff / se if se else 0
    p_value = 2 * (1 - ND.cdf(abs(z)))
    ci = ND.inv_cdf(0.975) * se
    lift = (diff / p_a * 100) if p_a else 0
    return {
        "control_rate": p_a,
        "variant_rate": p_b,
        "lift_pct": lift,
        "diff": diff,
        "ci_low": diff - ci,
        "ci_high": diff + ci,
        "z": z,
        "p_value": p_value,
        "significant": p_value < 0.05,
    }


def srm_check(n_control: int, n_variant: int, expected: float = 0.5) -> dict:
    total = n_control + n_variant
    exp = total * expected
    chi2 = ((n_control - exp) ** 2 / exp) + ((n_variant - exp) ** 2 / exp) if exp else 0
  # df=1, critical 6.635 @ 0.01
    return {"chi2": chi2, "srm_detected": chi2 > 6.635}


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
    control = [r for r in rows if r["cohort"].lower() in ("control", "a", "0")]
    variant = [r for r in rows if r["cohort"].lower() in ("variant", "b", "1")]

    n_c, n_v = len(control), len(variant)
    act_c = sum(1 for r in control if r.get("activated_7d", "0") in ("1", "true", "True"))
    act_v = sum(1 for r in variant if r.get("activated_7d", "0") in ("1", "true", "True"))

    print("## A/B Test Results\n")
    print(f"**Sample**: {n_c} control / {n_v} variant\n")

    srm = srm_check(n_c, n_v)
    print(f"**SRM check**: χ²={srm['chi2']:.2f} — {'⚠️ SRM detected, invalidate results' if srm['srm_detected'] else 'OK'}\n")

    result = proportion_z_test(act_c, n_c, act_v, n_v)
    print("| Metric | Control | Variant | Lift | p-value | Significant? |")
    print("|--------|---------|---------|------|---------|--------------|")
    print(
        f"| 7d activation | {result['control_rate']*100:.1f}% | {result['variant_rate']*100:.1f}% "
        f"| {result['lift_pct']:+.1f}% | {result['p_value']:.4f} | {'Yes' if result['significant'] else 'No'} |"
    )
    print(f"\n95% CI for diff: [{result['ci_low']*100:+.1f}pp, {result['ci_high']*100:+.1f}pp]")

    if srm["srm_detected"]:
        print("\n**Recommendation**: Investigate — fix randomization before interpreting.")
    elif result["significant"] and result["lift_pct"] > 0:
        print("\n**Recommendation**: Ship — roll out variant to 100%.")
    elif result["lift_pct"] > 0:
        print("\n**Recommendation**: Extend the test — positive trend, need more data.")
    else:
        print("\n**Recommendation**: Stop or investigate — no meaningful positive lift.")


if __name__ == "__main__":
    main()
