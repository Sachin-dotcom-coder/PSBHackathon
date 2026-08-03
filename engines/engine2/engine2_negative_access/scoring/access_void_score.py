"""
access_void_score.py — Step 10 of new_instruct.md

Converts raw Isolation Forest decision_function() scores into the
human-readable Access Void Score (0-100).

Raw IF score convention:
  - More negative  →  more anomalous  →  higher void score
  - Closer to 0    →  more normal     →  lower void score
"""
import numpy as np


# ── Risk Level Thresholds (from new_instruct.md) ──────────────────────────
RISK_THRESHOLDS = [
    (20,  "Normal"),
    (40,  "Low"),
    (60,  "Medium"),
    (80,  "High"),
    (100, "Critical"),
]


def raw_to_access_void(raw_scores):
    """
    Normalize Isolation Forest decision_function scores to [0, 100].

    Algorithm:
      1. Invert sign (more negative = higher anomaly)
      2. Min-max scale to [0, 100]
      3. Round to 1 decimal place

    Parameters
    ----------
    raw_scores : array-like of floats (IF decision_function output)

    Returns
    -------
    np.ndarray of float, shape same as raw_scores, range [0.0, 100.0]
    """
    scores = np.array(raw_scores, dtype=float)
    inverted = -scores          # flip so anomalies → high values

    min_v = inverted.min()
    max_v = inverted.max()

    if max_v == min_v:
        # Degenerate case: all same score → assign 50 (unknown)
        return np.full_like(scores, 50.0)

    normalized = (inverted - min_v) / (max_v - min_v) * 100.0
    return np.round(normalized, 1)


def get_risk_level(score: float) -> str:
    """
    Map a 0-100 Access Void Score to a risk category.

    Thresholds (from new_instruct.md):
      0-20   Normal
      21-40  Low
      41-60  Medium
      61-80  High
      81-100 Critical
    """
    for threshold, level in RISK_THRESHOLDS:
        if score <= threshold:
            return level
    return "Critical"


def score_to_badge(score: float) -> str:
    """Return coloured ANSI badge string for terminal display."""
    level = get_risk_level(score)
    colors = {
        "Normal":   "\033[92m",   # green
        "Low":      "\033[96m",   # cyan
        "Medium":   "\033[93m",   # yellow
        "High":     "\033[91m",   # red
        "Critical": "\033[95m",   # magenta
    }
    reset = "\033[0m"
    c = colors.get(level, "")
    return f"{c}{level}{reset}"
