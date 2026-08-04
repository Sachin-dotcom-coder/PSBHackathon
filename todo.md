# PHANTOM — TODO: Pending Connections

> Generated automatically during Phase 7 of the implementation plan.
> Update this file as items are completed.

---

## P1 — High Priority (Connect Next Sprint)

- [ ] **Engine 4 (Language Risk Scanner) — Intentionally deferred**
  - Status: `NLPScorer.tsx` exists as a styled "Coming Soon" placeholder
  - What's needed:
    1. Add justification text data — either `data/raw/override_notes.csv` or synthetic text per employee
    2. Uncomment Engine 4 import in `backend/b.py` and wire `POST /api/score-text` to real `score_justification_text()`
    3. Replace placeholder in `NLPScorer.tsx` with live text input + `useScoreText()` hook
    4. Connect `language_score` in `SubScore` cards in Investigation + Employee pages
    5. Update composite score formula in `backend/b.py` to include language weight

- [ ] **Engine 1 startup speed — chain score caching is slow (~30s)**
  - Status: Works correctly, but computing chain scores for 50 employees on every startup by reading 977K rows is slow
  - Fix: Run Engine 1 as part of the data pipeline and save `data/processed/chain_scores.csv`, then load at startup instead of computing live

- [ ] **Promotion/Transfer history on Employee profile**
  - Status: `data/raw/promotions.csv` and `transfers.csv` exist but are not read by the API
  - Fix: Add a `/api/employee/:id/history` endpoint that reads from these CSVs
  - Frontend: Add a "Career Events" section to the employee profile card

---

## P2 — Medium Priority

- [ ] **Real-time re-scanning — live re-run of Engine 2**
  - Status: Currently serves pre-computed `predictions.json` from disk (Jan–Mar 2026 window)
  - Fix: Add a `/api/rescan` POST endpoint that triggers `model/train.py` in a background thread and refreshes `ALL_PREDICTIONS` cache

- [ ] **Peer cohort scatter visualization (Day1Viz style)**
  - Status: `peer_cohorts.csv` has cohort data but no scatter coordinates
  - Fix: Use `engineered_features.csv` — `peer_z_score` + `peer_percentile` per employee as scatter axes

- [ ] **Override Logs auto-scoring when text data is available**
  - Status: Engine 4 wired only for manual input once P1 is done
  - Fix: If override_notes.csv is added, auto-score on employee load and cache results

- [ ] **Employee avatars beyond initials**
  - Status: All avatars are initials-only
  - Fix: Use `https://api.dicebear.com/7.x/initials/svg?seed={employee_id}` for consistent, deterministic avatars

---

## P3 — Nice to Have

- [ ] **Evidence Package export (PDF/ZIP)**
  - Status: Dismiss button on CriticalIntervention exists, no export yet
  - Fix: Use browser's `window.print()` with a print-specific CSS to generate a PDF of the employee profile

- [ ] **Alert notification system (bell icon)**
  - Status: Not built
  - Fix: Poll `/api/leaderboard` every 30s, compare AVS values, show a `sonner` toast if any employee's score crosses a tier threshold

- [ ] **Branch-level risk map (geographic view)**
  - Status: `branches.csv` has city name and lat/lng data
  - Fix: Add a map route (`/map`) using an SVG India map, color-coded by highest risk employee per branch

- [ ] **Dark/light mode toggle**
  - Status: The CSS variable system is ready for a `.light` class override
  - Fix: Add toggle button in TopBar, `classList.toggle("light")` on `<html>`, persist in localStorage

- [ ] **URL-based employee selection persistence**
  - Status: Investigation page defaults to EMP001, selection is in-memory only
  - Fix: Add `?emp=EMP001` URL search param to investigation route using TanStack Router's `validateSearch`

- [ ] **Collusion graph force-directed layout**
  - Status: Current layout is radial (position-calculated), looks clean but is not physics-based
  - Fix: Implement a simple d'Alembert spring simulation in a `useEffect` for more organic layout

---

## Completed

- [x] Backend FastAPI server (`backend/b.py`) — all endpoints wired
- [x] Frontend API hooks (`usePhantomApi.ts`) — all data types defined
- [x] Vite proxy (`vite.config.ts`) — `/api` → localhost:8000
- [x] Investigation route rewrite — live data, no play/pause
- [x] Leaderboard route — all 50 employees, filter tabs, risk chart
- [x] Employee deep-dive route — 3-column, 90-day timeline, engine tabs
- [x] TimelineChart — Recharts 90-day with event markers
- [x] CollusionGraph — SVG bipartite force graph
- [x] ChainSequence — Engine 1 action step display
- [x] NLPScorer — Engine 4 placeholder shell
- [x] EngineDetailTabs — E1–E4 tabbed panel
- [x] RiskBadge, LoadingSkeleton, PhantomUI — shared components
