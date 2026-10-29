# PHANTOM — AI Overview of Employees Work & Executive Investigation System Guide

## 📌 Document Overview

This document provides a comprehensive technical manual for the **AI Overview of Employees Work** system within the **PHANTOM Insider Threat & Anomaly Detection Platform**.

It details the end-to-end architecture of data fusion across Engine 1–4, schema construction, LLM orchestration with Google Gemini API, fallback deterministic formatting, caching strategy, and executive investigation report generation for Security Operations Center (SOC) analysts.

---

## ⚙️ Purpose & Need for AI Overview

In modern banking operations, analyzing potential insider threats requires sifting through tens of thousands of telemetry logs across multiple systems (core banking transactions, compliance dashboards, manager overrides, audit exports, and peer communication graphs). 

Raw risk scores alone (such as an anomaly index or neural net activation) fail to provide SOC analysts with actionable context. **The AI Overview system solves this by:**
1. **Translating Multi-Dimensional Risk**: Synthesizing mathematical signals from 4 distinct detection engines into a coherent human-readable narrative.
2. **Identifying Behavioral Trade-Offs**: Highlighting "selective avoidance" patterns (e.g., maintaining high primary transaction volume while completely ceasing audit log reviews).
3. **Providing Evidence-Backed Guidance**: Generating concrete investigation steps, log queries, and interview recommendations for analysts.

---

## 🛠️ System Architecture & End-to-End Data Flow

The system operates as an executive reporting pipeline integrated into the PHANTOM backend service:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHANTOM Detection Stack                         │
│  Engine 1 (Sequence) | Engine 2 (Access Void) | Engine 3 (Collusion)  │
│  Engine 4 (NLP Justification) | 90-Day Telemetry Logs | Employee Meta   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Report Input Schema Builder                          │
│          (`backend/ai/schemas/employee_report_schema.py`)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Report Orchestration Engine                       │
│             (`backend/ai/reports/report_generator.py`)                 │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
            (Primary Track)                  (Fallback Track)
                    ▼                                ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│     Google Gemini LLM API     │  │   Executive Local Report Formatter│
│ (`ai/services/gemini_service`)│  │  (`backend/ai/reports/formatter`) │
└───────────────┬───────────────┘  └─────────────────┬─────────────────┘
                │                                    │
                └───────────────────┬────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Report Cache Disk Layer                        │
│                   (`data/reports/{employee_id}.json`)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        REST API & Frontend UI                          │
│     `GET /api/employee/:id/report` -> `EmployeeReportView.tsx`         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Schema Builder & Data Fusion (`employee_report_schema.py`)

Before calling the AI reporting engine, PHANTOM aggregates structured metadata, multi-engine scores, timeline telemetry, and NLP justification signals into a single structured payload via `build_report_input_schema(employee_id)`.

### Input Schema Structure

```json
{
  "employee": {
    "name": "Rajesh Kumar",
    "employee_id": "EMP001",
    "role": "Senior Branch Manager",
    "branch": "Mumbai Main Branch",
    "department": "Retail Banking",
    "tenure": "8 Years"
  },
  "scores": {
    "DITS": 82,
    "risk_level": "Critical",
    "engine1_chain": 78,
    "engine2_avoidance": 85,
    "engine3_collusion": 65,
    "engine4_language": 80
  },
  "timeline": {
    "observation_period": "90 Days",
    "audit_drop": "100%",
    "compliance_absent_days": 28,
    "override_absent_days": 15,
    "trend": "Gradual Avoidance"
  },
  "language": {
    "authority": 85,
    "urgency": 70,
    "policy_bypass": 90,
    "vagueness": 40,
    "responsibility_shift": 60,
    "template_reuse": 75
  },
  "findings": [
    "Audit Reports absent for 28 days",
    "Compliance Dashboard usage reduced by 84%",
    "Repeated use of policy bypass and authority language in overrides"
  ]
}
```

---

## 🔬 LLM Orchestration & Fallback Engine

### 1. Primary Track: Google Gemini API Integration (`gemini_service.py`)
When active, PHANTOM formats the schema into a specialized SOC Analyst prompt sent to Gemini:

* **Persona**: Senior Insider Threat SOC Investigator.
* **Tone**: Objective, evidence-backed, authoritative, professional.
* **Instruction Rules**:
  * Focus heavily on negative access anomalies (dropping compliance checks).
  * Synthesize Engine 1–4 contributions without mentioning raw backend variable names.
  * Structure output strictly according to executive markdown headers.

### 2. Fallback Track: Local Report Formatter (`report_formatter.py`)
If internet connectivity is unavailable or Gemini API keys are unconfigured, PHANTOM seamlessly fails over to the deterministic `format_markdown_report()` engine. This guarantees **100% uptime and zero operational interruption**.

---

## 📄 Structure of the AI Overview Report

The generated AI Overview report adheres to a standardized executive format structured into 7 core sections:

```markdown
# Executive Summary
[High-level synthesis of employee risk profile, DITS score, and threat tier classification]

---

# Employee Overview
| Attribute | Value |
| **Employee Name** | [Name] |
| **Employee ID** | [ID] |
| **Role** | [Role] |
| **Branch** | [Branch] |
| **DITS Score** | **[Score]/100** ([Tier]) |
| **Observation Window** | 90 Days |

---

# Behavioural Findings
[Detailed evaluation of module access drop percentages, compliance absence, and primary work volume]

---

# Language Findings
- **Authority References Score:** [Score]/100
- **Policy Bypass Score:** [Score]/100
- **Urgency Language Score:** [Score]/100
- **Template Reuse Score:** [Score]/100

---

# Timeline Summary
- **Phase 1 (Days 1–30):** Baseline operational activity across primary and compliance modules.
- **Phase 2 (Days 31–60):** First reduction in Audit Reports access noticed.
- **Phase 3 (Days 61–90):** Compliance Dashboard and Override Logs reach zero activity while primary transaction approvals remain active.

---

# Engine Contributions
| Engine | Risk Domain | Score | Risk Contribution |
| **Engine 1** | Temporal Causal Chain | [E1] | Sequence Anomaly |
| **Engine 2** | Access Void Profiler | [E2] | Negative Access / Avoidance |
| **Engine 3** | Collusion Graph | [E3] | Co-Access Network Risk |
| **Engine 4** | NLP Justification Scanner | [E4] | Linguistic Threat Score |

---

# Analyst Recommendations
[Actionable 5-step SOC investigation protocol]
```

---

## 💾 Caching & Performance Optimization

To prevent unnecessary API latency and manage API costs, reports are automatically cached on disk at `data/reports/{employee_id}.json`.

* **Read Behavior**: When an analyst requests an employee report, PHANTOM checks for a pre-generated cached JSON file.
* **Force Refresh**: The API supports a `force_refresh=true` flag to invalidate disk cache and regenerate a fresh report.
* **Confidence Rating**: High-risk profiles (DITS $> 50$) report a 96% AI confidence score based on multi-engine alignment.

---

## 💻 API & Frontend UI Integration

### 1. REST Endpoint (`backend/b.py`)
```http
GET /api/employee/{employee_id}/report
```
**Response JSON**:
```json
{
  "employee_id": "EMP001",
  "name": "Rajesh Kumar",
  "role": "Senior Manager",
  "dits_score": 82,
  "risk_level": "Critical",
  "report": "# Executive Summary\n...",
  "generated_at": "06 August 2026",
  "confidence": 96,
  "used_live_gemini": true,
  "key_evidence": [ ... ]
}
```

### 2. Frontend UI Integration
In the React frontend, the AI Overview is rendered within the Employee Profile & Investigation views using Markdown syntax highlighting, action buttons for copying reports, and evidence tags.

---

## 🔗 Related Documentation
- [Engine 4 Guide](file:///c:/Users/visha/OneDrive/Desktop/PHANTOM/PSBHackathon/engine4_guide.md)
- [ML Pipeline Guide (Engine 2)](file:///c:/Users/visha/OneDrive/Desktop/PHANTOM/PSBHackathon/ml_pipeline_guide.md)
