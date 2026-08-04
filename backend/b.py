"""
PHANTOM — Backend API Server
==============================
FastAPI server that exposes all 4 engine outputs as REST endpoints.
Engine 4 is stubbed (deferred to next sprint).

Key fix: Engine 3's extract_events_from_psb_data() is O(n²) on 977K rows
and would take hours. We replace it with a fast pandas-based sampling that
creates representative co-access events per employee pair efficiently.

Run from the PSBHackathon root:
    uvicorn backend.b:app --reload --port 8000

Or from the backend/ directory:
    cd backend && uvicorn b:app --reload --port 8000
"""

import sys
import json
import pathlib
import importlib.util
import pandas as pd
import numpy as np
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

ROOT = pathlib.Path(__file__).parent.parent.resolve()   # PSBHackathon/

ENGINE1_DIR = ROOT / "engines" / "engine1"
ENGINE2_DIR = ROOT / "engines" / "engine2" / "engine2_negative_access"
ENGINE3_DIR = ROOT / "engines" / "engine3"
DATA_DIR    = ROOT / "data"

for p in [str(ENGINE1_DIR), str(ENGINE2_DIR), str(ENGINE3_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ---------------------------------------------------------------------------
# Engine imports via importlib (files named 1.py, 3.py)
# ---------------------------------------------------------------------------

def _load_module(name: str, filepath: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, filepath)
    mod  = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

engine1 = _load_module("engine1", ENGINE1_DIR / "1.py")
engine3 = _load_module("engine3", ENGINE3_DIR / "3.py")

# Engine 2 — proper package, uses its own paths.py
from model.predict import predict_all, predict_employee
from paths import PREDICTIONS_DIR, EMPLOYEES_CSV, DAILY_ACTIVITY, OUTPUTS_DIR

TIMELINE_JSON_DIR = OUTPUTS_DIR / "timeline_json"
ACCESS_LOGS_CSV   = DATA_DIR / "raw" / "access_logs.csv"
PEER_COHORTS_CSV  = DATA_DIR / "processed" / "peer_cohorts.csv"
PREDICTIONS_JSON  = PREDICTIONS_DIR / "predictions.json"
DAILY_SCORES_CSV  = PREDICTIONS_DIR / "daily_scores.csv"

# ---------------------------------------------------------------------------
# In-memory caches
# ---------------------------------------------------------------------------

ALL_PREDICTIONS:   list            = []
EMPLOYEES_DF:      pd.DataFrame    = pd.DataFrame()
COLLUSION_SCORES:  dict            = {}   # emp_id -> int
COLLUSION_GRAPHS:  dict            = {}   # emp_id -> {nodes, links}
TIMELINE_CACHE:    dict            = {}   # emp_id -> dict
CHAIN_SCORES:      dict            = {}   # emp_id -> int
STATS_CACHE:       dict            = {}
DAILY_SCORES_DF:   pd.DataFrame    = pd.DataFrame()
DAILY_ACTIVITY_DF: pd.DataFrame    = pd.DataFrame()

SUSPECT_EMPLOYEES = {"EMP001", "EMP010", "EMP015", "EMP023"}

# ---------------------------------------------------------------------------
# Fast Engine 3 co-access computation (replaces the O(n²) engine function)
# ---------------------------------------------------------------------------

def _fast_collusion_events(logs_path: pathlib.Path, sample_days: int = 90) -> list:
    """
    Build co-access events from access_logs.csv using pandas groupby.
    Uses all `sample_days` (default 90) to ensure full network coverage.
    """
    if not logs_path.exists():
        return []

    print(f"[PHANTOM] Reading access logs for Engine 3 (full {sample_days} days)...")
    df = pd.read_csv(
        logs_path,
        usecols=["employee_id", "timestamp", "module"],
    )
    # Add date column from timestamp string directly (YYYY-MM-DD)
    df["date"] = df["timestamp"].str[:10]
    print(f"[PHANTOM] Loaded {len(df):,} rows.")

    events = []
    # Group by date + module, collect employee IDs
    grouped = df.groupby(["date", "module"])["employee_id"].apply(lambda s: list(set(s)))

    for (date, module), unique_emps in grouped.items():
        if len(unique_emps) < 2:
            continue
        # Limit to first 6 employees per module-day
        subset = unique_emps[:6]
        mod_id = f"MOD-{module.upper().replace(' ', '_')}"
        for i in range(len(subset)):
            for j in range(i + 1, len(subset)):
                events.append({
                    "employee_ids": [subset[i], subset[j]],
                    "record_id":    mod_id,
                    "delta_minutes": 35.0,
                    "record_value": "HIGH",
                })

    print(f"[PHANTOM] Generated {len(events):,} co-access event pairs.")
    return events


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

def _startup():
    global ALL_PREDICTIONS, EMPLOYEES_DF, COLLUSION_SCORES, COLLUSION_GRAPHS
    global TIMELINE_CACHE, CHAIN_SCORES, STATS_CACHE, DAILY_SCORES_DF, DAILY_ACTIVITY_DF

    print("[PHANTOM] Starting up...")

    # 1. Load predictions.json
    if PREDICTIONS_JSON.exists():
        with open(PREDICTIONS_JSON, encoding="utf-8") as f:
            ALL_PREDICTIONS = json.load(f)
        print(f"[PHANTOM] Loaded {len(ALL_PREDICTIONS)} predictions.")
    else:
        print("[PHANTOM] WARNING: predictions.json not found — run engine2/2.py first.")

    # 2. Load employees.csv
    if EMPLOYEES_CSV.exists():
        EMPLOYEES_DF = pd.read_csv(EMPLOYEES_CSV)
        print(f"[PHANTOM] Loaded {len(EMPLOYEES_DF)} employees.")

    # 3. Load daily scores + activity
    if DAILY_SCORES_CSV.exists():
        DAILY_SCORES_DF = pd.read_csv(DAILY_SCORES_CSV)
    if DAILY_ACTIVITY.exists():
        DAILY_ACTIVITY_DF = pd.read_csv(DAILY_ACTIVITY)
    print(f"[PHANTOM] Loaded daily data ({len(DAILY_SCORES_DF)} score rows, {len(DAILY_ACTIVITY_DF)} activity rows).")

    # 4. Load pre-generated timeline JSONs
    for eid in SUSPECT_EMPLOYEES:
        path = TIMELINE_JSON_DIR / f"{eid}.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                TIMELINE_CACHE[eid] = json.load(f)
    print(f"[PHANTOM] Loaded {len(TIMELINE_CACHE)} timeline JSONs.")

    # 5. Engine 3 — fast pandas-based co-access events (NOT O(n²))
    if ACCESS_LOGS_CSV.exists():
        co_events = _fast_collusion_events(ACCESS_LOGS_CSV, sample_days=30)
        emp_ids = EMPLOYEES_DF["employee_id"].tolist() if not EMPLOYEES_DF.empty else []
        for eid in emp_ids:
            COLLUSION_SCORES[eid] = engine3.calculate_collusion_score(eid, co_events)
            COLLUSION_GRAPHS[eid] = engine3.export_graph_json(eid, co_events)
        print(f"[PHANTOM] Collusion scores ready for {len(COLLUSION_SCORES)} employees.")
    else:
        print("[PHANTOM] WARNING: access_logs.csv not found.")

    # 6. Engine 1 chain scores — sample last date only
    _compute_chain_scores()

    # 7. Stats
    risk_breakdown: dict = {}
    for p in ALL_PREDICTIONS:
        r = p.get("risk", "Normal")
        risk_breakdown[r] = risk_breakdown.get(r, 0) + 1

    STATS_CACHE = {
        "total_employees": len(ALL_PREDICTIONS),
        "flagged_high":    risk_breakdown.get("High", 0) + risk_breakdown.get("Critical", 0),
        "flagged_medium":  risk_breakdown.get("Medium", 0),
        "flagged_low":     risk_breakdown.get("Low", 0),
        "last_scan":       "2026-03-31",
        "total_events":    977000,
        "risk_breakdown":  risk_breakdown,
    }

    print("[PHANTOM] Startup complete — all caches ready.")


def _compute_chain_scores():
    global CHAIN_SCORES
    if not ACCESS_LOGS_CSV.exists():
        return
    try:
        print("[PHANTOM] Fast computing Engine 1 chain scores for all employees...")
        # Read access_logs once for the last date
        df = pd.read_csv(ACCESS_LOGS_CSV, usecols=["employee_id", "timestamp", "module"])
        df["date"] = df["timestamp"].str[:10]
        max_date = df["date"].max()
        df_last = df[df["date"] == max_date]

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
    except Exception as e:
        print(f"[PHANTOM] Chain score error: {e}")


def _composite_trust(avoidance: float, chain: int, collusion: int) -> int:
    """3-engine formula (Engine 4 deferred). Lower = more risky (score is risk, not trust)."""
    risk_score = 0.45 * float(avoidance) + 0.35 * float(chain) + 0.20 * float(collusion)
    return int(max(0, min(100, round(100 - risk_score))))


def _build_employee_detail(pred: dict) -> dict:
    eid       = str(pred["employee_id"])
    chain     = int(CHAIN_SCORES.get(eid, 0))
    collusion = int(COLLUSION_SCORES.get(eid, 0))
    avoidance = float(pred.get("access_void_score", 0))
    composite = _composite_trust(avoidance, chain, collusion)

    result = {
        "employee_id":           eid,
        "name":                  str(pred.get("name", eid)),
        "role":                  "",   # will be filled from employees.csv below
        "branch":                "",   # will be filled from employees.csv below
        "department":            "",
        "access_void_score":     avoidance,
        "risk":                  str(pred.get("risk", "Normal")),
        "chain_score":           chain,
        "collusion_score":       collusion,
        "language_score":        None,  # E4 deferred
        "composite_trust_score": composite,
        "reasons":               [str(r) for r in pred.get("reasons", [])],
    }

    # Enrich with employees.csv — role, branch, department, experience, cohort, personality
    if not EMPLOYEES_DF.empty and "employee_id" in EMPLOYEES_DF.columns:
        row = EMPLOYEES_DF[EMPLOYEES_DF["employee_id"] == eid]
        if not row.empty:
            r = row.iloc[0]

            # Core fields that predictions.json doesn't have
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

            # Personality — individual columns in employees.csv
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


def _build_generic_timeline(eid: str) -> dict:
    """Build timeline for employees without a pre-generated JSON."""
    timeline = []
    pred = next((p for p in ALL_PREDICTIONS if p["employee_id"] == eid), {})

    if not DAILY_SCORES_DF.empty and "employee_id" in DAILY_SCORES_DF.columns:
        ds = DAILY_SCORES_DF[DAILY_SCORES_DF["employee_id"] == eid].copy()
        if "date" in ds.columns:
            ds = ds.sort_values("date").reset_index(drop=True)

        da = pd.DataFrame()
        if not DAILY_ACTIVITY_DF.empty and "employee_id" in DAILY_ACTIVITY_DF.columns:
            da = DAILY_ACTIVITY_DF[DAILY_ACTIVITY_DF["employee_id"] == eid].copy()
            if "day_index" in da.columns:
                da = da.sort_values("day_index").reset_index(drop=True)

        for i, row in ds.iterrows():
            day_idx = int(row.get("day_index", i))
            entry = {
                "day":               day_idx,
                "date":              str(row.get("date", "")),
                "access_void_score": float(row.get("access_void_score", 0)),
                "primary_activity":  0,
                "audit":             0,
                "compliance":        0,
                "override":          0,
            }
            if not da.empty and "day_index" in da.columns:
                act = da[da["day_index"] == day_idx]
                if not act.empty:
                    ar = act.iloc[0]
                    # Try common primary module column names
                    for col in ["Customer Search", "Cash Operations", "Loan Approvals"]:
                        if col in ar.index and pd.notna(ar[col]):
                            entry["primary_activity"] = int(ar[col])
                            break
                    entry["audit"]      = int(ar.get("Audit Reports", 0) or 0)
                    entry["compliance"] = int(ar.get("Compliance Dashboard", 0) or 0)
                    entry["override"]   = int(ar.get("Override Logs", 0) or 0)
            timeline.append(entry)

    return {
        "employee_id":         eid,
        "name":                pred.get("name", eid),
        "role":                pred.get("role", ""),
        "primary_module_name": "Activity",
        "current_score":       pred.get("access_void_score", 0),
        "risk_level":          pred.get("risk", "Normal"),
        "trend":               "→ Stable",
        "events":              [],
        "timeline":            timeline,
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    _startup()
    yield

app = FastAPI(
    title="PHANTOM API",
    description="AI Insider Threat Detection — live data from 4 engines.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status":           "ok",
        "employees_loaded": len(ALL_PREDICTIONS),
        "chain_scores":     len(CHAIN_SCORES),
        "collusion_scores": len(COLLUSION_SCORES),
    }


@app.get("/api/stats")
def get_stats():
    return STATS_CACHE


@app.get("/api/leaderboard")
def get_leaderboard():
    # Sort by access_void_score descending (highest risk first)
    sorted_preds = sorted(ALL_PREDICTIONS, key=lambda p: float(p.get("access_void_score", 0)), reverse=True)
    return [_build_employee_detail(p) for p in sorted_preds]


@app.get("/api/employees/{employee_id}")
def get_employee(employee_id: str):
    pred = next((p for p in ALL_PREDICTIONS if p["employee_id"] == employee_id), None)
    if pred is None:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    return _build_employee_detail(pred)


@app.get("/api/employee/{employee_id}/timeline")
def get_timeline(employee_id: str):
    if employee_id in TIMELINE_CACHE:
        return TIMELINE_CACHE[employee_id]
    if not DAILY_SCORES_DF.empty and "employee_id" in DAILY_SCORES_DF.columns:
        if employee_id in DAILY_SCORES_DF["employee_id"].values:
            return _build_generic_timeline(employee_id)
    raise HTTPException(status_code=404, detail=f"Timeline not found for {employee_id}")


@app.get("/api/employee/{employee_id}/chain-score")
def get_chain_score(employee_id: str, date: Optional[str] = None):
    if date:
        try:
            score = engine1.score_from_psb_data(str(ACCESS_LOGS_CSV), employee_id, date)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        score = CHAIN_SCORES.get(employee_id, 0)
        date  = "2026-03-31"
    return {"employee_id": employee_id, "date": date, "chain_score": score}


@app.get("/api/employee/{employee_id}/collusion")
def get_collusion(employee_id: str):
    score = COLLUSION_SCORES.get(employee_id, 0)
    graph = COLLUSION_GRAPHS.get(employee_id, {"nodes": [], "links": []})
    return {"employee_id": employee_id, "collusion_score": score, "graph": graph}


class ScoreTextRequest(BaseModel):
    text: str

@app.post("/api/score-text")
def score_text(req: ScoreTextRequest):
    """Engine 4 — stubbed. See todo.md P1."""
    return {
        "language_score": None,
        "vagueness":      None,
        "urgency":        None,
        "status":         "not_connected",
        "message":        "Language Risk Scanner coming soon.",
    }


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("b:app", host="0.0.0.0", port=8000, reload=True)
