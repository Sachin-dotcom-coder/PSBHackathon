"""
PHANTOM AI Investigation Reports Router
========================================
Exposes API endpoints for generating and fetching Gemini AI Investigation Reports.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai.reports.report_generator import get_or_generate_report

router = APIRouter(tags=["AI Reports"])


class ReportRequest(BaseModel):
    employee_id: str
    force_refresh: Optional[bool] = False


@router.post("/api/report/investigation")
def generate_investigation_report(req: ReportRequest):
    """
    Generates or fetches cached AI Investigation Report for an employee.
    """
    if not req.employee_id or not req.employee_id.strip():
        raise HTTPException(status_code=400, detail="Employee ID is required.")
        
    try:
        result = get_or_generate_report(req.employee_id.strip(), force_refresh=bool(req.force_refresh))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI Investigation Report: {str(e)}")


@router.get("/api/report/investigation/{employee_id}")
def get_investigation_report(employee_id: str, force_refresh: Optional[bool] = False):
    """
    GET endpoint for fetching investigation report for an employee.
    """
    if not employee_id or not employee_id.strip():
        raise HTTPException(status_code=400, detail="Employee ID is required.")
        
    try:
        result = get_or_generate_report(employee_id.strip(), force_refresh=force_refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch AI Investigation Report: {str(e)}")
