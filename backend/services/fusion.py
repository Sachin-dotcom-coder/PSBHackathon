"""
PHANTOM Scoring & Fusion Service
================================
Calculates multi-engine risk scores and composite DITS (Dynamic Insider Threat Score),
and formats employee detail objects for API endpoints.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

import services.data_loader as data_loader


def compute_dits_score(chain: int, avoidance: float, collusion: int, language: Optional[int] = None) -> int:
    """
    Computes the Dynamic Insider Threat Score (DITS, 0-100 scale).
    Formula:
        0.30 * chain_score + 0.30 * avoidance_score + 0.20 * collusion_score + 0.20 * language_score
    If language score is not available (None), uses normalized weights across the 3 available engines:
        0.40 * chain_score + 0.40 * avoidance_score + 0.20 * collusion_score
    """
    chain_val = float(chain or 0)
    avoid_val = float(avoidance or 0)
    collusion_val = float(collusion or 0)

    if language is not None:
        lang_val = float(language)
        dits = 0.30 * chain_val + 0.30 * avoid_val + 0.20 * collusion_val + 0.20 * lang_val
    else:
        dits = 0.40 * chain_val + 0.40 * avoid_val + 0.20 * collusion_val

    return int(max(0, min(100, round(dits))))


def build_employee_detail(pred: dict) -> dict:
    """Enriches prediction dict with metadata from employees.csv and computed multi-engine scores."""
    eid = str(pred["employee_id"])
    chain = int(data_loader.CHAIN_SCORES.get(eid, 0))
    collusion = int(data_loader.COLLUSION_SCORES.get(eid, 0))
    avoidance = float(pred.get("access_void_score", 0))

    # Engine 4 optional language score
    language_score = pred.get("language_score", None)
    
    # Calculate Dynamic Insider Threat Score (DITS)
    dits_score = compute_dits_score(chain, avoidance, collusion, language_score)

    result: Dict[str, Any] = {
        "employee_id": eid,
        "name": str(pred.get("name", eid)),
        "role": str(pred.get("role", "")),
        "branch": str(pred.get("branch", "")),
        "department": str(pred.get("department", "")),
        "access_void_score": avoidance,
        "risk": str(pred.get("risk", "Normal")),
        "chain_score": chain,
        "collusion_score": collusion,
        "language_score": language_score,
        "nlp_details": pred.get("nlp_details") or data_loader.LANGUAGE_SCORES.get(eid),
        "dits_score": dits_score,
        "composite_trust_score": 100 - dits_score,
        "reasons": [str(r) for r in pred.get("reasons", [])],
    }

    # Enrich from employees.csv DataFrame if loaded
    emp_df = data_loader.EMPLOYEES_DF
    if not emp_df.empty and "employee_id" in emp_df.columns:
        row = emp_df[emp_df["employee_id"] == eid]
        if not row.empty:
            r = row.iloc[0]

            for col in ["role", "branch", "department"]:
                if col in r.index and pd.notna(r[col]):
                    result[col] = str(r[col])

            if "experience_years" in r.index and pd.notna(r["experience_years"]):
                result["experience_years"] = float(r["experience_years"])
            if "cohort_id" in r.index and pd.notna(r["cohort_id"]):
                result["cohort_id"] = str(r["cohort_id"])
            if "status" in r.index and pd.notna(r["status"]):
                result["status"] = str(r["status"])
            if "manager" in r.index and pd.notna(r["manager"]):
                result["manager"] = str(r["manager"])

            # Personality metrics
            personality_cols = [
                "work_style", "risk_profile", "arrival_time",
                "leave_time", "avg_daily_customers", "typing_speed",
                "break_pattern", "leave_frequency",
            ]
            personality = {}
            for col in personality_cols:
                if col in r.index and pd.notna(r[col]):
                    val = r[col]
                    if isinstance(val, (np.integer, int)):
                        personality[col] = int(val)
                    elif isinstance(val, (np.floating, float)):
                        personality[col] = float(val)
                    else:
                        personality[col] = str(val)
            if personality:
                result["personality"] = personality

    return result


def build_generic_timeline(eid: str) -> dict:
    """Builds daily timeline for employees without a pre-generated JSON artifact."""
    timeline = []
    pred = next((p for p in data_loader.ALL_PREDICTIONS if p["employee_id"] == eid), {})

    ds_df = data_loader.DAILY_SCORES_DF
    da_df = data_loader.DAILY_ACTIVITY_DF

    if not ds_df.empty and "employee_id" in ds_df.columns:
        ds = ds_df[ds_df["employee_id"] == eid].copy()
        if "date" in ds.columns:
            ds = ds.sort_values("date").reset_index(drop=True)

        da = pd.DataFrame()
        if not da_df.empty and "employee_id" in da_df.columns:
            da = da_df[da_df["employee_id"] == eid].copy()
            if "day_index" in da.columns:
                da = da.sort_values("day_index").reset_index(drop=True)

        for i, row in ds.iterrows():
            day_idx = int(row.get("day_index", i))
            entry = {
                "day": day_idx,
                "date": str(row.get("date", "")),
                "access_void_score": float(row.get("access_void_score", 0)),
                "primary_activity": 0,
                "audit": 0,
                "compliance": 0,
                "override": 0,
            }
            if not da.empty and "day_index" in da.columns:
                act = da[da["day_index"] == day_idx]
                if not act.empty:
                    ar = act.iloc[0]
                    for col in ["Customer Search", "Cash Operations", "Loan Approvals"]:
                        if col in ar.index and pd.notna(ar[col]):
                            entry["primary_activity"] = int(ar[col])
                            break
                    entry["audit"] = int(ar.get("Audit Reports", 0) or 0)
                    entry["compliance"] = int(ar.get("Compliance Dashboard", 0) or 0)
                    entry["override"] = int(ar.get("Override Logs", 0) or 0)
            timeline.append(entry)

    return {
        "employee_id": eid,
        "name": pred.get("name", eid),
        "role": pred.get("role", ""),
        "primary_module_name": "Activity",
        "current_score": pred.get("access_void_score", 0),
        "risk_level": pred.get("risk", "Normal"),
        "trend": "→ Stable",
        "events": [],
        "timeline": timeline,
    }
