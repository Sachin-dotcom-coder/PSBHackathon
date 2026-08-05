"""
PHANTOM AI Investigation Report Schema Builder
================================================
Constructs structured JSON objects from Engine 1-4 outputs, employee metadata,
and behavioral timeline logs to pass to Gemini API.
"""

from typing import Dict, Any, List
import services.data_loader as data_loader
from services.fusion import build_employee_detail, build_generic_timeline


def build_report_input_schema(employee_id: str) -> Dict[str, Any]:
    """
    Gathers structured data for an employee from all four engines and timeline artifacts.
    """
    eid = str(employee_id)
    
    # 1. Fetch prediction & employee detail object
    pred = next((p for p in data_loader.ALL_PREDICTIONS if p["employee_id"] == eid), {"employee_id": eid})
    detail = build_employee_detail(pred)
    
    # 2. Fetch timeline details
    timeline_obj = data_loader.TIMELINE_CACHE.get(eid)
    if not timeline_obj:
        timeline_obj = build_generic_timeline(eid)
        
    timeline_days = timeline_obj.get("timeline", [])
    
    # Calculate audit drop % and absent days
    audit_zero_count = sum(1 for d in timeline_days if d.get("audit", 0) == 0)
    compliance_zero_count = sum(1 for d in timeline_days if d.get("compliance", 0) == 0)
    override_zero_count = sum(1 for d in timeline_days if d.get("override", 0) == 0)
    
    initial_audit = timeline_days[0].get("audit", 0) if timeline_days else 0
    recent_audit = timeline_days[-1].get("audit", 0) if timeline_days else 0
    
    if initial_audit > 0:
        audit_drop_pct = int(round(max(0, (initial_audit - recent_audit) / initial_audit * 100)))
    else:
        audit_drop_pct = 100 if audit_zero_count > 15 else 0

    # 3. Fetch Engine 4 NLP details
    nlp_details = pred.get("nlp_details", {})
    if not nlp_details and "nlp_details" in detail:
        nlp_details = detail["nlp_details"]
        
    category_scores = nlp_details.get("category_scores", {})
    
    authority_score = category_scores.get("Authority", nlp_details.get("authority", 0))
    urgency_score = category_scores.get("Urgency", nlp_details.get("urgency", 0))
    policy_bypass_score = category_scores.get("Policy Bypass", nlp_details.get("policy_bypass", 0))
    vagueness_score = category_scores.get("Vagueness", nlp_details.get("vagueness", 0))
    responsibility_shift_score = category_scores.get("Responsibility Shift", nlp_details.get("responsibility_shift", 0))
    template_reuse_score = nlp_details.get("template_reuse", 0)

    # 4. Construct Key Findings
    findings: List[str] = []
    if audit_zero_count > 0:
        findings.append(f"Audit Reports absent for {audit_zero_count} days")
    if compliance_zero_count > 0:
        findings.append(f"Compliance Dashboard usage reduced by {min(100, compliance_zero_count * 3)}%")
    if override_zero_count > 0:
        findings.append(f"Override Logs not accessed for {override_zero_count} days")
    if detail.get("reasons"):
        for r in detail["reasons"]:
            if r not in findings:
                findings.append(r)
    if policy_bypass_score >= 50 or authority_score >= 50:
        findings.append("Repeated use of policy bypass and authority language in overrides")
    if not findings:
        findings.append("Minor deviation from peer cohort baseline — monitoring recommended")

    tenure_years = detail.get("experience_years")
    tenure_str = f"{Math_floor(tenure_years)} Years" if tenure_years else "Unknown"

    return {
        "employee": {
            "name": detail.get("name", eid),
            "employee_id": eid,
            "role": detail.get("role", "Staff"),
            "branch": detail.get("branch", "Main Branch"),
            "department": detail.get("department", "Operations"),
            "tenure": tenure_str,
        },
        "scores": {
            "DITS": detail.get("dits_score", 0),
            "risk_level": detail.get("risk", "Normal"),
            "engine1_chain": detail.get("chain_score", 0),
            "engine2_avoidance": detail.get("access_void_score", 0),
            "engine3_collusion": detail.get("collusion_score", 0),
            "engine4_language": detail.get("language_score", 0),
        },
        "timeline": {
            "observation_period": f"{len(timeline_days)} Days",
            "audit_drop": f"{audit_drop_pct}%",
            "compliance_absent_days": compliance_zero_count,
            "override_absent_days": override_zero_count,
            "trend": timeline_obj.get("trend", "Gradual Avoidance"),
        },
        "language": {
            "authority": authority_score,
            "urgency": urgency_score,
            "policy_bypass": policy_bypass_score,
            "vagueness": vagueness_score,
            "responsibility_shift": responsibility_shift_score,
            "template_reuse": template_reuse_score,
        },
        "findings": findings,
    }


def Math_floor(val: float) -> int:
    return int(val) if val is not None else 0
