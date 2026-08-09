# PSBHackathon

# 👁️ PHANTOM: Behavior-Based Insider Threat Detection & Risk Profiler

> **A Live Security Operations Center (SOC) Dashboard & Unsupervised Machine Learning Framework for Preventing Internal Fraud in Public Sector Banks (PSBs).**
> Developed for the Bank of Baroda × IIT Gandhinagar PSB Hackathon 2026.

---

## 📌 Project Overview

**PHANTOM** is a predictive, real-time Security Operations Center (SOC) dashboard designed to detect sophisticated internal threats in public sector banking environments. 

Rather than focusing strictly on transaction sizes (which basic rule engines already catch), PHANTOM profiles **employee behavior patterns** across daily workflows. By analyzing nearly 1 million log events, it flags anomalies where users selectively bypass accountability checks while proceeding with normal retail banking functions.

---

## 🎯 The Problem Statement

Public Sector Banks (PSBs) manage large, distributed workforces dealing with high-volume privileged operations. Current threat detection frameworks struggle with **Insider Threats** for three core reasons:
1. **Concealment in Routine Work**: Rogue employees do not trigger transaction limit alarms because they continue performing standard tasks (e.g., customer searches, account openings). 
2. **Negative Access Signals**: To cover their tracks, bad actors gradually and strategically avoid using accountability systems (e.g., Audit Reports, Compliance Panels, and Override Logs) which they are expected/mandated to touch. A simple volume-monitoring system sees "low volume" in these systems as benign rather than a potential risk.
3. **Collusion & Excuse Templating**: Insider attacks often involve multiple employees co-accessing identical modules within short intervals, combined with copy-pasted or vague manager override justifications (e.g. *"Customer emergency"* or *“ASAP manager approved”*).

### PHANTOM's Solution
PHANTOM aggregates standard behavioral telemetry, sequential dependencies, correlation networks, and natural language justifications. The system consolidates these inputs into a single metric called the **Dynamic Insider Threat Score (DITS)**. DITS enables SOC analysts to trace high-level alert trends directly down to individual keystroke anomalies.

---

## ⚙️ Core Architecture & Data Flow

PHANTOM separates data simulation, machine learning, and visualization into a highly modular system:

```
    [ Raw Log Telemetry ] (access_logs.csv, employees.csv)
             │
             ▼
    [ Feature Engineering ] (37 Behavioral & Peer Cohort Features)
             │
             ▼
 ┌───────────┴───────────┬───────────────────────┬────────────────────────┐
 │                       │                       │                        │
 ▼                       ▼                       ▼                        ▼
[Engine 1: Seq Risk]  [Engine 2: Isolation]   [Engine 3: Graph]       [Engine 4: NLP]
(Temporal Chain)       (Access Avoidance)      (Collusion Network)     (Language Scanner)
 │                       │                       │                        │
 └───────────┬───────────┴───────────────────────┴────────────────────────┘
             │
             ▼
    [ FastAPI Backend ] ──(Calculates Composite DITS Risk / Trust Scores)
             │
             ▼
    [ Vite / React 19 SOC Dashboard ] (Force-directed collusion networks, timelines, simulator)
```

---

## 🧠 The 4 Analytical Engines

PHANTOM's threat detection capability is distributed across four specialized, zero-dependency python engines:

### 1. Engine 1: Temporal Causal Chain Scorer (E1)
*   **Purpose**: Detects pre-exfiltration or account-hijack sequences in daily action logs.
*   **Target Pattern**: `LOOKUP -> BALANCE_CHECK -> TRANSACTION_HISTORY -> REPORT_EXPORT`
*   **How it Works**: 
    1. Normalizes raw, bank-specific module names (`Customer Search` -> `LOOKUP`, `Cash Operations` -> `BALANCE_CHECK`, etc.) using an internal normalization map.
    2. Computes an **N-gram overlap score** (from 1-grams to 4-grams, with longer matching n-grams carrying heavier weights).
    3. Calculates a **Longest Common Subsequence (LCS) ratio** using a dynamic programming array to compare log ordering against the threat sequence.
    4. Evaluates a **Coverage ratio** represents how many components of the chain appear in the session.
    5. Applies an **Order Penalty (50% score reduction)** if all target actions occur but in a disorganized sequence.
*   **Risk Metric**: Scaled `0–100` Chain Score.

### 2. Engine 2: Negative Access Profiler (E2)
*   **Purpose**: Identifies "system avoidance" anomalies (employees neglecting audit, override, or compliance checklists).
*   **The ML Model**: Trains a scikit-learn **Isolation Forest** (300 base tree estimators, 8% expected contamination factor) unsupervised on a 37-dimensional daily feature matrix (rolling averages, trend slopes, peer z-scores, temporal gaps, and session attributes).
*   **Explainable AI (XAI)**:
    - Normalizes mathematical Isolation Forest scores into an user-friendly `0-100` **Access Void Score (AVS)**.
    - An explainability layer automatically generates natural language analysis based on peer cohort baselines (e.g. *"Audit Reports not accessed for 31 consecutive days, placing the employee 2.8 standard deviations below the Branch Manager baseline"*).
*   **Risk Metric**: Scaled `0–100` Access Void Score (AVS).

### 3. Engine 3: Multi-Party Collusion Graph Scorer (E3)
*   **Purpose**: Uncovers coordinated efforts between different personnel accessing sensitive assets or modules.
*   **Bipartite Graph Representation**: Builds a NetworkX bipartite graph modeling two sets of nodes: Employees (`type='employee'`) and Record/Modules (`type='record'`).
*   **Dynamic Weighting**: Edges are weighted by:
    - **Time Window**: Adds `1.5` weight if access co-occurred within a `120-minute hot window`, else `0.5`.
    - **Asset Value**: Scales weights according to module sensitivity (HIGH = 1.5x, MEDIUM = 1.0x).
*   **Scoring Pipeline**: Combines the *shared record ratio* (fraction of records touched relative to a max limit), the *weighted degree* (closeness of accesses), and the logarithmic scale of *co-accessor counts*.
*   **Risk Metric**: Scaled `0–100` Collusion Score, exported natively as JSON coordinates for D3/SVG visualization.

### 4. Engine 4: Justification Language Risk Scanner (E4)
*   **Purpose**: Scans manager override text logs for policy circumvention language, template cloning, and temporal context lies.
*   **Linguistic Scoring**: Scores text across 6 categories (Authority, Policy Bypass, Responsibility Shift, Vagueness, Urgency, Social Engineering) using regex classifiers and **SentenceTransformers** embeddings (`sentence-transformers/all-MiniLM-L6-v2`).
*   **Bilingual Lexicon**: Features custom rules to identify Hinglish dialects (e.g., *sahab*, *chhod*, *baad mein*, *bina*, *bola*, *jaldi*).
*   **excuse Checker (Template Reuse)**: Compares current justifications against the employee's historical notes using Cosine Similarity on character n-grams. Templates with > 80% similarity are penalized.
*   **Contradiction System**: Flags context mismatches (e.g., note claims "Customer Cash Emergency" but the clickstream log was "Audit Report Export") and timestamps checks (justifications submitted > 15 mins after override).
*   **Risk Metric**: Scaled `0–100` Language Risk Score.

---

## 🛠️ Technology Stack

| Architecture Layer | Core Technologies |
| :--- | :--- |
| **Telemetry & ML Pipeline** | Python 3, Pandas, NumPy, Scikit-learn, NetworkX, YAML, SentenceTransformers |
| **Backend API Server** | FastAPI, Uvicorn, CSV/JSON file structures |
| **Frontend Web App** | React 19, TanStack Router (TanStack Start), TanStack Query (React Query) |
| **Styling & UI** | Tailwind CSS v4, Framer Motion (micro-animations), Lucide React (icons) |
| **Data Viz** | Recharts (trendlines, distributions), Custom SVG layout (Collusion Graphs) |

---

## 📂 Repository Structure

```
PSBHackathon/
├── data/
│   ├── raw/                 # access_logs.csv (977K+ events), employees.csv (50 employees)...
│   ├── processed/           # Aggregated daily activity, peer cohorts, engineered feature matrices...
│   ├── labels/              # validation ground_truth.csv
│   └── demo/                # cached JSONs for offline fallback
├── engines/
│   ├── engine1/             # Sequential action rules (1.py)
│   ├── engine2/             # Isolation Forest avoidance model code (2.py & assets)
│   ├── engine3/             # Bipartite NetworkX collusion scorer (3.py)
│   └── engine4/             # NLP override justification evaluator (4.py)
├── backend/
│   ├── b.py                 # FastAPI server (Uvicorn router, CORS)
│   └── requirements.txt     # Backend python dependencies
├── frontend/
│   ├── src/
│   │   ├── routes/          # File-based TanStack routes (SOC feed, leaderboard, employee 360)
│   │   ├── components/      # UI components (RiskBadge, TimelineChart, CollusionGraph, NLPScorer)
│   │   └── hooks/           # TanStack Query data hooks
│   ├── package.json         # React client environment
│   └── vite.config.ts       # Dev configuration & proxy rules
└── README.md                # Project manuals & guides
```

---

## 🚀 Running the Project Locally

### 1. Precomputations (Setup ML pipeline & cached outputs)
Execute the training scripts to initialize the Isolation Forest Model (Engine 2):
```bash
# Set up Engine 2 files and outputs
cd engines/engine2
pip install -r engine2_negative_access/requirements.txt
python 2.py
```

### 2. Run Backend API Server
Install dependencies and run the FastAPI server:
```bash
cd backend
pip install -r requirements.txt
uvicorn b:app --reload --port 8000
```
*Verify Swagger UI docs at `http://localhost:8000/docs`.*

### 3. Run Frontend SOC Client
Start the Vite developer environment:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🎯 Pitching to the Judges (Interview Q&A Guide)

*   **Judges ask: "How does the collusion graph prove anything?"**
    > *"Engine 3 doesn't just look for employees talking to each other. It tracks bipartite overlaps. If a Loan approval cashier and a branch supervisor, who are located in different departments, access the same sensitive customer search index within minutes of each other, Engine 3 constructs an edge between them and weights it by time speed. The frontend visualizes this connection directly to help analysts catch embezzlement plots."*

*   **Judges ask: "Why did you build custom SVGs instead of using a standard canvas library?"**
    > *"We wanted total custom styling to match our SOC dark-theme and keep bundles lightweight. Utilizing Cytoscape or D3 adds significant overhead. Our custom SVG layouts render deterministic force clusters smoothly and handle native interactivity within React’s lifecycle at a fraction of the cost."*

*   **Judges ask: "Is the NLP just searching for keywords?"**
    > *"No. Keywords (weighted regex) make up only 40% of the score. The other 60% is semantic comparison. We feed justifications into local SentenceTransformers (MiniLM) and compare them with specialized seed lists to detect authority evasion or responsibility shifts, even if different wordings or Hinglish dialects are used."*
