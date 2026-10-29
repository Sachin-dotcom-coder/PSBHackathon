# PHANTOM SOC — PPT Revision & Slide Update Guide

> **Hackathon Requirement Compliance**: 
> Strict maximum **4-slide presentation** (excluding Title Slide) matching the official PSB Hackathon presentation guidelines.

---

## 📌 Executive Summary of Required Slide Changes

Your original presentation had **6 slides**. To comply with the hackathon's strict 4-slide limit while accurately reflecting the **current implementation** of the PHANTOM codebase, you must consolidate and update your slides as follows:

| Original PPT (6 Slides) | New PPT Structure (4 Slides + Title) | Major Updates Needed |
| :--- | :--- | :--- |
| **Slide 1**: Title Slide | **Title Slide** *(Excluded from count)* | Update subtitle to highlight real-time FastAPI + React 19 SOC implementation & Google Gemini integration. |
| **Slide 2**: The Insider Threat... | **Slide 1: Problem & Solution** | Merges problem statement with PHANTOM's negative access & multi-AI solution approach. |
| **Slide 3**: System Architecture | **Slide 2: Technology & Innovation** | Consolidates architecture, 4 ML/NLP engines, Python NetworkX graph, Isolation Forest & Google Gemini 2.5/1.5 Flash. |
| **Slide 4**: Four Engines & Stack | *(Merged into Slide 2)* | Replaced theoretical models (PyTorch Geo / IndicBERT) with exact working algorithms (Isolation Forest, N-gram Causal Chain, Bipartite Co-Access Graph, Gemini API). |
| **Slide 5**: Enterprise-Ready | **Slide 3: Scalability & Deployment** | Updates streaming architecture (FastAPI in-memory cache, sub-50ms API response), CBS integration (Kafka), and DPDP compliance. |
| **Slide 6**: Team & Roadmap | **Slide 4: Team & Execution Plan** | Updates team roles according to actual code contributions and shifts roadmap to current Live SOC state. |

---

## 📜 Detailed Slide-by-Slide Content & Design Guide

---

### 🎨 TITLE SLIDE (Optional / Excluded from 4-slide limit)

#### 📝 Slide Header
**PHANTOM**  
*Privileged-access Holistic Anomaly & Multi-party Threat Operations Network*

#### 👥 Team Details
- **Team Members**: Sachin · Vishal · Shresth
- **Institution**: SVNIT Surat (B.Tech Computer Science & Engineering)
- **Track**: Insider Threat Detection (PSB Hackathon Series 2026 — Bank of Baroda × IIT Gandhinagar)

---

### 📊 SLIDE 1: Problem & Solution

> **Guideline Requirements**:
> - What problem are you solving?
> - How does your proposed solution address it?

#### 🎯 Slide Layout & Content Structure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 1: THE PRE-CRIME INSIDER THREAT & PHANTOM SOLUTION                               │
├──────────────────────────────────────────────────┬─────────────────────────────────────┤
│ 🚨 THE PROBLEM: UNSEEN PRE-CRIME SIGNALS         │ 🛡️ THE PHANTOM SOLUTION             │
│                                                  │                                     │
│ • Stat 1: ₹36,014 Cr Indian banking fraud losses  │ • Dynamic Insider Threat Score     │
│   (RBI FY25).                                    │   (DITS): Fuses 4 specialized AI    │
│ • Stat 2: 287 Days average time to detect &       │   engines into a 0-100 real-time    │
│   contain malicious insider breaches (IBM 2025). │   employee risk metric.             │
│ • Core Blindspot: Traditional SIEM/UEBA tools    │ • Negative Access Profiling:        │
│   only monitor active anomalous actions.         │   Detects strategic audit evasion &  │
│   They NEVER ask: "What is an employee           │   avoidance 2–5 days before fraud.  │
│   STRATEGICALLY CHOOSING NOT TO DO?"              │ • Live SOC Dashboard: Real-time     │
│ • Real Banking Fraud Cases:                      │   investigation, 90-day timelines & │
│   - New India Co-op Bank: ₹122 Cr GM embezzlement │   automated Gemini SOC reports.     │
│   - IndusInd Bank: ₹1,960 Cr accounting probe.   │                                     │
└──────────────────────────────────────────────────┴─────────────────────────────────────┘
```

#### ✏️ Specific Changes to Make from Original PPT:
1. **Combine Original Slide 2 (Problem) with Solution Overview**: Instead of keeping problem and solution in separate slides, dedicate the left half to the problem (banking statistics & the strategic avoidance blindspot) and right half to PHANTOM's solution.
2. **Clarify the Core Innovation**: Explicitly contrast traditional UEBA ("What did they do?") with PHANTOM's Negative Access Detection ("What did they strategically avoid doing?").

---

### ⚙️ SLIDE 2: Technology & Innovation

> **Guideline Requirements**:
> - Technology stack and architecture
> - AI/ML models, cybersecurity techniques, APIs, or other technologies used
> - Key innovation and differentiation from existing solutions

#### 🎯 Slide Layout & Content Structure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 2: SYSTEM ARCHITECTURE & MULTI-AI DETECTION ENGINES                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📐 4-ENGINE PIPELINE ARCHITECTURE                                                      │
│                                                                                        │
│ ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────────────┐ │
│ │ E1: TEMPORAL CHAIN    │  │ E2: NEGATIVE ACCESS   │  │ E3: COLLUSION GRAPH         │ │
│ │ N-Gram Sequence       │  │ Isolation Forest      │  │ Bipartite NetworkX Graph    │ │
│ │ Matches pre-crime     │  │ Evaluates 37 features │  │ Sliding window co-access    │ │
│ │ exfiltration patterns │  │ across 43 cohorts     │  │ overlap on sensitive assets │ │
│ └──────────┬────────────┘  └──────────┬────────────┘  └──────────────┬──────────────┘ │
│            │                          │                              │                │
│            └──────────────────────────┼──────────────────────────────┘                │
│                                       ▼                                               │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ E4: BEHAVIORAL NLP & GEMINI AI REPORTING ENGINE                                    │ │
│ │ Scans override notes for vagueness/urgency + Google Gemini 2.5 Flash API report    │ │
│ └─────────────────────────────────────┬──────────────────────────────────────────────┘ │
│                                       ▼                                               │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ BAYESIAN DITS FUSION ENGINE: DITS = 0.30(E1) + 0.30(E2) + 0.20(E3) + 0.20(E4)       │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 💡 KEY INNOVATIONS & TECH STACK                                                        │
│ • Tech Stack: Python FastAPI backend, React 19 + Vite frontend, NetworkX, Scikit-Learn│
│ • Datasets: 977,000+ real-time telemetry events, 4,500 daily feature matrices         │
│ • Innovation: First SOC engine incorporating Negative Access Voids + Gemini AI reports │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### ✏️ Specific Changes to Make from Original PPT:
1. **Update Engine Technical Descriptions to Match Real Codebase**:
   - **E1 (Temporal Causal Chain)**: Replace generic "Transformer + GNN" text with **N-gram Sequence Matching Algorithm** (tracks exact sequences like `LOOKUP → BALANCE_CHECK → TRANSACTION_HISTORY → REPORT_EXPORT`).
   - **E2 (Negative Access Profiler)**: Highlight **Isolation Forest ML Model** trained on 4,500 daily feature matrices across 37 engineered features and 43 peer cohorts.
   - **E3 (Collusion Intelligence Graph)**: Update to **Bipartite NetworkX Graph Engine** analyzing co-access logs across 50 employees in a sliding 120-minute window.
   - **E4 (Behavioral NLP Engine)**: Update to **Rule/Heuristic NLP Scanner + Google Gemini 2.5 Flash API** for automated SOC investigation report generation (`gemini_service.py`).
2. **Update Dynamic Trust Fusion Formula**: Show the exact mathematical fusion used in `backend/services/fusion.py`:
   $$\text{DITS} = 0.30 \times \text{E1} + 0.30 \times \text{E2} + 0.20 \times \text{E3} + 0.20 \times \text{E4}$$

---

### 🚀 SLIDE 3: Scalability & Deployment

> **Guideline Requirements**:
> - Feasibility of implementation in the banking ecosystem
> - Scalability, security, integration with existing systems, and expected impact

#### 🎯 Slide Layout & Content Structure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 3: BANKING INTEGRATION, SCALABILITY & COMPLIANCE                                │
├──────────────────────────────┬─────────────────────────────┬───────────────────────────┤
│ 🔌 BANKING ECOSYSTEM HOOKS   │ ⚡ HIGH-PERFORMANCE SCALE   │ 🔒 PRIVACY & COMPLIANCE   │
│                              │                             │                           │
│ • CBS / Finacle Hook:        │ • FastAPI In-Memory Engine: │ • DPDP Act 2023 Compliant:│
│   Non-intrusive Kafka        │   Pre-cached startup        │   Zero raw PII stored;    │
│   streaming ingestion; zero   │   indexing handles 977k+    │   feature vector          │
│   changes to core DBs.       │   logs with <50ms endpoint  │   anonymization.          │
│ • IAM & Active Directory:    │   latency.                  │ • On-Premises Ready:      │
│   Automated user lifecycle   │ • Modular REST Microservices│   Local ML inference inside│
│   syncing via SCIM 2.0.      │   with asynchronous pipeline│   bank firewall; API key  │
│ • SIEM Webhook Integration:  │   processing.               │   fallback support.       │
│   Native Splunk & QRadar     │ • Interactive D3 Visualizer:│ • Four-Eyes Principle:    │
│   alert dispatching.         │   SVG bipartite graph rendering│  Multi-party SOC verification│
├──────────────────────────────┴─────────────────────────────┴───────────────────────────┤
│ 📈 TARGET IMPACT METRICS                                                               │
│  ↓ 70% Mean Time to Detect (MTTR)  │  0 → 5+ Days Pre-Crime Detection Window             │
│  8,200+ Branches Scalability Target│  < 0.3% Target False-Positive Rate                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### ✏️ Specific Changes to Make from Original PPT:
1. **Emphasize Working FastAPI & Microservice Performance**: Highlight how `backend/main.py` and `b.py` load 977,000+ access logs and 50 employee profiles at startup, serving sub-50ms API responses to the frontend.
2. **Keep Core Banking Metrics**: Maintain the strong Bank of Baroda impact metrics (70% reduction in MTTR, 5+ days pre-crime window, DPDP Act 2023 compliance).

---

### 👥 SLIDE 4: Team & Execution Plan

> **Guideline Requirements**:
> - Team members and their roles
> - Relevant expertise
> - Development roadmap and next milestones

#### 🎯 Slide Layout & Content Structure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SLIDE 4: BUILD-READY TEAM & PROJECT ROADMAP                                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 👨‍💻 TEAM MEMBERS & CORE RESPONSIBILITIES                                               │
│                                                                                        │
│  👤 SACHIN                       👤 VISHAL                      👤 SHRESTH              │
│  ML & Graph Systems Lead         NLP & Data Pipeline Lead       Systems & Frontend Lead │
│  • Engine 1: N-Gram Sequence     • Engine 2: Isolation Forest   • FastAPI Backend & REST│
│    Causal Chain Scorer             Negative Access Profiler       Endpoints (b.py)      │
│  • Engine 3: NetworkX Bipartite  • Engine 4: Justification NLP  • DITS Bayesian Fusion │
│    Collusion Graph Engine          & Telemetry Data Pipeline      • Live React 19 / Vite  │
│  • Synthetic Dataset Design      • Feature Engineering (37 feat)  SOC Dashboard & D3 Viz │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🗺️ ROADMAP & PROJECT MILESTONES                                                        │
│                                                                                        │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│ │ PHASE 1 (Done)   │  │ PHASE 2 (Done)   │  │ PHASE 3 (Done)   │  │ PHASE 4 (CURRENT)│ │
│ │ Data Pipeline &  │  │ ML Engine Build  │  │ DITS Fusion &    │  │ Live SOC          │ │
│ │ 977k Event Log   │  │ Train Isolation  │  │ FastAPI Backend  │  │ Dashboard &       │ │
│ │ Telemetry Engine │  │ Forest & Graphs  │  │ API Integration  │  │ Gemini AI Reports │ │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### ✏️ Specific Changes to Make from Original PPT:
1. **Update Team Responsibilities to Match Codebase**:
   - **Sachin**: ML & Graph Systems Lead (Engine 1 N-Gram Chain & Engine 3 NetworkX Collusion Graph).
   - **Vishal**: NLP & Data Pipeline Lead (Engine 2 Isolation Forest, 37 engineered features & Engine 4 NLP Scanner).
   - **Shresth**: Systems & Frontend Lead (FastAPI Backend, DITS Multi-engine Fusion Engine, Live React 19/Vite SOC UI & D3 Graph Viz).
2. **Update Roadmap to Reflect Current Status**: Clearly indicate that Phases 1–3 are fully complete and Phase 4 (Live SOC Dashboard & Gemini Report Generation) is currently operational and ready for presentation/demo.

---

## 🔍 Technical Cheat Sheet for Slide Preparation

Use these exact figures and technical details when answering judges' questions or updating slide text:

- **Total Logs Processed**: 977,000+ raw access log events (`data/raw/access_logs.csv`)
- **Employees Monitored**: 50 banking employee profiles across 43 peer cohorts (`data/processed/peer_cohorts.csv`)
- **ML Features Engineered**: 37 behavioral features per employee per day (`data/processed/feature_matrix.csv`)
- **Key Algorithms**:
  - *Engine 1*: N-Gram Causal Sequence Matching (detecting `LOOKUP → BALANCE → HIST → REPORT` sequences)
  - *Engine 2*: Isolation Forest anomaly detection for Negative Access Voids
  - *Engine 3*: NetworkX Bipartite Graph co-access analysis within 120-minute sliding windows
  - *Engine 4 & Reporting*: NLP keyword/heuristic scanner + **Google Gemini 2.5 Flash API** REST calls
- **Backend Tech**: Python 3.11, FastAPI, Uvicorn, Pandas, Scikit-learn, NetworkX
- **Frontend Tech**: React 19, Vite, TanStack Query, Tailwind CSS v4, Recharts, Framer Motion, D3.js/SVG
