# PHANTOM — Engine 2: Dataset Simulation & Generation Guide (Vishal's Part)

## 📌 Document Overview
This document provides a comprehensive technical guide to the synthetic dataset simulation engine (**Engine 2 — Negative Access Profiler**) designed and implemented by Vishal for the Bank of Baroda × IIT Gandhinagar PSB Hackathon 2026. 

The primary goal of this dataset engine is **not** to generate random fraud transaction records, but rather to model **realistic human workflows and behavioral patterns** inside a banking environment. This allows the detection system to identify **Negative Access Signals** (i.e., employees strategically avoiding systems they are expected to use).

---

## 🛠️ Design Philosophy: Behavioral Realism vs. Randomness
For a machine learning model (such as an Isolation Forest) to learn what "normal behavior" is, the underlying data must tell a coherent story. A simplistic random dataset will immediately be flagged as artificial by hackathon judges and domain experts. 

To achieve judge-winning realism, the simulation engine implements a **persona-driven, session-based generative framework** over a 90-day period (Jan 1, 2026 – March 31, 2026) for 50 distinct employees.

---

## ⚙️ Core Components of the Data Simulator (`d2.py`)

### 1. Employee Personalities (Step 1)
Every employee is modeled as a distinct agent with unique, deterministic behavioral traits stored in their personality schema:
*   **Work Style**: `Fast` (1.15x activity multiplier), `Medium` (1.00x), or `Slow` (0.83x).
*   **Risk Profile**: Matches historical background flags.
*   **Work Hours**: Custom arrival and departure times (e.g., 08:55 AM login, 06:12 PM logout) with standard deviations to model daily time variance.
*   **Break Patterns**: Short or long breaks that suppress activity during lunch periods (12:45 PM – 01:15 PM).
*   **Leave Frequency**: Determines the likelihood of annual, medical, or casual leave days.

### 2. Workload Profiles (Step 2)
Banking activity naturally fluctuates depending on the day of the week. The simulation applies daily workload multipliers:
*   **Mondays & Fridays**: High volume (1.10x).
*   **Tuesdays**: Peak volume (1.15x).
*   **Wednesdays & Thursdays**: Normal baseline (1.00x - 1.05x).
*   **Saturdays**: Half-day operation (0.40x).
*   **Sundays**: Branch closed (0.00x).

### 3. Banking Seasons (Step 3)
A bank is subject to monthly and quarterly cycles:
*   **Beginning of Month (BOM)**: Salary credits cause a 1.20x spike in transactions and customer searches for the first 3 days.
*   **End of Month (EOM)**: Loan closures increase overall activity by 1.15x in the last 2 days.
*   **Quarter-End Audit**: Heavy compliance and audit dashboard workloads (1.30x overall boost, plus an additional 1.50x audit season boost for oversight modules from March 25th onward).

### 4. Session-Based Access Logs (Step 4)
Instead of generating aggregate daily counts directly, `d2.py` simulates raw PAM (Privileged Access Management) logs. 
*   An employee initiates `Login`.
*   A sequence of individual transactions, customer searches, and report exports occurs.
*   The employee initiates `Logout`.
These raw events are saved with exact timestamps in `access_logs.csv` before being aggregated into daily counts.

### 5. Role-Differentiated Behavior (Step 5)
No two roles behave similarly. Each of the 8 bank roles has an expected list of accessible modules and defined daily transaction count ranges:
*   **Loan Officer**: Focuses on *Loan Approval* (100–140 actions/day), *Customer Search*, *Loan Review*, and minor *Audit Reports* (15–30/day).
*   **Compliance Officer**: Highly focused on *Audit Reports* (70–120/day) and *Compliance Dashboard* (40–70/day).
*   **Cashier**: Dominated by *Cash Operations* (250–350/day) and *Transaction History*.
*   **Branch Manager**: Broad access to reports, reviews, risk dashboards, and account closures.

### 6. Promotions, Transfers, and Learning Curves (Steps 8, 9, 16)
To capture professional evolution:
*   **Learning Curves**: Employees with less than 2 years of experience start at 50% productivity and ramp up over 45 days.
*   **Promotions**: Mid-period role changes (e.g., `EMP005` promoted from Loan Officer to Branch Manager on Day 50) immediately alter the user's expected access profile.
*   **Transfers**: Mid-period branch transfers change the user's geographical metadata (e.g., `EMP009` transferring from Surat to Mumbai on Day 40).

### 7. Noise, Holidays, and Server Outages (Steps 7, 14, 15)
To prevent the machine learning model from conflating any low activity with fraud:
*   **Holidays & Leave**: Zero activity on national holidays and personal leaves.
*   **Training Days**: 2–3 training days per employee where activity drops by 90%.
*   **Server Outage**: A global infrastructure outage on Day 45 (Feb 15) limits everyone's activity to 20%.
*   **Random Bad Days**: A 5% daily chance for any employee to experience a "bad day" (40%–70% drop).
*   **Department Events**: Pre-scheduled monthly compliance audits that cause department-wide workload spikes (Day 28, 29, 58, 59).

---

## ☠️ Gradual Fraud Simulation (The 4 Avoidance Strategies)
Rather than suddenly cutting off all compliance tasks (which is highly unrealistic and easily flagged by basic heuristics), fraud is simulated as a **gradual fade** (linear reduction over 40 days) where the employee continues their primary job but avoids accountability systems.

To make the simulation robust, fraudsters occasionally make mistakes (governed by a `mistake_prob` parameter), accessing oversight systems sporadically to cover their tracks.

| Employee ID | Name | Role | Fraud Strategy | Target Modules Avoided | Fade Timeline |
|---|---|---|---|---|---|
| **EMP001** | Rajesh Kumar | Branch Manager | **Classic Access Void** | Audit Reports, Compliance Dashboard, Override Logs | Day 20 → 60 (to 0%) |
| **EMP010** | Aarti Iyer | Branch Manager | **Override Avoider** | Override Logs only | Day 30 → 70 (to 5%) |
| **EMP015** | Amit Singh | Cashier | **Audit Avoider** | Audit Reports only | Day 25 → 65 (to 2%) |
| **EMP023** | Nikhil Mehta | Compliance Officer | **Chameleon** | Compliance Dashboard, Override Logs | Day 35 → 75 (to 3%) |

---

## 📂 Dataset Outputs and Schema

The simulation outputs files categorized into raw inputs, processed features, and evaluation labels:

### 1. Raw Telemetry (`data/raw/`)
*   **`employees.csv`**: Metadata of all 50 employees, extended with 8 personality columns (work style, shift times, average customers, etc.).
*   **`access_logs.csv`**: Over 977,000 raw clickstream events containing `employee_id`, `timestamp`, `module`, `action`, and `session_id`.
*   **`branches.csv`**: Branch locations, tiers, and regional groupings.
*   **`departments.csv`**: Bank department metadata (headcounts, types).
*   **`holidays.csv`**: National holiday calendar.
*   **`promotions.csv` / `transfers.csv`**: Professional evolution log.

### 2. Processed Matrices (`data/processed/`)
*   **`daily_activity.csv`**: Daily aggregated count matrix (4,500 rows) mapping how many times each of the 15 modules was accessed.
*   **`peer_cohorts.csv`**: Maps employees to 43 distinct peer groups based on **Role + Branch + Experience Level**.
*   **`feature_matrix.csv`**: 4,500 rows by 37 numerical columns. This is the **primary training input** for the Isolation Forest.

### 3. Evaluation & Demo (`data/labels/` and `data/demo/`)
*   **`ground_truth.csv`**: Binary labels (1 = fraud, 0 = normal) for model validation.
*   **`anomaly_reason.csv`**: Standard human-readable forensic reasons.
*   **`demo_dataset.json`**: Pre-sliced 14-day history for the frontend SOC dashboard.

---

## 📈 Feature Engineering Details
The raw activity counts are transformed into **37 behavioral and temporal features** (Step 17, 18, 19) to feed the Isolation Forest. These are divided into:

1.  **Rolling Averages & Deviations**: 7-day, 14-day, and 30-day moving averages and standard deviations for critical audit modules.
2.  **Trend Slopes**: Linear regression slopes calculated over 30-day windows to detect progressive decline trends.
3.  **Peer Comparison Metrics**: Z-scores and percentile ranks calculated dynamically against the employee's specific peer cohort.
4.  **Temporal Gaps**: "Days since last access" features for Audit, Compliance, and Override modules.
5.  **Behavioral Ratios**: Ratio of audit access counts to core approvals, and critical module missing percentages.
6.  **Session Features**: Average session duration, daily login time variance, and context-switching scores.
