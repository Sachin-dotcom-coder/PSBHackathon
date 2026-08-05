"""
PHANTOM Employee Data Router
============================
Provides endpoints for employee leaderboard, individual details, and 90-day timelines.
"""

from fastapi import APIRouter, HTTPException
import services.data_loader as data_loader
from services.fusion import build_employee_detail, build_generic_timeline

router = APIRouter(tags=["Employees"])


@router.get("/api/leaderboard")
def get_leaderboard():
    """Returns all employee records enriched with multi-engine scores, sorted by risk score descending."""
    sorted_preds = sorted(
        data_loader.ALL_PREDICTIONS,
        key=lambda p: float(p.get("access_void_score", 0)),
        reverse=True,
    )
    return [build_employee_detail(p) for p in sorted_preds]


@router.get("/api/employees/{employee_id}")
def get_employee(employee_id: str):
    """Returns detailed profile and multi-engine scores for a single employee."""
    pred = next((p for p in data_loader.ALL_PREDICTIONS if p["employee_id"] == employee_id), None)
    if pred is None:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    return build_employee_detail(pred)


@router.get("/api/employee/{employee_id}/timeline")
def get_timeline(employee_id: str):
    """Returns activity timeline data for an employee (from JSON cache or generic builder)."""
    if employee_id in data_loader.TIMELINE_CACHE:
        return data_loader.TIMELINE_CACHE[employee_id]
    
    ds_df = data_loader.DAILY_SCORES_DF
    if not ds_df.empty and "employee_id" in ds_df.columns:
        if employee_id in ds_df["employee_id"].values:
            return build_generic_timeline(employee_id)
            
    raise HTTPException(status_code=404, detail=f"Timeline not found for employee {employee_id}")
