"""
PHANTOM AI Investigation Report Generator
=========================================
Orchestrates schema construction, Gemini API calls, caching, and report metadata.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List

from config import DATA_DIR
from ai.schemas.employee_report_schema import build_report_input_schema
from ai.services.gemini_service import generate_report_with_gemini

REPORTS_CACHE_DIR = DATA_DIR / "reports"


def ensure_cache_dir():
    os.makedirs(REPORTS_CACHE_DIR, exist_ok=True)


def get_cached_report_path(employee_id: str) -> str:
    return str(REPORTS_CACHE_DIR / f"{employee_id}.json")


def get_or_generate_report(employee_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Returns cached report or generates a new executive investigation report for an employee.
    """
    ensure_cache_dir()
    cache_path = get_cached_report_path(employee_id)
    
    # 1. Return cached report if available and force_refresh is False
    if not force_refresh and os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
                if cached_data.get("report"):
                    return cached_data
        except Exception:
            pass

    # 2. Build structured input schema
    schema_input = build_report_input_schema(employee_id)
    
    # 3. Call Gemini API / Formatter
    markdown_report, used_gemini = generate_report_with_gemini(schema_input)

    emp = schema_input.get("employee", {})
    scores = schema_input.get("scores", {})
    findings: List[str] = schema_input.get("findings", [])
    
    current_date = datetime.now().strftime("%d %B %Y")
    
    response_payload: Dict[str, Any] = {
        "employee_id": employee_id,
        "name": emp.get("name", employee_id),
        "role": emp.get("role", ""),
        "branch": emp.get("branch", ""),
        "dits_score": scores.get("DITS", 0),
        "risk_level": scores.get("risk_level", "Normal"),
        "report": markdown_report,
        "generated_at": current_date,
        "confidence": 96 if scores.get("DITS", 0) > 50 else 92,
        "version": "v1.0",
        "used_live_gemini": used_gemini,
        "key_evidence": findings,
        "schema_input": schema_input,
    }

    # 4. Save to cache disk
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(response_payload, f, indent=2)
    except Exception as e:
        print(f"[Report Cache Warning] Failed to write cache for {employee_id}: {e}")

    return response_payload
