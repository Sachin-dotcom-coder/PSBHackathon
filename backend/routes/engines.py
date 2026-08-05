"""
PHANTOM Detection Engines Router
================================
Provides API endpoints for querying specific engine scores:
  - Engine 1: Temporal Causal Chain (/chain-score)
  - Engine 2: Negative Access Profiler (/avoidance)
  - Engine 3: Multi-Party Collusion Graph (/collusion)
  - Engine 4: Justification NLP Scanner (/score-text)
  - Live 4-Engine Evaluation (/evaluate)
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import config
from engines_loader import engine1, engine3, engine4, predict_employee
import services.data_loader as data_loader
from services.fusion import compute_dits_score

router = APIRouter(tags=["Engines"])


# Request models
class ScoreTextRequest(BaseModel):
    text: str


class EvaluateLogRequest(BaseModel):
    employee_id: str
    log_actions: List[str]
    co_access_events: Optional[List[Dict[str, Any]]] = None
    override_note: Optional[str] = None
    access_void_score: Optional[float] = 0.0


@router.get("/api/employee/{employee_id}/chain-score")
def get_chain_score(employee_id: str, date: Optional[str] = None):
    """Engine 1: Returns temporal causal chain score for an employee."""
    if date:
        try:
            score = engine1.score_from_psb_data(str(config.ACCESS_LOGS_CSV), employee_id, date)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        score = data_loader.CHAIN_SCORES.get(employee_id, 0)
        date = "2026-03-31"
    return {"employee_id": employee_id, "date": date, "chain_score": score}


@router.get("/api/employee/{employee_id}/avoidance")
def get_avoidance_score(employee_id: str):
    """Engine 2: Returns Negative Access / Access Void Score and Isolation Forest anomaly explanations."""
    pred = next((p for p in data_loader.ALL_PREDICTIONS if p["employee_id"] == employee_id), None)
    if pred:
        return {
            "employee_id": employee_id,
            "access_void_score": pred.get("access_void_score", 0.0),
            "raw_anomaly_score": pred.get("raw_anomaly_score", 0.0),
            "risk": pred.get("risk", "Normal"),
            "reasons": pred.get("reasons", []),
        }

    if predict_employee is not None:
        try:
            return predict_employee(employee_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Engine 2 prediction failed for {employee_id}: {str(e)}")

    raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found in Engine 2 scores.")


@router.get("/api/employee/{employee_id}/collusion")
def get_collusion(employee_id: str):
    """Engine 3: Returns collusion risk score and D3.js bipartite graph payload."""
    score = data_loader.COLLUSION_SCORES.get(employee_id, 0)
    graph = data_loader.COLLUSION_GRAPHS.get(employee_id, {"nodes": [], "links": []})
    return {"employee_id": employee_id, "collusion_score": score, "graph": graph}


@router.post("/api/score-text")
def score_text(req: ScoreTextRequest):
    """
    Engine 4 NLP: Evaluates manager override note for vagueness, urgency, and evasion phrases.
    """
    if not req.text or not req.text.strip():
        return {
            "language_score": 0,
            "vagueness": 0,
            "urgency": 0,
            "status": "empty",
            "message": "Empty justification text provided.",
        }

    try:
        nlp_results = engine4.score_justification_text(req.text)
        return {
            **nlp_results,
            "status": "connected",
            "message": "Language Risk Scanner evaluated successfully.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine 4 scoring failed: {str(e)}")


@router.post("/api/evaluate")
def evaluate_live_log(req: EvaluateLogRequest):
    """
    Real-Time Evaluation Endpoint: Runs Engine 1, 2, 3, and 4 on incoming log payloads
    and returns fused Dynamic Insider Threat Score (DITS).
    """
    # 1. Engine 1: Sequence Score
    chain_score = engine1.score_sequence(req.log_actions)

    # 2. Engine 2: Avoidance / Access Void Score
    avoidance_score = float(req.access_void_score or 0.0)

    # 3. Engine 3: Collusion Score
    collusion_events = req.co_access_events or []
    collusion_score = engine3.calculate_collusion_score(req.employee_id, collusion_events)

    # 4. Engine 4: NLP Language Score
    language_score = None
    nlp_details = {}
    if req.override_note and req.override_note.strip():
        nlp_details = engine4.score_justification_text(req.override_note)
        language_score = nlp_details.get("language_score", 0)

    # 5. Dynamic Insider Threat Score (DITS) Fusion
    dits_score = compute_dits_score(chain_score, avoidance_score, collusion_score, language_score)

    risk_level = "Normal"
    if dits_score >= 80:
        risk_level = "Critical"
    elif dits_score >= 60:
        risk_level = "High"
    elif dits_score >= 35:
        risk_level = "Medium"
    elif dits_score > 15:
        risk_level = "Low"

    return {
        "employee_id": req.employee_id,
        "dits_score": dits_score,
        "risk_level": risk_level,
        "engine_scores": {
            "engine1_chain_score": chain_score,
            "engine2_avoidance_score": avoidance_score,
            "engine3_collusion_score": collusion_score,
            "engine4_language_score": language_score,
        },
        "nlp_details": nlp_details,
    }
