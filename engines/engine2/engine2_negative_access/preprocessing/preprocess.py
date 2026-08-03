"""
preprocess.py — Step 1-4 of new_instruct.md

Responsibilities:
  1. Load feature_matrix.csv
  2. Separate metadata (employee_id, date) from numerical features
  3. Validate: no NaN, no Inf, no impossible negatives, no duplicates
  4. Return clean (meta_df, X_df) ready for Isolation Forest
"""
import sys
import pathlib
import numpy as np
import pandas as pd

# Allow running standalone from any directory
_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import FEATURE_MATRIX, CONFIG_YAML
import yaml

# ── Feature column lists ───────────────────────────────────────────────────
IDENTIFIER_COLS = ["employee_id", "date"]

# The 37 numerical features produced by d2.py
NUMERICAL_FEATURES = [
    "loan_access_count",        "customer_search_count",      "audit_access_count",
    "compliance_access_count",  "override_access_count",      "total_daily_accesses",
    "days_since_last_audit",    "days_since_last_compliance", "days_since_last_override",
    "rolling_7_day_audit_avg",  "rolling_14_day_audit_avg",  "rolling_30_day_audit_avg",
    "rolling_30_day_comp_avg",  "rolling_30_day_override_avg",
    "rolling_7_day_audit_std",  "rolling_30_day_audit_std",
    "audit_trend_slope",        "comp_trend_slope",           "override_trend_slope",
    "audit_drop_pct",           "compliance_drop_pct",        "override_drop_pct",
    "audit_to_loan_ratio",      "compliance_to_loan_ratio",
    "critical_module_missing_pct", "expected_modules_accessed", "expected_modules_missing",
    "peer_avg_audit_diff",      "peer_std_audit",             "peer_z_score_audit",
    "peer_percentile_audit",
    "login_time_variance",      "logout_time_variance",       "avg_session_length_min",
    "context_switching_score",  "critical_access_ratio",      "modules_per_session",
]

# Columns that cannot be negative (Step 3 validation)
NON_NEGATIVE_COLS = [
    "loan_access_count", "customer_search_count", "audit_access_count",
    "compliance_access_count", "override_access_count", "total_daily_accesses",
    "days_since_last_audit", "days_since_last_compliance", "days_since_last_override",
    "critical_module_missing_pct", "expected_modules_accessed", "expected_modules_missing",
    "rolling_7_day_audit_avg", "rolling_14_day_audit_avg", "rolling_30_day_audit_avg",
]


def load_and_validate(path=None, verbose=True):
    """
    Load feature_matrix.csv and return (meta_df, X_df).

    meta_df : DataFrame with columns [employee_id, date]
    X_df    : DataFrame with only numerical feature columns (ready for IF)
    """
    if path is None:
        path = FEATURE_MATRIX

    if verbose:
        print(f"[preprocess] Loading {path} ...")

    df = pd.read_csv(path)

    if verbose:
        print(f"  Shape: {df.shape[0]:,} rows x {df.shape[1]} cols")

    # ── Step 1: Keep only known numerical features ─────────────────────────
    available = [c for c in NUMERICAL_FEATURES if c in df.columns]
    missing   = [c for c in NUMERICAL_FEATURES if c not in df.columns]
    if missing:
        print(f"  [WARN] {len(missing)} expected features not found: {missing[:5]}...")

    X_df   = df[available].copy()
    meta_df = df[IDENTIFIER_COLS].copy() if all(c in df.columns for c in IDENTIFIER_COLS) else pd.DataFrame()

    # ── Step 3: Validation ────────────────────────────────────────────────
    issues = []

    # Check missing values
    nan_counts = X_df.isnull().sum()
    nan_cols   = nan_counts[nan_counts > 0]
    if not nan_cols.empty:
        issues.append(f"NaN values in {list(nan_cols.index)}")
        X_df = X_df.fillna(0)

    # Check infinite values
    inf_mask = np.isinf(X_df.values)
    if inf_mask.any():
        inf_cols = X_df.columns[inf_mask.any(axis=0)].tolist()
        issues.append(f"Inf values in {inf_cols}")
        X_df = X_df.replace([np.inf, -np.inf], 0)

    # Check impossible negatives
    for col in NON_NEGATIVE_COLS:
        if col in X_df.columns:
            neg_count = (X_df[col] < 0).sum()
            if neg_count > 0:
                issues.append(f"{col}: {neg_count} negative values (clipped to 0)")
                X_df[col] = X_df[col].clip(lower=0)

    # Check duplicate rows
    dup_count = X_df.duplicated().sum()
    if dup_count > 0:
        issues.append(f"{dup_count} duplicate rows found")

    if verbose:
        if issues:
            print(f"  [WARN] Validation issues detected:")
            for iss in issues:
                print(f"    - {iss}")
        else:
            print(f"  Validation passed: no NaN, Inf, or impossible negatives.")
        print(f"  Features selected: {len(available)}")
        print(f"  Feature ranges (sample):")
        for col in ["loan_access_count", "audit_access_count", "audit_drop_pct",
                    "days_since_last_audit", "peer_z_score_audit"]:
            if col in X_df.columns:
                print(f"    {col:<35} [{X_df[col].min():.1f} – {X_df[col].max():.1f}]")

    return meta_df, X_df
