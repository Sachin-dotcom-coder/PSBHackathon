# PHANTOM — Implementation Plan: Demo → Live SOC Dashboard

> [!IMPORTANT]
> **Engine 4 (Language Risk Scanner / NLP Scorer) is intentionally left as a placeholder in this build.** The tab will exist in the UI (styled, matching the design system) but will show a "Coming Soon" state instead of live scoring. It will be wired up in a future sprint. Tracked in todo.md.

## Overview

This plan converts the existing PHANTOM frontend (currently a 5-day hardcoded demo with a play/pause simulation) into a **fully live SOC dashboard** reading real data from the 4 Python engines in real time.

**Core principle**: The Play/Pause/Restart demo mechanic is **completely removed**. The new dashboard is a live operational tool — analysts see real data, click between real employees, and every screen reflects actual engine output.

**Safety principle**: Anything not fully wired up yet is tracked in a separate `todo.md` document so nothing is scrapped — it's all connected progressively.

No changes are made to engines, data pipeline, or the CSS design system.

---

## 1. System Architecture

### 1.1 Existing Data Layer (Do Not Touch)

```
data/raw/
  access_logs.csv         — 977,000+ events (emp_id, timestamp, module, action, session_id)
  employees.csv           — 50 employees (name, role, branch, personality, experience)
  branches.csv, departments.csv, holidays.csv, modules.csv
  promotions.csv, transfers.csv, role_permissions.csv

data/processed/
  daily_activity.csv      — 4,500 rows: daily module access counts per employee
  feature_matrix.csv      — 4,500 rows × 37 features (ML training input)
  engineered_features.csv — temporal + peer features
  peer_cohorts.csv        — 43 peer cohorts (Role + Branch + Experience Level)

data/labels/
  ground_truth.csv        — 50 employees, 1=fraud / 0=normal
  anomaly_reason.csv      — human-readable forensic reasons

data/demo/
  demo_dataset.json       — 14-day slice for EMP001/010/015/023 (used as API fallback)
```

### 1.2 Engines (Do Not Touch)

| Engine | File | Input | Output |
|--------|------|-------|--------|
| E1: Temporal Chain | `engines/engine1/1.py` | access_logs.csv + emp_id + date | `chain_score` 0–100 |
| E2: Negative Access | `engines/engine2/.../model/predict.py` | feature_matrix.csv | `access_void_score` 0–100, `risk`, `reasons[]` |
| E3: Collusion Graph | `engines/engine3/3.py` | access_logs.csv | `collusion_score` 0–100, graph JSON (nodes+links) |
| E4: NLP Language | `engines/engine4/4.py` | override note text | `language_score`, `vagueness`, `urgency` |

#### Engine 2 Pre-Generated Outputs (Already Exist on Disk)
```
engines/engine2/engine2_negative_access/outputs/
  predictions/
    predictions.json      — all 50 employees ranked by access_void_score
    scores.csv            — same, with reasons_text column
    daily_scores.csv      — per-day AVS for all 50 employees (4,500 rows)
  timeline_json/
    EMP001.json           — 90-day forensic timeline (Rajesh Kumar)
    EMP010.json           — Aarti Iyer
    EMP015.json           — Amit Singh
    EMP023.json           — Nikhil Mehta
```

### 1.3 Backend (backend/b.py — Currently Empty)

Must be written as a **FastAPI** server. It imports the engines, serves pre-generated outputs as REST APIs, and runs live scoring for Engine 1 and Engine 4.

### 1.4 Frontend (TanStack Start + React 19 + Vite 7)

Uses file-based routing, TanStack Query for data fetching, Framer Motion for animations, Tailwind CSS v4, Recharts, Lucide React, JetBrains Mono + Inter fonts.

---

## 2. Full Architecture Diagram

```
Browser (Frontend @ localhost:5173)
        │
        │  HTTP + TanStack Query (30s polling)
        ▼
FastAPI Backend (backend/b.py @ localhost:8000)
        │
        ├── /api/leaderboard        ← predictions.json (pre-computed)
        ├── /api/employees/:id      ← scores.csv + employees.csv merge
        ├── /api/employee/:id/timeline  ← timeline_json/*.json
        ├── /api/employee/:id/chain-score  ← Engine 1 (live, fast)
        ├── /api/employee/:id/collusion    ← Engine 3 (startup cache)
        ├── /api/score-text         ← Engine 4 (live, fast)
        └── /api/stats              ← aggregate counts
        │
        ├── Engine 1 (1.py)   — score_from_psb_data()
        ├── Engine 2 (predict.py) — predict_all() / predict_employee()
        ├── Engine 3 (3.py)   — calculate_collusion_score() [cached]
        └── Engine 4 (4.py)   — score_justification_text()
        │
        └── data/ files (CSVs, JSONs)
```

---

## 3. What Is Removed vs. What Is Replaced

### Removed Entirely
| Demo Feature | Why Removed |
|---|---|
| `playing` state variable | This is now live data, not a simulation |
| `Play` / `Pause` button in TopBar | No playback in a live dashboard |
| `Restart` button | No concept of restarting a live feed |
| `auto-advance` `useEffect` timer (4200ms delay) | Replaced by real-time data polling |
| Fixed `DAYS: Day[]` array (5 hardcoded days) | Replaced by API data |
| `DayKey` type (1|2|3|4|5) | Replaced by `employee_id` selection |
| `setShowCritical(true)` on final day | Critical alert is a live threshold check |

### Replaced With Live Equivalents
| Demo Feature | Live Replacement |
|---|---|
| 5-day navigation | Milestone event list (from `timeline.events[]`) |
| `SubjectCard` with fake "Rajesh Sharma" | Real employee card from API |
| `Day1Viz` – `Day5Viz` static charts | Real `TimelineChart`, `CollusionGraph`, etc. |
| Hardcoded trust score (94→21 over 5 days) | Live `100 - access_void_score` from API |
| Hardcoded sub-scores | Real engine scores from API |
| Static AI reasons | Real `reasons[]` from `predictions.json` |
| `CriticalIntervention` fires at "Day 5" | Fires when `access_void_score >= 60` (configurable) |
| `TopBar` with Play/Pause/Restart | TopBar with Employee Selector + Live Indicator |

---

## 4. Backend API Design (backend/b.py)

### Technology: FastAPI + uvicorn
- **CORS**: Allow `http://localhost:5173`
- **Port**: 8000
- **Startup**: Pre-loads Engine 3 event cache (reads 977K rows once)

### Startup Pre-computation (One Time)
```
1. Load predictions.json → memory (ALL_PREDICTIONS)
2. Load employees.csv → pandas DataFrame (EMPLOYEES_DF)
3. Run Engine 3: extract_events_from_psb_data(access_logs.csv) → cache (COLLUSION_EVENTS)
4. Compute Engine 3 scores for all 50 employees from COLLUSION_EVENTS → dict (COLLUSION_SCORES)
5. Load all 4 timeline JSONs (EMP001/010/015/023) → dict (TIMELINE_CACHE)
6. Compute Engine 1 chain scores for last date per employee → dict (CHAIN_SCORES_CACHE)
```

### Endpoints

#### `GET /api/leaderboard`
Returns all 50 employees sorted by `access_void_score` desc.
- Source: `predictions.json` + merge `chain_score` + `collusion_score`
- `composite_trust_score = 100 − (0.35×avoidance + 0.30×chain + 0.20×collusion + 0.15×language)`
```json
[{
  "employee_id": "EMP027",
  "name": "Gaurav Dubey",
  "role": "Compliance Officer",
  "branch": "Surat",
  "access_void_score": 70.0,
  "risk": "High",
  "chain_score": 12,
  "collusion_score": 8,
  "language_score": 0,
  "composite_trust_score": 24,
  "reasons": ["Minor deviation from peer cohort baseline..."]
}]
```

#### `GET /api/employees/:id`
Full profile for one employee.
```json
{
  "employee_id": "EMP001",
  "name": "Rajesh Kumar",
  "role": "Branch Manager",
  "branch": "Ahmedabad",
  "experience_years": 1.9,
  "cohort_id": "COHORT001",
  "personality": { "work_style": "Fast", "risk_profile": "High", ... },
  "access_void_score": 60.0,
  "risk": "Medium",
  "chain_score": 84,
  "collusion_score": 22,
  "language_score": 0,
  "composite_trust_score": 40,
  "reasons": ["Audit Reports not accessed for 31 days...", ...]
}
```

#### `GET /api/employee/:id/timeline`
90-day timeline data.
- For EMP001/010/015/023: serve from `TIMELINE_CACHE`
- For others: assemble from `daily_scores.csv` + `daily_activity.csv`
```json
{
  "employee_id": "EMP001",
  "name": "Rajesh Kumar",
  "role": "Branch Manager",
  "primary_module_name": "Customer Search",
  "current_score": 60.0,
  "risk_level": "Medium",
  "events": [
    { "day": 23, "type": "audit_zero", "label": "Audit Reports Reached Zero", "color": "red" },
    { "day": 40, "type": "decline_start", "label": "Beginning of Avoidance", "color": "blue" },
    { "day": 67, "type": "risk_escalation", "label": "AVS Crossed 60 (High Risk)", "color": "crimson" }
  ],
  "timeline": [
    { "day": 1, "date": "2026-01-02", "primary_activity": 42, "audit": 33, "compliance": 26, "override": 7, "access_void_score": 34.3 }
  ]
}
```

#### `GET /api/employee/:id/chain-score?date=YYYY-MM-DD`
Live Engine 1 scoring for an employee on a given date.
```json
{ "employee_id": "EMP001", "date": "2026-03-31", "chain_score": 84 }
```

#### `GET /api/employee/:id/collusion`
Engine 3 collusion score + graph from startup cache.
```json
{
  "employee_id": "EMP001",
  "collusion_score": 22,
  "graph": {
    "nodes": [{"id": "EMP001", "type": "employee"}, {"id": "MOD-CUSTOMER_SEARCH", "type": "record"}],
    "links": [{"source": "EMP001", "target": "MOD-CUSTOMER_SEARCH", "weight": 1.5}]
  }
}
```

#### `POST /api/score-text` — Stubbed (Engine 4 deferred)
Endpoint is defined in the router but returns a static stub response for now:
```json
{ "language_score": null, "vagueness": null, "urgency": null, "status": "not_connected" }
```
Full Engine 4 wiring deferred to next sprint. Tracked in todo.md P1.

#### `GET /api/stats`
```json
{ "total_employees": 50, "flagged_high": 2, "flagged_medium": 7, "last_scan": "2026-03-31", "total_events": 977000 }
```

---

## 5. Frontend Route Structure

| File | URL | What it shows |
|------|-----|---------------|
| `__root.tsx` | App shell | SplashScreen + QueryClient (**KEEP EXACTLY**) |
| `index.tsx` | `/` | Landing page (**KEEP EXACTLY**, add nav links) |
| `investigation.tsx` | `/investigation` | **REWRITE** — Live SOC investigation view |
| `leaderboard.tsx` | `/leaderboard` | **NEW** — All 50 employees ranked by risk |
| `employee/$id.tsx` | `/employee/:id` | **NEW** — Employee forensic deep-dive |

---

## 6. Investigation Route Rewrite — Full Spec

### 6.1 What It Does Now (To Be Replaced)
- **`TopBar`**: Shows "Live · Day X / 5" + Play/Pause/Restart buttons → **All removed**
- **`SubjectCard`**: Fake static subject → **Real employee from API**
- **`Timeline`**: 5-button list of hardcoded days → **Real milestone events from API**
- **`LiveRiskPanel`**: Static trust score + hardcoded sub-scores → **Real data**
- **`DayXViz`**: Static hardcoded visualizations → **Real data visualizations**
- **`AiReasoning`**: Static hardcoded text → **Real `reasons[]` from API**
- **State**: `playing`, `activeDay`, `showCritical` → Simplified to employee + event selection

### 6.2 New `TopBar`
```
[ ← Back ] | PHANTOM / Investigation     [● LIVE]  [Employee: Rajesh Kumar ▾]
```
- Back arrow to `/`
- Live indicator (animated pulse dot — keep from original)
- **Employee selector dropdown** — populated from `/api/leaderboard`, shows name + risk badge
- No Play/Pause/Restart

### 6.3 New State Shape
```ts
interface InvestigationState {
  selectedEmployeeId: string;        // default "EMP001"
  selectedEventIndex: number | null; // which milestone event is highlighted, null = overview
  showCritical: boolean;             // fires when AVS >= 60 and event selected is risk_escalation
}
```

### 6.4 New `SubjectCard`
Pulls from `useEmployee(id)`. Real fields:
- Name, initials avatar
- Role, Branch
- Experience (from `experience_years`)
- Cohort (from `cohort_id`)
- Risk badge (live, colored)

### 6.5 New Left Sidebar — Event Timeline
Replaces the 5-day list with the real `events[]` from timeline API.

```
TIMELINE MILESTONES
┌──────────────────────────────────┐
│ ● Jan 23  Audit Reports → Zero   │  ← clickable
│   Day 23                         │
├──────────────────────────────────┤
│ ● Feb 09  Beginning of Avoidance │
│   Day 40                         │
├──────────────────────────────────┤
│ ● Mar 08  Risk Score Crossed 60  │  ← active
│   Day 67                  [CRIT] │
└──────────────────────────────────┘
```

- Dot color matches `event.color`
- Clicking an event sets `selectedEventIndex`
- If no event selected → shows overview (current scores)
- No auto-advance; the analyst clicks manually

### 6.6 Center Panel — Live Risk Panel

**Top card**: Trust Score
- `trust = 100 − access_void_score` (animated with `TrustNumber` + `TrustDial` — kept)
- `StateBadge` — kept
- `headline`: derived from `risk` level + latest reason

**Sub-scores** (real from API, animated bars — `SubScore` component kept):
- Chain (Engine 1)
- Avoidance (Engine 2 `access_void_score`)
- Collusion (Engine 3)
- Language (Engine 4 — shows `—` with `title="Not yet connected"` tooltip, placeholder only)

**Composite score** uses only 3 engines until E4 is wired:
```
composite_trust = 100 − (0.45 × avoidance + 0.35 × chain + 0.20 × collusion)
```

**Bottom card**: Event-specific visualization
- No event selected → show `OverviewViz` (90-day mini timeline using real data)
- `decline_start` event → show audit/compliance/override trend chart at avoidance point
- `audit_zero` event → show expected vs actual bar comparison (like Day2Viz but real data)
- `risk_escalation` event → show AVS rolling trend with 60-threshold line highlighted
- All visualizations built with Recharts

### 6.7 Right Panel — AI Reasoning
- Headline: Engine name that triggered
- `useTimeline(id)` + event context → real reasons from `reasons[]`
- `ReasonLine` components (kept) animated with real text
- `RecommendedPosture` (kept) driven by `risk` level
- `Typewriter` component (kept) for the insight text

### 6.8 `CriticalIntervention` Overlay
- Triggers when the analyst clicks the `risk_escalation` event AND `access_void_score >= 60`
- No longer fires automatically at a timer — analyst-triggered
- Same visual, real employee name and real score displayed
- Close button dismisses it (no "Replay Investigation")

---

## 7. New Route: Leaderboard (/leaderboard)

### Layout
```
Header: PHANTOM / Leaderboard  [● LIVE]   [Total: 50 employees | High: 2 | Medium: 7 | Last scan: Mar 31]

Filter tabs: [ All ] [ High ] [ Medium ] [ Low ] [ Normal ]

Table:
Rank │ Employee         │ Role              │ Branch    │ AVS  │ Chain │ Collusion │ Risk
─────┼──────────────────┼───────────────────┼───────────┼──────┼───────┼───────────┼──────
 1   │ Gaurav Dubey     │ Compliance Officer│ Surat     │ 70.0 │  45   │    12     │ [HIGH]
 2   │ Nikhil Mehta     │ Compliance Officer│ Delhi     │ 67.6 │  33   │    18     │ [HIGH]
 3   │ Rajesh Kumar     │ Branch Manager    │ Ahmedabad │ 60.0 │  84   │    22     │ [MED]
```

- Each row is clickable → navigates to `/employee/:id`
- `RiskBadge` component for colored risk levels
- `ScoreBar` mini-bars showing AVS visually
- Right panel: a `RiskDistributionChart` (Recharts BarChart showing Normal/Low/Medium/High breakdown)
- Uses same dark theme, monospace labels, border/surface-2 colors

---

## 8. New Route: Employee Deep-Dive (/employee/$id.tsx)

### 3-Column Layout

**Left Column — Profile Card**
- Avatar (initials), name, role, branch, experience
- Personality traits (work_style, risk_profile, arrival_time, leave_time)
- Peer cohort ID + approximate cohort size
- Promotion/transfer history if applicable (tracked in todo.md for generic employees)
- Status badge

**Center Column — 90-Day Timeline Chart**
- `TimelineChart` component (Recharts LineChart)
- 4 lines: primary_activity, audit, compliance, override
- Vertical event markers at `events[].day` with colored labels
- Tooltip: exact day values
- Below: AVS line chart with 60-threshold horizontal line

**Right Column — Score Breakdown**
- 4 animated score cards (Chain, Avoidance, Collusion, Language)
- Composite Trust Score (large animated number)
- AI Reasons list (real `reasons[]`, `ReasonLine` components)
- `RecommendedPosture` driven by `risk`

### Bottom Panel — Engine Tabs

**Tab 1: Chain Sequence (Engine 1)**
- Shows the action sequence for the most recently flagged day
- `ChainSequence` component: step-by-step boxes like Day3Viz but real data
- Shows match % against TARGET_SEQUENCE

**Tab 2: Access Void (Engine 2)**
- Shows AVS trend mini-chart
- Key stats: "Days since last audit", "Drop % from baseline", "Peer z-score"
- Pulled from timeline JSON

**Tab 3: Collusion Graph (Engine 3)**
- `CollusionGraph` component: SVG force graph with real nodes + links
- Real employee names on nodes, edge weight = line thickness
- Similar to Day4Viz style

**Tab 4: Language Scanner (Engine 4) — Placeholder**
- `NLPScorer` component: rendered as a styled placeholder
- Shows the tab with the PHANTOM design (monospace label, border styling)
- Displays: `"Language Risk Scanner — Coming Soon"` with a brief description
- Does NOT make any API calls or render the text input yet
- Will be fully wired in the next sprint (tracked in todo.md P1)

---

## 9. Component Architecture

### Reuse Exactly (Do Not Touch)
| Component | File | Used In |
|-----------|------|---------|
| `SplashScreen` | `components/phantom/SplashScreen.tsx` | `__root.tsx` |
| `NetworkBackground` | `components/phantom/NetworkBackground.tsx` | `index.tsx`, SplashScreen |
| `TrustNumber` | `investigation.tsx` → move to `components/phantom/` | Investigation, Employee |
| `TrustDial` | same | Investigation, Employee |
| `SubScore` | same | Investigation, Employee |
| `StateBadge` | same | Investigation, Employee, Leaderboard |
| `Typewriter` | same | Investigation, Employee |
| `ReasonLine` | same | Investigation, Employee |
| `RecommendedPosture` | same | Investigation, Employee |
| `CriticalIntervention` | same | Investigation |
| `CountUp` | same | Investigation, Employee |

### New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `RiskBadge` | `components/phantom/RiskBadge.tsx` | Colored risk level badge |
| `TimelineChart` | `components/phantom/TimelineChart.tsx` | Recharts 90-day line chart |
| `CollusionGraph` | `components/phantom/CollusionGraph.tsx` | SVG force graph |
| `EmployeeCard` | `components/phantom/EmployeeCard.tsx` | Compact row for leaderboard |
| `ScoreBar` | `components/phantom/ScoreBar.tsx` | Mini animated score bar |
| `ChainSequence` | `components/phantom/ChainSequence.tsx` | Step-by-step action display |
| `NLPScorer` | `components/phantom/NLPScorer.tsx` | Live text input + E4 scoring |
| `EngineDetailTabs` | `components/phantom/EngineDetailTabs.tsx` | Tabbed E1–E4 detail panel |
| `OverviewViz` | inlined in `investigation.tsx` | Default chart when no event selected |
| `EventViz` | inlined in `investigation.tsx` | Event-specific chart |
| `LoadingSkeleton` | `components/phantom/LoadingSkeleton.tsx` | Styled loading state |

### Shared Components Extract
Move these out of `investigation.tsx` into `components/phantom/` so all routes can use them:
- `TrustNumber`, `TrustDial`, `SubScore`, `StateBadge`, `Typewriter`, `ReasonLine`, `RecommendedPosture`, `CountUp`

---

## 10. Data Hooks (src/hooks/usePhantomApi.ts)

```ts
// src/lib/api.ts
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(`${API_BASE}${path}`, init).then(r => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// src/hooks/usePhantomApi.ts
export const useLeaderboard = () =>
  useQuery({ queryKey: ["leaderboard"], queryFn: () => apiFetch("/api/leaderboard"), staleTime: 30_000 });

export const useEmployee = (id: string) =>
  useQuery({ queryKey: ["employee", id], queryFn: () => apiFetch(`/api/employees/${id}`), staleTime: 30_000 });

export const useTimeline = (id: string) =>
  useQuery({ queryKey: ["timeline", id], queryFn: () => apiFetch(`/api/employee/${id}/timeline`), staleTime: 60_000 });

export const useCollusion = (id: string) =>
  useQuery({ queryKey: ["collusion", id], queryFn: () => apiFetch(`/api/employee/${id}/collusion`), staleTime: 60_000 });

export const useStats = () =>
  useQuery({ queryKey: ["stats"], queryFn: () => apiFetch("/api/stats"), staleTime: 30_000 });

export const useScoreText = () =>
  useMutation({ mutationFn: (text: string) =>
    apiFetch("/api/score-text", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ text }) })
  });
```

---

## 11. Vite Proxy Configuration

```ts
// vite.config.ts — add server.proxy
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

---

## 12. Real Data Mapping

### Trust Score
```
Demo: 94, 82, 67, 49, 21 (fake, declining over 5 days)
Live: 100 − access_void_score

EMP027 Gaurav Dubey   → trust = 30 (AVS 70, High)
EMP023 Nikhil Mehta   → trust = 32 (AVS 67.6, High)
EMP001 Rajesh Kumar   → trust = 40 (AVS 60.0, Medium)
EMP010 Aarti Iyer     → trust = 54 (AVS 45.5, Medium)
```

### Composite Score Formula
```
composite_trust = 100 − (0.35 × avoidance + 0.30 × chain + 0.20 × collusion + 0.15 × language)
```

### Risk → State
```
Normal (0–20)  → "trusted"
Low    (21–40) → "trusted"
Medium (41–60) → "elevated"
High   (61–80) → "elevated"
Critical(81+)  → "critical"
```

### Subject Card
```
Demo → Real
"Rajesh Sharma" → "Rajesh Kumar" (EMP001)
"Senior Operations Officer" → "Branch Manager"
"Mumbai · Fort" → "Ahmedabad"
"Privileged · L4" → derived from role
"7 yrs 3 mo" → calculated from experience_years
"Ops · 142 peers" → cohort size from peer_cohorts.csv
```

### Timeline Events (EMP001)
```
Day 23 → Jan 23, 2026 → Audit Reports hit zero
Day 40 → Feb 09, 2026 → Beginning of Avoidance
Day 67 → Mar 08, 2026 → AVS crossed 60 (risk escalation)
```

---

## 13. File-by-File Change Summary

### CREATE (New Files)
| # | File | Purpose |
|---|------|---------|
| 1 | `backend/b.py` | FastAPI server, all endpoints |
| 2 | `backend/requirements.txt` | fastapi, uvicorn, pandas, scikit-learn, networkx |
| 3 | `frontend/src/lib/api.ts` | API base URL + apiFetch helper |
| 4 | `frontend/src/hooks/usePhantomApi.ts` | All TanStack Query hooks |
| 5 | `frontend/src/routes/leaderboard.tsx` | Leaderboard page |
| 6 | `frontend/src/routes/employee/$id.tsx` | Employee deep-dive page |
| 7 | `frontend/src/components/phantom/RiskBadge.tsx` | Risk level badge |
| 8 | `frontend/src/components/phantom/TimelineChart.tsx` | 90-day Recharts chart |
| 9 | `frontend/src/components/phantom/CollusionGraph.tsx` | SVG force graph |
| 10 | `frontend/src/components/phantom/EmployeeCard.tsx` | Leaderboard row card |
| 11 | `frontend/src/components/phantom/ScoreBar.tsx` | Mini score bar |
| 12 | `frontend/src/components/phantom/ChainSequence.tsx` | Action step display |
| 13 | `frontend/src/components/phantom/NLPScorer.tsx` | Live Engine 4 text input |
| 14 | `frontend/src/components/phantom/EngineDetailTabs.tsx` | Tabbed E1–E4 panel |
| 15 | `frontend/src/components/phantom/LoadingSkeleton.tsx` | Loading skeleton states |

### MODIFY (Existing Files)
| # | File | Change |
|---|------|--------|
| 16 | `frontend/src/routes/investigation.tsx` | Full rewrite (remove demo play, add live data) |
| 17 | `frontend/vite.config.ts` | Add proxy config for `/api` → port 8000 |
| 18 | `frontend/src/routes/index.tsx` | Add nav links to `/leaderboard` |

### DO NOT TOUCH (Sacred Files)
- `frontend/src/styles.css` — design system
- `frontend/src/routes/__root.tsx` — root layout + SplashScreen
- `frontend/src/components/phantom/SplashScreen.tsx`
- `frontend/src/components/phantom/NetworkBackground.tsx`
- `frontend/src/routeTree.gen.ts` — auto-generated
- `frontend/src/router.tsx`
- `frontend/src/start.ts`
- `frontend/src/server.ts`
- All `data/` files
- All `engines/` files

---

## 14. Step-by-Step Execution Order

### Phase 1 — Backend Server
1. Create `backend/requirements.txt`
2. Write `backend/b.py` — FastAPI with startup caching + all endpoints
3. Test: `uvicorn b:app --reload` from backend/ directory
4. Verify `/api/leaderboard` returns real 50-employee data
5. Verify `/api/employee/EMP001/timeline` returns 90 days

### Phase 2 — Frontend API Layer
6. Write `frontend/src/lib/api.ts`
7. Write `frontend/src/hooks/usePhantomApi.ts`
8. Modify `vite.config.ts` — add proxy

### Phase 3 — Extract Shared Components
9. Extract `TrustNumber`, `TrustDial`, `SubScore`, `StateBadge`, `Typewriter`, `ReasonLine`, `RecommendedPosture`, `CountUp` out of `investigation.tsx` into individual files in `components/phantom/`
10. Create `RiskBadge`, `ScoreBar`, `LoadingSkeleton`

### Phase 4 — Data Visualization Components
11. Create `TimelineChart.tsx` (Recharts, 90-day)
12. Create `CollusionGraph.tsx` (SVG force graph)
13. Create `ChainSequence.tsx`
14. Create `NLPScorer.tsx`
15. Create `EngineDetailTabs.tsx`
16. Create `EmployeeCard.tsx`

### Phase 5 — Rewrite Investigation Page
17. Remove all play/pause/restart/auto-advance logic
18. Add employee selector dropdown to TopBar
19. Connect `useEmployee(id)` + `useTimeline(id)` hooks
20. Replace `DAYS[]` array with `timeline.events[]` for the left sidebar
21. Replace `DayXViz` with event-driven real visualizations
22. Connect AI reasoning panel to real `reasons[]`
23. Update `CriticalIntervention` to fire on risk_escalation event click
24. Add loading skeletons for all async data

### Phase 6 — New Routes
25. Build `leaderboard.tsx` — full table + filter tabs + stats header
26. Build `employee/$id.tsx` — 3-column profile + 90-day chart + engine tabs
27. Update `index.tsx` — add navigation to leaderboard

### Phase 7 — Polish
28. Add error boundary / "Backend offline" fallback to demo_dataset.json
29. Verify all routes navigate correctly
30. Test full flow: splash → landing → investigation → leaderboard → employee deep-dive
31. Run `npm run lint` to verify TypeScript

---

## 15. Fallback Strategy (Hackathon Safety Net)

If the backend is not running during presentation:
- `useLeaderboard()` falls back to reading `data/demo/demo_dataset.json`
- `useTimeline("EMP001")` falls back to `engines/engine2/.../outputs/timeline_json/EMP001.json`
- All UI still renders correctly with demo data
- "Backend offline — showing cached data" banner appears (same design, muted-foreground text)

---

## 16. Open Questions (Resolved)

| Question | Decision |
|---|---|
| Play/Pause mechanic | **Removed entirely** — live dashboard, analyst-driven navigation |
| Engine 4 (NLP Language) | **Placeholder only** — tab built with "Coming Soon" state, not wired. Tracked in todo.md P1. |
| Language Score in sub-scores | Shows `—` dash (not 0) with a "Not connected" tooltip. Composite score uses only 3 engines. |
| Leaderboard default | Shows all 50, default filter = "All", tab for High/Medium/etc. |
| Collusion graph renderer | SVG force simulation (no new deps, same approach as Day4Viz) |
| Investigation default employee | EMP001 (Rajesh Kumar) — highest narratively significant |
| Auto-select employee | Dropdown in TopBar, persists via URL param (`?emp=EMP001`) |

---

## 17. todo.md — Features Tracked for Future Connection

A separate `todo.md` will be created at project root during execution. It will track:

```markdown
## PHANTOM — TODO: Pending Connections

### P1 — High Priority (Connect Next Sprint)
- [ ] **Engine 4 (Language Risk Scanner) — Intentionally deferred**
      Status: UI tab is a styled placeholder (`NLPScorer.tsx` built but shows "Coming Soon")
      Fix needed:
        1. Add justification text data to access_logs.csv or a separate override_notes.csv
        2. Wire `POST /api/score-text` endpoint in backend/b.py (Engine 4 import already planned)
        3. Replace placeholder in NLPScorer.tsx with live scoring + keyword highlighting
        4. Connect Language Score sub-score card in Investigation + Employee pages
        5. Update composite score formula to include language weight (currently 3-engine only)

- [ ] Engine 1 chain scores cached at startup are slow (reads 977K rows for each employee)
      Status: Works, but startup takes ~30s
      Fix: Pre-compute chain scores per employee per day during data pipeline and save to CSV

- [ ] Promotion/Transfer history for all employees
      Status: Only EMP005 (promoted) and EMP009 (transferred) have real events
      Fix: Read from data/raw/promotions.csv and transfers.csv, display in employee profile

### P2 — Medium Priority
- [ ] Real-time "live scan" indicator — actual re-run of Engine 2 on new data
      Status: Currently serves pre-computed predictions from disk
      Fix: Schedule re-train trigger or watch for new access_logs entries

- [ ] Employee photo / avatar beyond initials
      Status: No photo data available
      Fix: Use DiceBear avatar API keyed on employee_id for consistent avatars

- [ ] Peer cohort visualization — show all peers in a scatter (Day1Viz style)
      Status: peer_cohorts.csv has cohort info but no scatter data
      Fix: Use engineered_features.csv to get peer activity metrics for scatter

- [ ] Override Logs module not connected in Engine 4
      Status: Engine 4 only scores text input manually
      Fix: If override note text data is added, auto-score on employee load

### P3 — Nice to Have
- [ ] Export Evidence Package button (PDF/ZIP)
      Status: UI button exists in CriticalIntervention modal
      Fix: Generate PDF from timeline data using browser print API

- [ ] Alert notifications system (bell icon in TopBar)
      Status: Not built
      Fix: Poll /api/leaderboard every 30s, show toast if new employee crosses threshold

- [ ] Branch-level risk map (geographic view)
      Status: branches.csv has city data
      Fix: Add a map component using SVG India map or Leaflet.js

- [ ] Dark/light mode toggle
      Status: CSS vars ready (dark class defined)
      Fix: Add toggle button to TopBar, persist in localStorage
```

---

## 18. Verification Plan

### Backend
1. Start: `cd backend && uvicorn b:app --reload --port 8000`
2. Check: `http://localhost:8000/docs` → auto-generated FastAPI docs show all 6 endpoints
3. Verify: `/api/leaderboard` → 50 employees, EMP027 first
4. Verify: `/api/employee/EMP001/timeline` → 90 data points, 4 events

### Frontend
1. Start: `cd frontend && npm run dev`
2. Visit `http://localhost:5173` → SplashScreen boots, then landing page
3. Click "Launch Investigation" → loads Rajesh Kumar's real data (not fake Rajesh Sharma)
4. See 3 real timeline events (Jan 23, Feb 09, Mar 08)
5. Click each event → visualization updates with real data
6. Click risk_escalation event → CriticalIntervention overlay fires
7. Visit `/leaderboard` → table of 50 employees, EMP027 at top
8. Click EMP001 row → deep-dive loads with 90-day chart
9. Type in NLP tab → real Engine 4 scoring works
10. Stop backend, reload → "Backend offline" banner, demo data shown

> [!IMPORTANT]
> **AWAITING YOUR CONFIRMATION BEFORE ANY CODE IS WRITTEN.**
> Reply with "go ahead" to begin execution in the order defined in Section 14.
