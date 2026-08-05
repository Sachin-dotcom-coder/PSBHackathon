"""
PHANTOM Executive AI Report Formatter
=====================================
Generates standardized Markdown AI Investigation Reports for SOC Analysts.
Supports both direct template formatting and Gemini LLM output structure.
"""

from typing import Dict, Any


def format_markdown_report(data: Dict[str, Any]) -> str:
    """
    Formats structured employee input into an executive-grade Markdown investigation report.
    """
    emp = data.get("employee", {})
    scores = data.get("scores", {})
    timeline = data.get("timeline", {})
    lang = data.get("language", {})
    findings = data.get("findings", [])

    name = emp.get("name", "Employee")
    eid = emp.get("employee_id", "EMP")
    role = emp.get("role", "Staff")
    branch = emp.get("branch", "Main")
    dits = scores.get("DITS", 0)
    risk = scores.get("risk_level", "Normal").upper()

    e1 = scores.get("engine1_chain", 0)
    e2 = scores.get("engine2_avoidance", 0)
    e3 = scores.get("engine3_collusion", 0)
    e4 = scores.get("engine4_language", 0)

    audit_drop = timeline.get("audit_drop", "0%")
    comp_absent = timeline.get("compliance_absent_days", 0)
    override_absent = timeline.get("override_absent_days", 0)
    trend = timeline.get("trend", "Gradual Avoidance")

    auth = lang.get("authority", 0)
    urgency = lang.get("urgency", 0)
    bypass = lang.get("policy_bypass", 0)
    reuse = lang.get("template_reuse", 0)

    # Narrative generation based on risk tier
    if dits >= 75:
        summary_text = (
            f"{name} ({eid}) demonstrated a significant increase in insider threat indicators over the observation period. "
            f"While core operational activities remained high, critical compliance and audit oversight modules exhibited "
            f"a sharp decline. Combined with language evasion signatures in override notes, the Dynamic Insider Threat Score "
            f"(DITS = {dits}) places this profile in the **{risk}** tier requiring immediate SOC review."
        )
        behaviour_text = (
            f"- Audit Reports usage dropped by **{audit_drop}** relative to baseline.\n"
            f"- Compliance Dashboard has not been accessed for **{comp_absent} consecutive days**.\n"
            f"- Override Logs exhibit zero activity for **{override_absent} days**.\n"
            f"- Primary transaction approvals (e.g. Loan Approvals / Search) remained high.\n\n"
            f"*Assessment:* This pattern indicates **selective system avoidance** — avoiding oversight systems while maintaining normal work volume."
        )
        recommendations = (
            "1. **Audit Override History:** Immediately review manager override notes submitted during the last 30 days.\n"
            "2. **Verify Financial Transactions:** Cross-reference recent loan approvals and large cash withdrawals against core banking logs.\n"
            "3. **Conduct Manager Interview:** Interview the reporting supervisor regarding verbal instructions and policy waivers.\n"
            "4. **Enhance Real-Time Telemetry:** Place account on heightened monitoring for the next cycle.\n"
            "5. **Preserve Forensic Logs:** Archive session telemetry and co-access graph events for compliance audit."
        )
    elif dits >= 40:
        summary_text = (
            f"{name} ({eid}) showed moderate behavioral deviations in oversight module usage. "
            f"The overall DITS score is **{dits} ({risk})**, reflecting mild peer cohort variance that warrants routine monitoring."
        )
        behaviour_text = (
            f"- Audit Reports access declined by **{audit_drop}**.\n"
            f"- Compliance Dashboard absent for **{comp_absent} days**.\n"
            f"- Primary activity remains steady.\n\n"
            f"*Assessment:* Moderate deviation from peer cohort average. Monitor for further trend progression."
        )
        recommendations = (
            "1. **Routine Monitoring:** Schedule automated follow-up scan in 14 days.\n"
            "2. **Peer Cohort Baseline Check:** Re-evaluate activity against department averages.\n"
            "3. **Verify Compliance Submissions:** Confirm monthly compliance checklist submission status."
        )
    else:
        summary_text = (
            f"{name} ({eid}) maintains a stable behavioral profile within normal operational parameters. "
            f"DITS score is **{dits} ({risk})**. No elevated threat signals detected."
        )
        behaviour_text = (
            f"- Audit and compliance access levels align with peer cohort averages.\n"
            f"- Standard operational activity recorded across all modules."
        )
        recommendations = (
            "1. **No Action Required:** Maintain standard security posture.\n"
            "2. **Standard Audit Cycle:** Next routine review scheduled automatically."
        )

    markdown = f"""# Executive Summary

{summary_text}

---

# Employee Overview

| Attribute | Value |
|---|---|
| **Employee Name** | {name} |
| **Employee ID** | {eid} |
| **Role** | {role} |
| **Branch** | {branch} |
| **DITS Score** | **{dits}/100** ({risk}) |
| **Observation Window** | {timeline.get("observation_period", "90 Days")} |

---

# Behavioural Findings

{behaviour_text}

---

# Language Findings

- **Authority References Score:** {auth}/100
- **Policy Bypass Score:** {bypass}/100
- **Urgency Language Score:** {urgency}/100
- **Template Reuse Score:** {reuse}/100

*Linguistic Signature:* Override notes contain phrases indicating reliance on verbal approval, supervisor insistence, or urgent exceptions rather than documented business justifications.

---

# Timeline Summary

- **Phase 1 (Days 1–30):** Baseline operational activity across primary and compliance modules.
- **Phase 2 (Days 31–60):** First reduction in Audit Reports access noticed (**{trend}**).
- **Phase 3 (Days 61–90):** Compliance Dashboard and Override Logs reach zero activity while primary transaction approvals remain active.

---

# Engine Contributions

| Engine | Risk Domain | Score | Risk Contribution |
|---|---|---|---|
| **Engine 1** | Temporal Causal Chain | {e1}/100 | Sequence Anomaly |
| **Engine 2** | Access Void Profiler | {e2}/100 | Negative Access / Avoidance |
| **Engine 3** | Collusion Graph | {e3}/100 | Co-Access Network Risk |
| **Engine 4** | NLP Justification Scanner | {e4 if e4 is not None else 0}/100 | Linguistic Threat Score |

---

# Analyst Recommendations

{recommendations}
"""
    return markdown.strip()
