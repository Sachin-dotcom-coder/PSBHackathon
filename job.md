# PHANTOM - Engine 2 Dataset Generation Guide
## Owner: Vishal (Engine 2 - Negative Access Profiler)

---

# Goal

The objective of this dataset is **NOT** to generate fraud.

The objective is to simulate how employees normally work inside a bank so that Engine 2 can detect **Negative Access Signals** (employees intentionally avoiding systems they should normally access).

The final output of this dataset will be used to:

- Train the Isolation Forest
- Calculate Access Void Scores
- Feed the demo dashboard
- Demonstrate the complete Engine 2 pipeline

---

# Overall Dataset Pipeline

```
Bank
│
├── Employees
│
├── Branches
│
├── Departments
│
├── Banking Modules
│
├── Role Permissions
│
├── Employee Daily Behaviour
│
├── Access Logs
│
├── Inject Suspicious Behaviour
│
├── Feature Engineering
│
└── Isolation Forest
```

---

# STEP 1 — Create the Bank

Before generating employees, define the bank.

Example

Branches

```
Surat
Mumbai
Ahmedabad
Delhi
Bangalore
```

Departments

```
Loans
Retail Banking
Compliance
Treasury
Operations
Risk
Customer Service
```

Banking Modules

```
Customer Search
Loan Approval
Loan Review
Audit Reports
Compliance Dashboard
Override Logs
KYC Portal
Cash Operations
Transaction History
Treasury
Risk Dashboard
Account Creation
Account Closure
Locker Management
```

Each module should have

```
module_id
module_name
criticality
department
```

Example

| Module | Critical? |
|----------|-----------|
| Customer Search | No |
| Loan Approval | Yes |
| Audit Reports | Yes |
| Compliance Dashboard | Yes |
| Override Logs | Yes |
| Treasury | Yes |
| KYC Portal | Medium |

Store this as

```
modules.csv
```

---

# STEP 2 — Define Employee Roles

Every role should have different responsibilities.

Example roles

```
Loan Officer

Branch Manager

Cashier

Compliance Officer

Relationship Manager

Operations Officer

Treasury Officer

Risk Analyst
```

Each role should contain

```
role_id

role_name

department

expected_modules
```

Example

Loan Officer

```
Customer Search

Loan Approval

Loan Review

Audit Reports

Compliance Dashboard

Override Logs
```

Cashier

```
Cash Operations

Transaction History

Customer Search

Account Verification
```

Compliance Officer

```
Audit Reports

Compliance Dashboard

Override Logs

Reports

Transaction History
```

Store this as

```
role_permissions.csv
```

---

# STEP 3 — Generate Employees

Generate approximately

```
50 Employees
```

Each employee should have

```
employee_id

name

role

department

branch

experience_years

joining_date

manager

status
```

Example

| Field | Example |
|--------|----------|
| Employee ID | EMP001 |
| Name | Rajesh Sharma |
| Role | Loan Officer |
| Department | Loans |
| Branch | Surat |
| Experience | 5 |
| Joining Date | 2020-06-15 |
| Manager | EMP041 |
| Status | Active |

Save as

```
employees.csv
```

---

# STEP 4 — Generate Normal Behaviour Profiles

Every role behaves differently.

Example

Loan Officer

Average Daily Access

```
Loan Approval

100-140
```

Customer Search

```
70-110
```

Audit Reports

```
15-30
```

Compliance Dashboard

```
10-20
```

Override Logs

```
8-15
```

Cashier

Cash Operations

```
250-350
```

Customer Search

```
40-80
```

Audit

```
2-5
```

Compliance Officer

Audit Reports

```
70-120
```

Compliance Dashboard

```
40-70
```

Override Logs

```
20-40
```

Create one profile for every role.

---

# STEP 5 — Generate Daily Activity

Generate

```
90 Days
```

For

```
50 Employees
```

Each employee receives different activity every day.

DO NOT generate identical numbers.

Instead use random variation.

Example

Rajesh

Day 1

```
Loan Approval = 120

Customer Search = 95

Audit = 22

Compliance = 18

Override = 13
```

Day 2

```
Loan Approval = 118

Customer Search = 91

Audit = 20

Compliance = 17

Override = 12
```

Day 3

```
Loan Approval = 124

Customer Search = 98

Audit = 25

Compliance = 19

Override = 14
```

The variation should look natural.

---

# STEP 6 — Convert Daily Activity into Access Logs

Instead of storing only totals, create raw events.

Example

```
2026-01-01 09:02

Loan Approval
```

```
2026-01-01 09:03

Customer Search
```

```
2026-01-01 09:06

Loan Approval
```

```
2026-01-01 09:10

Audit Reports
```

Each row becomes

| employee_id | timestamp | module | action | session |
|-------------|-----------|---------|---------|----------|
| EMP001 | 2026-01-01 09:02 | Loan Approval | View | S101 |
| EMP001 | 2026-01-01 09:03 | Customer Search | Search | S101 |

Save as

```
access_logs.csv
```

This should become the largest dataset.

---

# STEP 7 — Create Peer Cohorts

Employees should never be compared globally.

Instead create peer groups.

Example

```
Loan Officer

+

Surat Branch

+

Experience 3-6 Years
```

This becomes

```
Peer Cohort 1
```

Another

```
Loan Officer

Mumbai

3-6 Years
```

becomes

```
Peer Cohort 2
```

Each employee belongs to one cohort.

Store

```
peer_cohorts.csv
```

---

# STEP 8 — Inject Suspicious Behaviour

Choose

```
3-5 Employees
```

These become suspicious.

Example

Rajesh

Days 1-50

Audit

```
23

24

22

21

24
```

Days 51-70

```
18

15

12

9

6

3

2

1
```

Days 71-90

```
0

0

0

0

0

0
```

Loan Approval

```
120

118

119

122
```

remains unchanged.

Similarly decrease

```
Compliance

Override Logs
```

This creates the Negative Access Signal.

DO NOT reduce all activity.

Only remove accesses to

- Audit
- Compliance
- Override

This is exactly what Engine 2 is designed to detect.

---

# STEP 9 — Ground Truth

Create

```
ground_truth.csv
```

Example

| Employee | Fraud |
|------------|--------|
| EMP001 | 1 |
| EMP002 | 0 |
| EMP003 | 0 |
| EMP004 | 0 |

Isolation Forest WILL NOT use this during training.

It is only used for evaluation.

---

# STEP 10 — Feature Engineering Dataset

Convert access logs into one row per employee per day.

Example

| Employee | Loan | Audit | Compliance | Override |
|------------|------|--------|------------|-----------|
| EMP001 |120|24|18|13|
| EMP001 |118|22|17|14|
| EMP001 |119|0|0|0|

Now calculate features.

Required features

```
loan_access_count

customer_search_count

audit_access_count

compliance_access_count

override_access_count

days_since_last_audit

days_since_last_compliance

days_since_last_override

rolling_7_day_audit_average

rolling_30_day_audit_average

audit_drop_percentage

compliance_drop_percentage

override_drop_percentage

audit_to_loan_ratio

compliance_to_loan_ratio

critical_module_missing_percentage

peer_average_difference

peer_standard_deviation

expected_modules_accessed

expected_modules_missing

total_daily_accesses
```

Save

```
feature_matrix.csv
```

This is the ONLY file Isolation Forest trains on.

---

# Final Folder Structure

```
data/

├── raw/
│
│   ├── employees.csv
│
│   ├── modules.csv
│
│   ├── role_permissions.csv
│
│   ├── access_logs.csv
│
│   └── ground_truth.csv
│
├── processed/
│
│   ├── peer_cohorts.csv
│
│   ├── daily_activity.csv
│
│   ├── engineered_features.csv
│
│   └── feature_matrix.csv
│
└── demo/
    └── demo_dataset.json
```

---

# Data Flow

```
Employees
      │
      ▼
Role Permissions
      │
      ▼
Generate Daily Behaviour
      │
      ▼
Generate Access Logs
      │
      ▼
Inject Suspicious Behaviour
      │
      ▼
Build Peer Cohorts
      │
      ▼
Engineer Features
      │
      ▼
Feature Matrix
      │
      ▼
Isolation Forest
      │
      ▼
Access Void Score
      │
      ▼
Dashboard
```

---

# Expected Dataset Size

```
Employees:
50

Roles:
8

Branches:
5

Modules:
15

Days:
90

Access Logs:
≈300,000–700,000 rows

Feature Matrix:
≈4500 rows
(50 employees × 90 days)

Isolation Forest Input:
4500 samples × ~20 engineered features
```

---

# Important Rule

**Engine 2 is NOT trained on raw access logs.**

It is trained only on the engineered `feature_matrix.csv`, which is derived from the raw logs. The raw logs exist to simulate realistic banking activity and to support feature engineering.