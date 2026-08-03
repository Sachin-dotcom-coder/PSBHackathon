"""
train.py — Steps 7, 9, 10, 11, 14 of new_instruct.md

Full training pipeline:
  1. Load + validate feature_matrix.csv
  2. Train NegativeAccessProfiler (Isolation Forest, 300 trees)
  3. Generate per-day raw anomaly scores
  4. Convert to Access Void Score (0-100)
  5. Aggregate per employee (last 30 days = primary score)
  6. Generate explainability reasons
  7. Save model + predictions

Run:
    python engines/engine2/engine2_negative_access/model/train.py
"""
import sys
import json
import pathlib
import pandas as pd
import numpy as np

_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import PREDICTIONS_DIR, EMPLOYEES_CSV
from preprocessing.preprocess import load_and_validate
from model.isolation_forest import NegativeAccessProfiler
from model.save_model import save_model
from scoring.access_void_score import raw_to_access_void, get_risk_level
from scoring.explainability import generate_reasons, format_explanation_json


def train(verbose=True):
    """
    Full training pipeline. Returns per-employee scores DataFrame.
    """
    print("=" * 60)
    print("ENGINE 2 — Negative Access Profiler — Training")
    print("=" * 60)

    # ── Step 1-3: Load and validate ───────────────────────────────────────
    meta_df, X_df = load_and_validate(verbose=verbose)

    # ── Step 6-7: Train Isolation Forest ─────────────────────────────────
    profiler = NegativeAccessProfiler()
    profiler.fit(X_df)

    # ── Step 9: Raw anomaly scores (one per employee-day) ─────────────────
    raw_scores = profiler.decision_function(X_df.values)

    # ── Step 10: Convert to Access Void Score (0-100) ─────────────────────
    void_scores = raw_to_access_void(raw_scores)

    meta_df = meta_df.copy()
    meta_df["raw_score"]        = raw_scores
    meta_df["access_void_score"] = void_scores

    # ── Step 10: Aggregate per employee ───────────────────────────────────
    # Strategy: use last 30 days for primary score (captures recent behaviour)
    employee_results = []

    for eid, grp in meta_df.groupby("employee_id"):
        grp_sorted = grp.sort_values("date")
        recent_30  = grp_sorted.tail(30)

        score    = round(float(recent_30["access_void_score"].mean()), 1)
        raw_avg  = round(float(recent_30["raw_score"].mean()), 4)
        risk     = get_risk_level(score)

        employee_results.append({
            "employee_id":      eid,
            "access_void_score": score,
            "raw_anomaly_score": raw_avg,
            "risk":             risk,
        })

    scores_df = (
        pd.DataFrame(employee_results)
          .sort_values("access_void_score", ascending=False)
          .reset_index(drop=True)
    )

    # ── Step 11: Generate explainability ──────────────────────────────────
    if verbose:
        print("\n[train] Generating explainability reasons ...")

    reasons_df = generate_reasons(meta_df)
    scores_df  = scores_df.merge(reasons_df, on="employee_id", how="left")

    # Load employee names for display
    try:
        emp_info = pd.read_csv(EMPLOYEES_CSV, usecols=["employee_id", "name", "role", "branch"])
        scores_df = scores_df.merge(emp_info, on="employee_id", how="left")
    except Exception:
        scores_df["name"]   = scores_df["employee_id"]
        scores_df["role"]   = ""
        scores_df["branch"] = ""

    # ── Step 14: Save model ───────────────────────────────────────────────
    save_model(profiler)

    # ── Save predictions ──────────────────────────────────────────────────
    save_cols = ["employee_id", "name", "role", "branch",
                 "access_void_score", "raw_anomaly_score", "risk", "reasons_text"]
    available = [c for c in save_cols if c in scores_df.columns]
    scores_df[available].to_csv(PREDICTIONS_DIR / "scores.csv", index=False)

    # Per-day scores for time-series visualisation (Step 13)
    meta_df.to_csv(PREDICTIONS_DIR / "daily_scores.csv", index=False)

    # JSON output with full explainability (Step 11 format)
    json_output = []
    for _, row in scores_df.iterrows():
        reasons_list = row.get("reasons_json", [])
        if not isinstance(reasons_list, list):
            reasons_list = str(row.get("reasons_text", "")).split(" | ")
        json_output.append(format_explanation_json(
            eid    = row["employee_id"],
            name   = row.get("name", row["employee_id"]),
            score  = row["access_void_score"],
            risk   = row["risk"],
            reasons = reasons_list,
        ))

    with open(PREDICTIONS_DIR / "predictions.json", "w", encoding="utf-8") as f:
        json.dump(json_output, f, indent=2, ensure_ascii=False)

    # ── Print summary ─────────────────────────────────────────────────────
    if verbose:
        print("\n" + "=" * 60)
        print("TRAINING COMPLETE — Top Suspicious Employees")
        print("=" * 60)
        display_cols = ["employee_id", "name", "role", "access_void_score", "risk"]
        display = [c for c in display_cols if c in scores_df.columns]
        print(scores_df[display].head(10).to_string(index=False))

        print(f"\nOutputs:")
        print(f"  {PREDICTIONS_DIR / 'scores.csv'}")
        print(f"  {PREDICTIONS_DIR / 'daily_scores.csv'}")
        print(f"  {PREDICTIONS_DIR / 'predictions.json'}")

    return scores_df, profiler, meta_df


if __name__ == "__main__":
    results, _, _ = train()
