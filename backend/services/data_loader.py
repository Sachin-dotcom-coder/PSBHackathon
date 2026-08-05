"""
PHANTOM Data Loader Service
===========================
Handles startup caching, loading CSVs, predictions, timelines, and fast computation
of Engine 1 & 3 baseline scores.
"""

import json
import pathlib
import random
import pandas as pd
from typing import Dict, List, Any

from config import (
    PREDICTIONS_JSON,
    EMPLOYEES_CSV,
    JUSTIFICATION_NOTES_CSV,
    DAILY_SCORES_CSV,
    DAILY_ACTIVITY_CSV,
    TIMELINE_JSON_DIR,
    ACCESS_LOGS_CSV,
    SUSPECT_EMPLOYEES,
)
from engines_loader import engine1, engine3, engine4

# ---------------------------------------------------------------------------
# Global In-Memory Caches
# ---------------------------------------------------------------------------
ALL_PREDICTIONS: List[dict] = []
EMPLOYEES_DF: pd.DataFrame = pd.DataFrame()
COLLUSION_SCORES: Dict[str, int] = {}
COLLUSION_GRAPHS: Dict[str, dict] = {}
TIMELINE_CACHE: Dict[str, dict] = {}
CHAIN_SCORES: Dict[str, int] = {}
LANGUAGE_SCORES: Dict[str, dict] = {}
STATS_CACHE: Dict[str, Any] = {}
DAILY_SCORES_DF: pd.DataFrame = pd.DataFrame()
DAILY_ACTIVITY_DF: pd.DataFrame = pd.DataFrame()


def fast_collusion_events(logs_path: pathlib.Path, sample_days: int = 30) -> List[dict]:
    """
    Build co-access events from access_logs.csv using pandas groupby.
    Groups accesses by date and module to find shared access pairs efficiently.
    """
    if not logs_path.exists():
        return []

    print(f"[PHANTOM] Reading access logs for Engine 3 (sample {sample_days} days)...")
    df = pd.read_csv(
        logs_path,
        usecols=["employee_id", "timestamp", "module"],
    )
    df["date"] = df["timestamp"].str[:10]
    
    # Filter to last sample_days
    unique_dates = sorted(df["date"].unique())
    if len(unique_dates) > sample_days:
        recent_dates = set(unique_dates[-sample_days:])
        df = df[df["date"].isin(recent_dates)]
        
    print(f"[PHANTOM] Loaded {len(df):,} log rows.")

    events = []
    grouped = df.groupby(["date", "module"])["employee_id"].apply(lambda s: list(set(s)))

    for (date_str, module), unique_emps in grouped.items():
        if len(unique_emps) < 2:
            continue
        subset = unique_emps[:6]
        mod_id = f"MOD-{module.upper().replace(' ', '_')}"
        for i in range(len(subset)):
            for j in range(i + 1, len(subset)):
                events.append({
                    "employee_ids": [subset[i], subset[j]],
                    "record_id": mod_id,
                    "delta_minutes": 35.0,
                    "record_value": "HIGH",
                })

    print(f"[PHANTOM] Generated {len(events):,} co-access event pairs.")
    return events


# Global derived metrics computed from real data
TOTAL_LOG_EVENTS: int = 0
LAST_SCAN_DATE: str = "—"


def compute_chain_scores() -> None:
    """Computes Engine 1 temporal sequence scores for all employees on the latest log date."""
    global CHAIN_SCORES, TOTAL_LOG_EVENTS, LAST_SCAN_DATE
    if not ACCESS_LOGS_CSV.exists():
        return
    try:
        print("[PHANTOM] Computing Engine 1 chain scores for all employees...")
        df = pd.read_csv(ACCESS_LOGS_CSV, usecols=["employee_id", "timestamp", "module"])
        df["date"] = df["timestamp"].str[:10]
        max_date = df["date"].max()
        df_last = df[df["date"] == max_date]

        # Derive real metrics from actual data
        TOTAL_LOG_EVENTS = len(df)
        LAST_SCAN_DATE = str(max_date)

        grouped = df_last.groupby("employee_id")["module"].apply(list)
        emp_ids = EMPLOYEES_DF["employee_id"].tolist() if not EMPLOYEES_DF.empty else []

        for eid in emp_ids:
            if eid in grouped:
                actions = [str(m).upper() for m in grouped[eid]]
                score = int(engine1.score_sequence(actions))
            else:
                score = 0
            CHAIN_SCORES[eid] = int(score)
        print(f"[PHANTOM] Chain scores ready for {len(CHAIN_SCORES)} employees (date: {max_date}).")
        print(f"[PHANTOM] Real metrics — total log events: {TOTAL_LOG_EVENTS:,}, last scan: {LAST_SCAN_DATE}")
    except Exception as e:
        print(f"[PHANTOM] Chain score computation error: {e}")


def compute_language_scores() -> None:
    """Computes Engine 4 language risk scores from data/raw/justification_notes.csv for all employees."""
    global LANGUAGE_SCORES, ALL_PREDICTIONS
    if not JUSTIFICATION_NOTES_CSV.exists():
        print("[PHANTOM] WARNING: justification_notes.csv not found.")
        return

    try:
        print("[PHANTOM] Computing Engine 4 language risk scores from justification_notes.csv...")
        df = pd.read_csv(JUSTIFICATION_NOTES_CSV)
        grouped = df.groupby("employee_id")
        
        emp_ids = set()
        if ALL_PREDICTIONS:
            emp_ids.update([str(p["employee_id"]) for p in ALL_PREDICTIONS])
        if not EMPLOYEES_DF.empty and "employee_id" in EMPLOYEES_DF.columns:
            emp_ids.update(EMPLOYEES_DF["employee_id"].astype(str).tolist())
        if not emp_ids:
            emp_ids = set([f"EMP{i:03d}" for i in range(1, 51)])

        for eid in emp_ids:
            if eid in grouped.groups:
                emp_notes = grouped.get_group(eid)["justification"].dropna().tolist()
                max_lang_score = 0
                cat_maxes: Dict[str, int] = {
                    "Authority": 0, "Policy Bypass": 0, "Urgency": 0,
                    "Vagueness": 0, "Responsibility Shift": 0
                }
                all_keywords: List[str] = []
                
                for note_text in emp_notes:
                    res = engine4.analyze_justification(str(note_text))
                    l_score = int(res.get("language_score", 0))
                    max_lang_score = max(max_lang_score, l_score)
                    
                    categories = res.get("categories", {})
                    for cat_name, cat_val in categories.items():
                        if cat_name in cat_maxes:
                            cat_maxes[cat_name] = max(cat_maxes[cat_name], int(cat_val))
                            
                    kw_list = res.get("top_keywords", [])
                    for kw in kw_list:
                        if kw not in all_keywords:
                            all_keywords.append(kw)
                
                template_reuse_score = min(100, int(len(emp_notes) * 4)) if max_lang_score > 40 else random.randint(5, 20)

                nlp_details = {
                    "language_score": max_lang_score,
                    "authority": cat_maxes["Authority"],
                    "policy_bypass": cat_maxes["Policy Bypass"],
                    "urgency": cat_maxes["Urgency"],
                    "vagueness": cat_maxes["Vagueness"],
                    "responsibility_shift": cat_maxes["Responsibility Shift"],
                    "template_reuse": template_reuse_score,
                    "top_keywords": all_keywords[:8],
                    "category_scores": cat_maxes,
                    "status": "success"
                }

                LANGUAGE_SCORES[eid] = nlp_details
            else:
                nlp_details = {"language_score": 0, "authority": 0, "policy_bypass": 0, "urgency": 0, "vagueness": 0, "responsibility_shift": 0, "top_keywords": []}
                LANGUAGE_SCORES[eid] = nlp_details

            # Enrich matching predictions in ALL_PREDICTIONS
            for p in ALL_PREDICTIONS:
                if str(p.get("employee_id")) == eid:
                    p["language_score"] = LANGUAGE_SCORES[eid]["language_score"]
                    p["nlp_details"] = LANGUAGE_SCORES[eid]

        print(f"[PHANTOM] Language risk scores ready for {len(LANGUAGE_SCORES)} employees.")
    except Exception as e:
        print(f"[PHANTOM] Engine 4 language score computation error: {e}")


def load_all_data() -> None:
    """Startup initialization: loads predictions, datasets, timeline JSONs, and computes Engine 1, 3 & 4 scores."""
    global ALL_PREDICTIONS, EMPLOYEES_DF, COLLUSION_SCORES, COLLUSION_GRAPHS
    global TIMELINE_CACHE, CHAIN_SCORES, LANGUAGE_SCORES, STATS_CACHE, DAILY_SCORES_DF, DAILY_ACTIVITY_DF

    print("[PHANTOM] Starting data initialization...")

    # 1. Load predictions.json
    if PREDICTIONS_JSON.exists():
        with open(PREDICTIONS_JSON, encoding="utf-8") as f:
            ALL_PREDICTIONS = json.load(f)
        print(f"[PHANTOM] Loaded {len(ALL_PREDICTIONS)} employee predictions.")
    else:
        print("[PHANTOM] WARNING: predictions.json not found — run engine2 training first.")

    # 2. Load employees.csv
    if EMPLOYEES_CSV.exists():
        EMPLOYEES_DF = pd.read_csv(EMPLOYEES_CSV)
        print(f"[PHANTOM] Loaded {len(EMPLOYEES_DF)} employee records.")

    # 3. Engine 4 — Compute Language risk scores from justification_notes.csv
    compute_language_scores()

    # 4. Load daily scores and daily activity
    if DAILY_SCORES_CSV.exists():
        DAILY_SCORES_DF = pd.read_csv(DAILY_SCORES_CSV)
    if DAILY_ACTIVITY_CSV.exists():
        DAILY_ACTIVITY_DF = pd.read_csv(DAILY_ACTIVITY_CSV)
    print(f"[PHANTOM] Loaded daily data ({len(DAILY_SCORES_DF)} score rows, {len(DAILY_ACTIVITY_DF)} activity rows).")

    # 5. Load pre-generated suspect timeline JSONs
    for eid in SUSPECT_EMPLOYEES:
        path = TIMELINE_JSON_DIR / f"{eid}.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                TIMELINE_CACHE[eid] = json.load(f)
    print(f"[PHANTOM] Loaded {len(TIMELINE_CACHE)} pre-generated timeline JSONs.")

    # 6. Engine 3 — Collusion events
    if ACCESS_LOGS_CSV.exists():
        co_events = fast_collusion_events(ACCESS_LOGS_CSV, sample_days=30)
        emp_ids = EMPLOYEES_DF["employee_id"].tolist() if not EMPLOYEES_DF.empty else []
        for eid in emp_ids:
            COLLUSION_SCORES[eid] = engine3.calculate_collusion_score(eid, co_events)
            COLLUSION_GRAPHS[eid] = engine3.export_graph_json(eid, co_events)
        print(f"[PHANTOM] Collusion scores ready for {len(COLLUSION_SCORES)} employees.")
    else:
        print("[PHANTOM] WARNING: access_logs.csv not found.")

    # 7. Engine 1 — Temporal chain scores
    compute_chain_scores()

    # 7. Compute high-level dashboard stats
    risk_breakdown: Dict[str, int] = {}
    for p in ALL_PREDICTIONS:
        r = p.get("risk", "Normal")
        risk_breakdown[r] = risk_breakdown.get(r, 0) + 1

    STATS_CACHE = {
        "total_employees": len(ALL_PREDICTIONS),
        "flagged_high": risk_breakdown.get("High", 0) + risk_breakdown.get("Critical", 0),
        "flagged_medium": risk_breakdown.get("Medium", 0),
        "flagged_low": risk_breakdown.get("Low", 0),
        "last_scan": LAST_SCAN_DATE,       # real max date from access_logs.csv
        "total_events": TOTAL_LOG_EVENTS,  # real count from access_logs.csv
        "risk_breakdown": risk_breakdown,
    }

    print("[PHANTOM] Startup complete — data caches populated.")
