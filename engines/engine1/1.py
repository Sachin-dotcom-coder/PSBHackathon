"""
PHANTOM – Engine 1: Temporal Causal Chain Scorer
=================================================
Detects pre-exfiltration sequence anomalies in daily access logs.

Target pattern: LOOKUP -> BALANCE_CHECK -> TRANSACTION_HISTORY -> REPORT_EXPORT

Score range: 0-100
  - Complete exact pattern   → ~85-100
  - Near-complete / reordered → 30-70
  - Benign / fragmented logs  → < 25

Integrated with PSB Hackathon data pipeline (d.py):
Now supports mapping 'Customer Search', 'Cash Operations', etc. directly.
"""

import argparse
import csv
import math
import os
from itertools import combinations
from typing import List

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TARGET_SEQUENCE = ["LOOKUP", "BALANCE_CHECK", "TRANSACTION_HISTORY", "REPORT_EXPORT"]

# Alias normalisation map (accepts common log variants and PSB Hackathon module names)
ALIAS_MAP = {
    # Original E1 mappings
    "HISTORY": "TRANSACTION_HISTORY",
    "TRANSACTION_HIST": "TRANSACTION_HISTORY",
    "BALANCE": "BALANCE_CHECK",
    "BAL_CHECK": "BALANCE_CHECK",
    "EXPORT": "REPORT_EXPORT",
    "RPT_EXPORT": "REPORT_EXPORT",
    "REPORT": "REPORT_EXPORT",
    "LOOKUP": "LOOKUP",
    "ACCT_LOOKUP": "LOOKUP",
    
    # ── New mappings for PSB Hackathon (from d.py) ──
    "CUSTOMER SEARCH": "LOOKUP",
    "CASH OPERATIONS": "BALANCE_CHECK",
    "TRANSACTION HISTORY": "TRANSACTION_HISTORY",
    "REPORTS": "REPORT_EXPORT",
    "AUDIT REPORTS": "REPORT_EXPORT"
}

# N-gram order weights: longer matching n-grams carry more weight
NGRAM_WEIGHTS = {4: 1.0, 3: 0.7, 2: 0.4, 1: 0.15}

# Penalty applied when the correct items appear but out of order
ORDER_PENALTY = 0.5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise(actions: List[str]) -> List[str]:
    """Normalise action names via alias map; unknowns are kept as-is."""
    return [ALIAS_MAP.get(a.strip().upper(), a.strip().upper()) for a in actions]


def _ngrams(sequence: List[str], n: int) -> List[tuple]:
    return [tuple(sequence[i: i + n]) for i in range(len(sequence) - n + 1)]


def _longest_common_subsequence(a: List[str], b: List[str]) -> int:
    """Classic DP LCS length."""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


# ---------------------------------------------------------------------------
# Core scoring logic
# ---------------------------------------------------------------------------

def score_sequence(log_actions: List[str]) -> int:
    """
    Score a list of log action tokens for resemblance to the TARGET_SEQUENCE.

    Parameters
    ----------
    log_actions : list[str]
        Raw action tokens from the daily log.

    Returns
    -------
    int
        Risk score in the range [0, 100].
    """
    if not log_actions:
        return 0

    normed = _normalise(log_actions)
    target = TARGET_SEQUENCE
    T = len(target)

    # ── 1. N-gram overlap score ──────────────────────────────────────────────
    target_ngrams: dict[int, set] = {}
    log_ngrams: dict[int, list] = {}
    for n in NGRAM_WEIGHTS:
        target_ngrams[n] = set(_ngrams(target, n))
        log_ngrams[n] = _ngrams(normed, n)

    ngram_score = 0.0
    ngram_max = 0.0
    for n, weight in NGRAM_WEIGHTS.items():
        matches = sum(1 for ng in log_ngrams[n] if ng in target_ngrams[n])
        possible = len(target_ngrams[n])
        ngram_score += weight * (matches / possible if possible else 0)
        ngram_max += weight

    ngram_ratio = ngram_score / ngram_max  # 0-1

    # ── 2. LCS-based coverage score ─────────────────────────────────────────
    lcs_len = _longest_common_subsequence(normed, target)
    lcs_ratio = lcs_len / T  # 0-1

    # ── 3. Order penalty check ───────────────────────────────────────────────
    present_in_order = _is_subsequence(target, normed)
    order_bonus = 1.0 if present_in_order else ORDER_PENALTY

    # ── 4. Coverage bonus: how many distinct target tokens appear at all ─────
    normed_set = set(normed)
    coverage = sum(1 for t in target if t in normed_set) / T

    # ── 5. Combine ───────────────────────────────────────────────────────────
    raw = (
        0.40 * ngram_ratio
        + 0.30 * lcs_ratio
        + 0.20 * coverage
    ) * order_bonus

    scaled = raw * 100 * 0.95

    return int(min(100, max(0, round(scaled))))


def _is_subsequence(needle: List[str], haystack: List[str]) -> bool:
    """Return True if needle appears as an ordered subsequence inside haystack."""
    it = iter(haystack)
    return all(tok in it for tok in needle)


# ---------------------------------------------------------------------------
# Integration with PSB Hackathon Data
# ---------------------------------------------------------------------------

def score_from_psb_data(access_logs_csv_path: str, employee_id: str, date_str: str) -> int:
    """
    Reads the PSB Hackathon access_logs.csv mapping module names 
    as sequence actions for Engine 1.
    """
    if not os.path.exists(access_logs_csv_path):
        return 0
        
    actions = []
    with open(access_logs_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['employee_id'] == employee_id and row['timestamp'].startswith(date_str):
                actions.append(row['module'].upper())
    
    return score_sequence(actions)


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def _parse_args():
    parser = argparse.ArgumentParser(
        description="PHANTOM Engine 1 – Temporal Causal Chain Scorer"
    )
    parser.add_argument(
        "--logs",
        default="",
        help='Comma-separated list of log actions, e.g. "LOOKUP,BALANCE_CHECK,HISTORY,EXPORT"',
    )
    parser.add_argument(
        "--psb_data",
        default="",
        help="Path to access_logs.csv from PSB Data folder",
    )
    parser.add_argument(
        "--emp",
        default="EMP001",
        help="Employee ID for PSB Data",
    )
    parser.add_argument(
        "--date",
        default="2026-01-01",
        help="Date string for PSB Data (YYYY-MM-DD)",
    )
    return parser.parse_args()


def main():
    args = _parse_args()
    if args.psb_data:
        score = score_from_psb_data(args.psb_data, args.emp, args.date)
        print(f"Employee  : {args.emp} on {args.date}")
        print(f"Chain Score (PSB Data): {score}/100")
    elif args.logs:
        actions = [a.strip() for a in args.logs.split(",") if a.strip()]
        score = score_sequence(actions)
        print(f"Actions   : {actions}")
        print(f"Chain Score: {score}/100")
    else:
        print("Please provide --logs or --psb_data. See --help for more info.")


if __name__ == "__main__":
    main()
