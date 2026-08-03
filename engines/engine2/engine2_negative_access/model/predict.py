"""
predict.py — Step 15 of new_instruct.md

Prediction pipeline: load saved model, run on new employee data,
return Access Void Score + human-readable explanation JSON.

Flow (as specified in new_instruct.md Step 15):
    New Employee
    -> Engineer Features
    -> Load Isolation Forest
    -> Predict
    -> Raw Score
    -> Normalize
    -> Access Void Score
    -> Generate Reasons
    -> Return JSON

Usage:
    from model.predict import predict_employee
    result = predict_employee("EMP001")
"""
import sys
import json
import pathlib
import pandas as pd
import numpy as np

_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import PREDICTIONS_DIR, ENG_FEATURES, EMPLOYEES_CSV
from model.save_model import load_model
from scoring.access_void_score import raw_to_access_void, get_risk_level
from scoring.explainability import _compute_emp_stats, generate_reasons_for_employee


def _load_scores():
    """Load pre-computed per-employee scores from training."""
    path = PREDICTIONS_DIR / "scores.csv"
    if path.exists():
        return pd.read_csv(path).set_index("employee_id")
    return None


def predict_employee(employee_id: str) -> dict:
    """
    Return Access Void Score + explanation for a single employee.

    First checks if pre-computed scores exist (fast path).
    Falls back to running the model live if not.

    Parameters
    ----------
    employee_id : str  e.g. "EMP001"

    Returns
    -------
    dict with keys: employee_id, name, access_void_score, risk, raw_anomaly_score, reasons
    """
    # ── Fast path: use training output ────────────────────────────────────
    scores_df = _load_scores()
    if scores_df is not None and employee_id in scores_df.index:
        row  = scores_df.loc[employee_id]
        reasons_txt = str(row.get("reasons_text", ""))
        reasons = reasons_txt.split(" | ") if reasons_txt else []
        return {
            "employee_id":      employee_id,
            "name":             row.get("name", employee_id),
            "role":             row.get("role", ""),
            "branch":           row.get("branch", ""),
            "access_void_score": float(row["access_void_score"]),
            "raw_anomaly_score": float(row.get("raw_anomaly_score", 0.0)),
            "risk":             row["risk"],
            "reasons":          [r.strip() for r in reasons if r.strip()],
        }

    # ── Live path: run model on individual employee ────────────────────────
    print(f"[predict] No cached scores found. Running live prediction for {employee_id}...")

    from preprocessing.preprocess import load_and_validate
    meta_df, X_df = load_and_validate(verbose=False)

    mask = meta_df["employee_id"] == employee_id
    if not mask.any():
        raise ValueError(f"Employee {employee_id} not found in feature matrix.")

    profiler   = load_model()
    all_raw    = profiler.decision_function(X_df.values)
    all_void   = raw_to_access_void(all_raw)

    emp_indices = meta_df.index[mask].tolist()
    emp_void    = all_void[emp_indices]
    emp_raw     = all_raw[emp_indices]

    # Last 30 rows
    score   = round(float(emp_void[-30:].mean()), 1)
    raw_avg = round(float(emp_raw[-30:].mean()), 4)
    risk    = get_risk_level(score)

    # Explainability
    ef_df   = pd.read_csv(ENG_FEATURES)
    stats   = _compute_emp_stats(ef_df, employee_id)
    reasons = generate_reasons_for_employee(stats, {})

    # Employee info
    try:
        emp_info = pd.read_csv(EMPLOYEES_CSV).set_index("employee_id")
        name     = emp_info.loc[employee_id, "name"] if employee_id in emp_info.index else employee_id
        role     = emp_info.loc[employee_id, "role"] if employee_id in emp_info.index else ""
        branch   = emp_info.loc[employee_id, "branch"] if employee_id in emp_info.index else ""
    except Exception:
        name = employee_id; role = ""; branch = ""

    return {
        "employee_id":      employee_id,
        "name":             name,
        "role":             role,
        "branch":           branch,
        "access_void_score": score,
        "raw_anomaly_score": raw_avg,
        "risk":             risk,
        "reasons":          reasons,
    }


def predict_all() -> list:
    """
    Return predictions for all employees.
    Uses pre-computed scores from training output.
    """
    path = PREDICTIONS_DIR / "predictions.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    scores_df = _load_scores()
    if scores_df is None:
        raise FileNotFoundError("Run model/train.py first to generate predictions.")

    results = []
    for eid in scores_df.index:
        results.append(predict_employee(eid))
    return results


if __name__ == "__main__":
    result = predict_employee("EMP001")
    print(json.dumps(result, indent=2, ensure_ascii=False))
