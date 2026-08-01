"""
PHANTOM — Engine 2 Dataset Generation Script
Owner: Vishal (Engine 2 — Negative Access Profiler)

Executes all 10 steps from job.md:
  Step 1  → modules.csv
  Step 2  → role_permissions.csv
  Step 3  → employees.csv
  Step 4  → normal behaviour profiles (in-memory)
  Step 5  → daily_activity.csv
  Step 6  → access_logs.csv
  Step 7  → peer_cohorts.csv
  Step 8  → inject suspicious behaviour (modifies daily_activity + access_logs)
  Step 9  → ground_truth.csv
  Step 10 → engineered_features.csv + feature_matrix.csv

Output folder layout (as specified in job.md):
  data/
    raw/
      employees.csv
      modules.csv
      role_permissions.csv
      access_logs.csv
      ground_truth.csv
    processed/
      peer_cohorts.csv
      daily_activity.csv
      engineered_features.csv
      feature_matrix.csv
    demo/
      demo_dataset.json
"""

import os
import csv
import json
import random
import math
from datetime import datetime, timedelta, date

# ─────────────────────────────────────────────
# SEED for reproducibility
# ─────────────────────────────────────────────
random.seed(42)

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
RAW_DIR     = os.path.join(BASE_DIR, "raw")
PROC_DIR    = os.path.join(BASE_DIR, "processed")
DEMO_DIR    = os.path.join(BASE_DIR, "demo")

for d in [RAW_DIR, PROC_DIR, DEMO_DIR]:
    os.makedirs(d, exist_ok=True)

# ─────────────────────────────────────────────
# STEP 1 — Create the Bank
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 1 — Creating Bank Structure")
print("=" * 60)

BRANCHES = ["Surat", "Mumbai", "Ahmedabad", "Delhi", "Bangalore"]

DEPARTMENTS = [
    "Loans", "Retail Banking", "Compliance",
    "Treasury", "Operations", "Risk", "Customer Service"
]

# 15 banking modules (as specified in job.md, extended to hit 15)
MODULES = [
    {"module_id": "MOD01", "module_name": "Customer Search",        "criticality": "Low",    "department": "Retail Banking"},
    {"module_id": "MOD02", "module_name": "Loan Approval",          "criticality": "High",   "department": "Loans"},
    {"module_id": "MOD03", "module_name": "Loan Review",            "criticality": "High",   "department": "Loans"},
    {"module_id": "MOD04", "module_name": "Audit Reports",          "criticality": "High",   "department": "Compliance"},
    {"module_id": "MOD05", "module_name": "Compliance Dashboard",   "criticality": "High",   "department": "Compliance"},
    {"module_id": "MOD06", "module_name": "Override Logs",          "criticality": "High",   "department": "Compliance"},
    {"module_id": "MOD07", "module_name": "KYC Portal",             "criticality": "Medium", "department": "Retail Banking"},
    {"module_id": "MOD08", "module_name": "Cash Operations",        "criticality": "High",   "department": "Operations"},
    {"module_id": "MOD09", "module_name": "Transaction History",    "criticality": "Medium", "department": "Operations"},
    {"module_id": "MOD10", "module_name": "Treasury",               "criticality": "High",   "department": "Treasury"},
    {"module_id": "MOD11", "module_name": "Risk Dashboard",         "criticality": "High",   "department": "Risk"},
    {"module_id": "MOD12", "module_name": "Account Creation",       "criticality": "High",   "department": "Retail Banking"},
    {"module_id": "MOD13", "module_name": "Account Closure",        "criticality": "High",   "department": "Retail Banking"},
    {"module_id": "MOD14", "module_name": "Locker Management",      "criticality": "Medium", "department": "Operations"},
    {"module_id": "MOD15", "module_name": "Reports",                "criticality": "Medium", "department": "Compliance"},
]

MODULE_NAME_TO_ID = {m["module_name"]: m["module_id"] for m in MODULES}
MODULE_ID_TO_NAME = {m["module_id"]: m["module_name"] for m in MODULES}

# Critical modules (the ones whose absence signals fraud)
AUDIT_MODULES     = {"Audit Reports", "Compliance Dashboard", "Override Logs"}
CRITICAL_MODULES  = {m["module_name"] for m in MODULES if m["criticality"] == "High"}

# Write modules.csv
modules_path = os.path.join(RAW_DIR, "modules.csv")
with open(modules_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["module_id", "module_name", "criticality", "department"])
    writer.writeheader()
    writer.writerows(MODULES)
print(f"  ✓ modules.csv ({len(MODULES)} modules)")

# ─────────────────────────────────────────────
# STEP 2 — Define Employee Roles
# ─────────────────────────────────────────────
print("\nSTEP 2 — Defining Employee Roles")
print("=" * 60)

# Each role: role_id, role_name, department, expected_modules (list of module names)
ROLES = [
    {
        "role_id": "R01", "role_name": "Loan Officer", "department": "Loans",
        "expected_modules": [
            "Customer Search", "Loan Approval", "Loan Review",
            "Audit Reports", "Compliance Dashboard", "Override Logs"
        ]
    },
    {
        "role_id": "R02", "role_name": "Branch Manager", "department": "Retail Banking",
        "expected_modules": [
            "Customer Search", "Loan Approval", "Loan Review",
            "Audit Reports", "Compliance Dashboard", "Override Logs",
            "Account Creation", "Account Closure", "Reports", "Risk Dashboard"
        ]
    },
    {
        "role_id": "R03", "role_name": "Cashier", "department": "Operations",
        "expected_modules": [
            "Cash Operations", "Transaction History", "Customer Search",
            "Account Creation", "KYC Portal"
        ]
    },
    {
        "role_id": "R04", "role_name": "Compliance Officer", "department": "Compliance",
        "expected_modules": [
            "Audit Reports", "Compliance Dashboard", "Override Logs",
            "Reports", "Transaction History"
        ]
    },
    {
        "role_id": "R05", "role_name": "Relationship Manager", "department": "Retail Banking",
        "expected_modules": [
            "Customer Search", "Loan Approval", "KYC Portal",
            "Account Creation", "Account Closure"
        ]
    },
    {
        "role_id": "R06", "role_name": "Operations Officer", "department": "Operations",
        "expected_modules": [
            "Cash Operations", "Transaction History", "Locker Management",
            "Account Creation", "Account Closure", "KYC Portal"
        ]
    },
    {
        "role_id": "R07", "role_name": "Treasury Officer", "department": "Treasury",
        "expected_modules": [
            "Treasury", "Reports", "Risk Dashboard", "Audit Reports"
        ]
    },
    {
        "role_id": "R08", "role_name": "Risk Analyst", "department": "Risk",
        "expected_modules": [
            "Risk Dashboard", "Audit Reports", "Compliance Dashboard",
            "Reports", "Transaction History"
        ]
    },
]

ROLE_NAME_TO_OBJ = {r["role_name"]: r for r in ROLES}

# Write role_permissions.csv — one row per (role, module) pair
rp_path = os.path.join(RAW_DIR, "role_permissions.csv")
role_perm_rows = []
for role in ROLES:
    for mod in role["expected_modules"]:
        role_perm_rows.append({
            "role_id": role["role_id"],
            "role_name": role["role_name"],
            "department": role["department"],
            "module_name": mod,
            "module_id": MODULE_NAME_TO_ID.get(mod, "")
        })

with open(rp_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["role_id", "role_name", "department", "module_name", "module_id"])
    writer.writeheader()
    writer.writerows(role_perm_rows)
print(f"  ✓ role_permissions.csv ({len(role_perm_rows)} rows)")

# ─────────────────────────────────────────────
# STEP 3 — Generate Employees (50 employees)
# ─────────────────────────────────────────────
print("\nSTEP 3 — Generating 50 Employees")
print("=" * 60)

FIRST_NAMES = [
    "Rajesh", "Priya", "Anil", "Sunita", "Vikram", "Meena", "Arjun",
    "Kavita", "Deepak", "Aarti", "Sanjay", "Neha", "Ravi", "Pooja",
    "Amit", "Shweta", "Rahul", "Anjali", "Suresh", "Divya", "Kiran",
    "Smita", "Nikhil", "Rekha", "Manish", "Pallavi", "Gaurav", "Sneha",
    "Vivek", "Nisha", "Ashok", "Madhuri", "Rohit", "Geeta", "Harish",
    "Lakshmi", "Dinesh", "Usha", "Prakash", "Rina", "Mohan", "Shalini",
    "Nilesh", "Anita", "Vijay", "Seema", "Krishna", "Tara", "Ajay", "Radha"
]
LAST_NAMES = [
    "Sharma", "Patel", "Kumar", "Singh", "Verma", "Gupta", "Mehta",
    "Joshi", "Shah", "Rao", "Nair", "Iyer", "Pillai", "Reddy", "Mishra",
    "Tiwari", "Dubey", "Yadav", "Pandey", "Saxena"
]

# Role distribution across 50 employees
ROLE_SLOTS = {
    "Loan Officer": 9,
    "Branch Manager": 5,
    "Cashier": 8,
    "Compliance Officer": 6,
    "Relationship Manager": 8,
    "Operations Officer": 6,
    "Treasury Officer": 4,
    "Risk Analyst": 4,
}
assert sum(ROLE_SLOTS.values()) == 50

def generate_joining_date(exp_years: int) -> str:
    latest = date(2024, 1, 1)
    earliest = latest - timedelta(days=int(exp_years * 365 + 365))
    delta = (latest - earliest).days
    jd = earliest + timedelta(days=random.randint(0, delta))
    return jd.strftime("%Y-%m-%d")

# Build employee list
employees = []
emp_counter = 1
for role_name, count in ROLE_SLOTS.items():
    role_obj = ROLE_NAME_TO_OBJ[role_name]
    dept = role_obj["department"]
    for _ in range(count):
        emp_id = f"EMP{emp_counter:03d}"
        fname = FIRST_NAMES[(emp_counter - 1) % len(FIRST_NAMES)]
        lname = random.choice(LAST_NAMES)
        exp = round(random.uniform(1.5, 18.0), 1)
        branch = random.choice(BRANCHES)
        jdate = generate_joining_date(exp)
        employees.append({
            "employee_id": emp_id,
            "name": f"{fname} {lname}",
            "role": role_name,
            "role_id": role_obj["role_id"],
            "department": dept,
            "branch": branch,
            "experience_years": exp,
            "joining_date": jdate,
            "manager": None,   # fill after
            "status": "Active"
        })
        emp_counter += 1

# Assign managers: Branch Managers manage others in the same branch
branch_managers = {e["employee_id"]: e for e in employees if e["role"] == "Branch Manager"}

def pick_manager_for(emp):
    same_branch_mgrs = [
        bm for bm in branch_managers.values()
        if bm["branch"] == emp["branch"] and bm["employee_id"] != emp["employee_id"]
    ]
    if same_branch_mgrs:
        return random.choice(same_branch_mgrs)["employee_id"]
    if branch_managers:
        return random.choice(list(branch_managers.keys()))
    return None

for emp in employees:
    if emp["role"] != "Branch Manager":
        emp["manager"] = pick_manager_for(emp)
    else:
        # Branch manager reports to another branch manager or self-managed
        others = [bm for bm in branch_managers.values() if bm["employee_id"] != emp["employee_id"]]
        emp["manager"] = others[0]["employee_id"] if others else emp["employee_id"]

emp_path = os.path.join(RAW_DIR, "employees.csv")
with open(emp_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "employee_id", "name", "role", "role_id", "department",
        "branch", "experience_years", "joining_date", "manager", "status"
    ])
    writer.writeheader()
    writer.writerows(employees)
print(f"  ✓ employees.csv ({len(employees)} employees)")

EMP_MAP = {e["employee_id"]: e for e in employees}

# ─────────────────────────────────────────────
# STEP 4 — Normal Behaviour Profiles
# ─────────────────────────────────────────────
print("\nSTEP 4 — Defining Normal Behaviour Profiles")
print("=" * 60)

# daily_range: (min, max) accesses per day for a given module, for a given role
# If a module is not in the role's expected_modules, its range is (0, 0)
NORMAL_PROFILE = {
    "Loan Officer": {
        "Loan Approval":        (100, 140),
        "Customer Search":      (70,  110),
        "Loan Review":          (50,  90),
        "Audit Reports":        (15,  30),
        "Compliance Dashboard": (10,  20),
        "Override Logs":        (8,   15),
    },
    "Branch Manager": {
        "Customer Search":      (30,  60),
        "Loan Approval":        (20,  50),
        "Loan Review":          (15,  40),
        "Audit Reports":        (25,  45),
        "Compliance Dashboard": (20,  40),
        "Override Logs":        (10,  25),
        "Account Creation":     (10,  25),
        "Account Closure":      (5,   15),
        "Reports":              (15,  30),
        "Risk Dashboard":       (10,  25),
    },
    "Cashier": {
        "Cash Operations":      (250, 350),
        "Transaction History":  (40,  80),
        "Customer Search":      (40,  80),
        "Account Creation":     (10,  25),
        "KYC Portal":           (5,   15),
    },
    "Compliance Officer": {
        "Audit Reports":        (70,  120),
        "Compliance Dashboard": (40,  70),
        "Override Logs":        (20,  40),
        "Reports":              (30,  55),
        "Transaction History":  (15,  35),
    },
    "Relationship Manager": {
        "Customer Search":      (80,  130),
        "Loan Approval":        (30,  70),
        "KYC Portal":           (20,  45),
        "Account Creation":     (15,  35),
        "Account Closure":      (5,   20),
    },
    "Operations Officer": {
        "Cash Operations":      (80,  140),
        "Transaction History":  (50,  90),
        "Locker Management":    (10,  30),
        "Account Creation":     (20,  45),
        "Account Closure":      (10,  25),
        "KYC Portal":           (10,  25),
    },
    "Treasury Officer": {
        "Treasury":             (80,  150),
        "Reports":              (20,  45),
        "Risk Dashboard":       (15,  35),
        "Audit Reports":        (10,  25),
    },
    "Risk Analyst": {
        "Risk Dashboard":       (70,  120),
        "Audit Reports":        (30,  60),
        "Compliance Dashboard": (20,  45),
        "Reports":              (25,  50),
        "Transaction History":  (20,  45),
    },
}

print(f"  ✓ Normal behaviour profiles defined for {len(NORMAL_PROFILE)} roles")

# ─────────────────────────────────────────────
# STEP 5 — Generate Daily Activity (90 days × 50 employees)
# ─────────────────────────────────────────────
print("\nSTEP 5 — Generating 90-Day Activity (50 employees)")
print("=" * 60)

START_DATE = date(2026, 1, 1)
NUM_DAYS   = 90

def simulate_daily_accesses(role_name: str, day_index: int) -> dict:
    """Return {module_name: count} for one employee, one day.
    Adds random natural variation (gaussian noise + weekend dips)."""
    profile = NORMAL_PROFILE.get(role_name, {})
    result = {}
    # Weekend factor (Saturday = day 5, Sunday = day 6 of week)
    sim_date = START_DATE + timedelta(days=day_index)
    is_weekend = sim_date.weekday() >= 5
    weekend_factor = random.uniform(0.0, 0.25) if is_weekend else 1.0

    for module, (lo, hi) in profile.items():
        base = random.randint(lo, hi)
        # Add gaussian noise ±8%
        noise = int(base * random.gauss(0, 0.08))
        count = max(0, int((base + noise) * weekend_factor))
        result[module] = count
    return result

# daily_activity: list of {employee_id, date, module, count}
# Also keep a structured dict for fast lookup: daily_lookup[emp_id][day_idx][module] = count
daily_lookup = {}   # emp_id → {day_idx → {module → count}}
for emp in employees:
    eid = emp["employee_id"]
    daily_lookup[eid] = {}
    for day_idx in range(NUM_DAYS):
        daily_lookup[eid][day_idx] = simulate_daily_accesses(emp["role"], day_idx)

print(f"  ✓ Daily activity generated (50 × 90 = 4,500 employee-days)")

# ─────────────────────────────────────────────
# STEP 7 — Create Peer Cohorts
# (done before Step 6 so cohort IDs are available for feature engineering)
# ─────────────────────────────────────────────
print("\nSTEP 7 — Building Peer Cohorts")
print("=" * 60)

def experience_bucket(exp):
    if exp <= 3:
        return "0-3yr"
    elif exp <= 6:
        return "3-6yr"
    elif exp <= 12:
        return "6-12yr"
    else:
        return "12+yr"

# cohort key = (role, branch, exp_bucket)
cohort_map = {}     # cohort_key → cohort_id
emp_cohort  = {}    # emp_id → cohort_id
cohort_ctr  = 1

for emp in employees:
    key = (emp["role"], emp["branch"], experience_bucket(emp["experience_years"]))
    if key not in cohort_map:
        cohort_map[key] = f"COHORT{cohort_ctr:03d}"
        cohort_ctr += 1
    emp_cohort[emp["employee_id"]] = cohort_map[key]

# cohort_members: cohort_id → list of emp_ids
cohort_members = {}
for eid, cid in emp_cohort.items():
    cohort_members.setdefault(cid, []).append(eid)

peer_cohort_rows = []
for emp in employees:
    eid = emp["employee_id"]
    cid = emp_cohort[eid]
    key = next(k for k, v in cohort_map.items() if v == cid)
    peer_cohort_rows.append({
        "employee_id": eid,
        "cohort_id": cid,
        "role": key[0],
        "branch": key[1],
        "experience_bucket": key[2],
        "cohort_size": len(cohort_members[cid])
    })

pc_path = os.path.join(PROC_DIR, "peer_cohorts.csv")
with open(pc_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["employee_id", "cohort_id", "role", "branch", "experience_bucket", "cohort_size"])
    writer.writeheader()
    writer.writerows(peer_cohort_rows)
print(f"  ✓ peer_cohorts.csv ({len(cohort_map)} unique cohorts)")

# ─────────────────────────────────────────────
# STEP 8 — Inject Suspicious Behaviour
# ─────────────────────────────────────────────
print("\nSTEP 8 — Injecting Suspicious Behaviour (Negative Access Signal)")
print("=" * 60)

# Choose 4 employees to become suspicious
# Pick one from different roles/branches for diversity
SUSPICIOUS_EIDS = []
seen_roles = set()
for emp in employees:
    if emp["role"] in ("Loan Officer", "Branch Manager", "Compliance Officer", "Cashier") \
       and emp["role"] not in seen_roles:
        SUSPICIOUS_EIDS.append(emp["employee_id"])
        seen_roles.add(emp["role"])
    if len(SUSPICIOUS_EIDS) == 4:
        break

# Make SUSPICIOUS_EIDS[0] the "Rajesh Kumar" proxy — score 82 on the demo
# Rename the first suspicious employee to match the demo
demo_suspect = SUSPICIOUS_EIDS[0]
EMP_MAP[demo_suspect]["name"] = "Rajesh Kumar"
EMP_MAP[demo_suspect]["role"] = "Branch Manager"
EMP_MAP[demo_suspect]["branch"] = "Mumbai"

print(f"  Suspicious employees: {SUSPICIOUS_EIDS}")

def inject_negative_signal(emp_id: str, start_fade_day: int = 50, zero_day: int = 70):
    """
    For the suspicious employee:
    - Days 0 → start_fade_day: Normal access (already generated)
    - Days start_fade_day → zero_day: Gradually reduce Audit/Compliance/Override
    - Days zero_day → 90: Zero access to those modules
    Loan Approval and other work-related modules remain unchanged.
    """
    for day_idx in range(start_fade_day, NUM_DAYS):
        day_data = daily_lookup[emp_id][day_idx]
        for audit_mod in ["Audit Reports", "Compliance Dashboard", "Override Logs"]:
            if audit_mod not in day_data:
                continue
            if day_idx >= zero_day:
                day_data[audit_mod] = 0
            else:
                # Linear fade from original value down toward 0
                original = day_data[audit_mod]
                progress = (day_idx - start_fade_day) / max(1, (zero_day - start_fade_day))
                faded = max(0, int(original * (1 - progress) * random.uniform(0.7, 1.0)))
                day_data[audit_mod] = faded

# Apply with slightly different fade windows per employee
fade_configs = [
    (50, 70),   # emp 0 — clearest signal
    (55, 75),   # emp 1
    (45, 65),   # emp 2
    (60, 80),   # emp 3
]
for i, eid in enumerate(SUSPICIOUS_EIDS):
    start_f, zero_d = fade_configs[i]
    inject_negative_signal(eid, start_f, zero_d)

print(f"  ✓ Negative Access Signal injected into {len(SUSPICIOUS_EIDS)} employees")
print(f"    (Audit/Compliance/Override gradually reduced to 0, other modules unchanged)")

# ─────────────────────────────────────────────
# STEP 5 continued — Write daily_activity.csv
# ─────────────────────────────────────────────
print("\nSTEP 5 (cont.) — Writing daily_activity.csv")
print("=" * 60)

da_path = os.path.join(PROC_DIR, "daily_activity.csv")
all_modules_in_profile = set()
for profile in NORMAL_PROFILE.values():
    all_modules_in_profile.update(profile.keys())
all_modules_sorted = sorted(all_modules_in_profile)

da_fieldnames = ["employee_id", "date", "day_index"] + all_modules_sorted + ["total_daily_accesses", "is_suspicious"]
suspicious_set = set(SUSPICIOUS_EIDS)

with open(da_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=da_fieldnames)
    writer.writeheader()
    for emp in employees:
        eid = emp["employee_id"]
        for day_idx in range(NUM_DAYS):
            sim_date = START_DATE + timedelta(days=day_idx)
            row = {
                "employee_id": eid,
                "date": sim_date.strftime("%Y-%m-%d"),
                "day_index": day_idx,
                "is_suspicious": 1 if eid in suspicious_set else 0
            }
            day_data = daily_lookup[eid][day_idx]
            total = 0
            for mod in all_modules_sorted:
                cnt = day_data.get(mod, 0)
                row[mod] = cnt
                total += cnt
            row["total_daily_accesses"] = total
            writer.writerow(row)

print(f"  ✓ daily_activity.csv (50 employees × 90 days = 4,500 rows)")

# ─────────────────────────────────────────────
# STEP 6 — Convert Daily Activity into Access Logs
# ─────────────────────────────────────────────
print("\nSTEP 6 — Generating Raw Access Logs")
print("=" * 60)

ACTIONS_MAP = {
    "Customer Search":      ["Search", "View"],
    "Loan Approval":        ["Approve", "View", "Submit"],
    "Loan Review":          ["Review", "View", "Comment"],
    "Audit Reports":        ["View", "Export"],
    "Compliance Dashboard": ["View", "Check"],
    "Override Logs":        ["View", "Submit"],
    "KYC Portal":           ["View", "Verify", "Upload"],
    "Cash Operations":      ["Process", "View", "Submit"],
    "Transaction History":  ["View", "Search", "Export"],
    "Treasury":             ["View", "Trade", "Review"],
    "Risk Dashboard":       ["View", "Assess"],
    "Account Creation":     ["Create", "View"],
    "Account Closure":      ["Close", "View"],
    "Locker Management":    ["Assign", "View"],
    "Reports":              ["View", "Export", "Generate"],
}

WORK_START_HOUR = 9
WORK_END_HOUR   = 18   # 6 PM

session_counter = 1

access_log_path = os.path.join(RAW_DIR, "access_logs.csv")
total_log_rows  = 0

with open(access_log_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["employee_id", "timestamp", "module", "action", "session_id"])
    writer.writeheader()

    for emp in employees:
        eid = emp["employee_id"]
        for day_idx in range(NUM_DAYS):
            sim_date = START_DATE + timedelta(days=day_idx)
            day_data = daily_lookup[eid][day_idx]

            # Build event pool: one event per access count
            events_pool = []
            for mod, cnt in day_data.items():
                actions = ACTIONS_MAP.get(mod, ["View"])
                for _ in range(cnt):
                    events_pool.append((mod, random.choice(actions)))

            if not events_pool:
                continue

            # Shuffle to simulate realistic interleaving
            random.shuffle(events_pool)

            # Spread events across the work day with realistic timing
            total_events = len(events_pool)
            work_seconds = (WORK_END_HOUR - WORK_START_HOUR) * 3600
            base_dt = datetime(
                sim_date.year, sim_date.month, sim_date.day,
                WORK_START_HOUR, 0, 0
            )

            # Break into 1–3 sessions per day
            num_sessions = random.randint(1, 3)
            sessions = []
            for s in range(num_sessions):
                sess_id = f"S{session_counter:06d}"
                session_counter += 1
                sessions.append(sess_id)

            # Assign each event a timestamp offset (sorted) and a session
            offsets = sorted(random.sample(range(work_seconds), min(total_events, work_seconds)))
            if len(offsets) < total_events:
                offsets += [offsets[-1] + i for i in range(1, total_events - len(offsets) + 1)]

            for i, (mod, action) in enumerate(events_pool):
                offset = offsets[i] if i < len(offsets) else offsets[-1] + i
                ts = base_dt + timedelta(seconds=offset)
                sess = sessions[i % num_sessions]
                writer.writerow({
                    "employee_id": eid,
                    "timestamp":   ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "module":      mod,
                    "action":      action,
                    "session_id":  sess
                })
                total_log_rows += 1

print(f"  ✓ access_logs.csv ({total_log_rows:,} rows)")

# ─────────────────────────────────────────────
# STEP 9 — Ground Truth
# ─────────────────────────────────────────────
print("\nSTEP 9 — Writing Ground Truth")
print("=" * 60)

gt_path = os.path.join(RAW_DIR, "ground_truth.csv")
with open(gt_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["employee_id", "name", "role", "fraud_label"])
    writer.writeheader()
    for emp in employees:
        eid = emp["employee_id"]
        writer.writerow({
            "employee_id":  eid,
            "name":         emp["name"],
            "role":         emp["role"],
            "fraud_label":  1 if eid in suspicious_set else 0
        })

fraud_count = len(SUSPICIOUS_EIDS)
print(f"  ✓ ground_truth.csv (50 employees, {fraud_count} labeled as fraud=1)")
print(f"    NOTE: Isolation Forest will NOT use this for training — evaluation only")

# ─────────────────────────────────────────────
# STEP 10 — Feature Engineering
# ─────────────────────────────────────────────
print("\nSTEP 10 — Engineering Features (feature_matrix.csv)")
print("=" * 60)

# Build per-cohort peer averages from normal (non-suspicious) employees
# cohort_peer_avg[cohort_id][module] = avg daily access count (over all non-suspicious employees + all days)
cohort_peer_avg = {}
cohort_peer_std = {}

for cid, members in cohort_members.items():
    normal_members = [m for m in members if m not in suspicious_set]
    if not normal_members:
        normal_members = members  # fallback

    per_module_totals = {}
    per_module_sq     = {}
    count             = 0

    for eid in normal_members:
        for day_idx in range(NUM_DAYS):
            day_data = daily_lookup[eid][day_idx]
            for mod, val in day_data.items():
                per_module_totals[mod] = per_module_totals.get(mod, 0) + val
                per_module_sq[mod]     = per_module_sq.get(mod, 0) + val * val
            count += 1

    cohort_peer_avg[cid] = {}
    cohort_peer_std[cid] = {}
    for mod in per_module_totals:
        avg = per_module_totals[mod] / max(1, count)
        variance = (per_module_sq[mod] / max(1, count)) - (avg ** 2)
        std = math.sqrt(max(0, variance))
        cohort_peer_avg[cid][mod] = round(avg, 2)
        cohort_peer_std[cid][mod] = round(std, 2)

# Feature computation per employee per day
feature_rows = []

for emp in employees:
    eid   = emp["employee_id"]
    role  = emp["role"]
    cid   = emp_cohort[eid]
    expected_mods = set(ROLE_NAME_TO_OBJ[role]["expected_modules"])

    for day_idx in range(NUM_DAYS):
        sim_date  = START_DATE + timedelta(days=day_idx)
        day_data  = daily_lookup[eid][day_idx]

        # Raw counts
        loan_access_count       = day_data.get("Loan Approval", 0)
        customer_search_count   = day_data.get("Customer Search", 0)
        audit_access_count      = day_data.get("Audit Reports", 0)
        compliance_access_count = day_data.get("Compliance Dashboard", 0)
        override_access_count   = day_data.get("Override Logs", 0)
        total_daily_accesses    = sum(day_data.values())

        # days_since_last_* — look backward
        def days_since_last(mod, up_to_day):
            for d in range(up_to_day - 1, -1, -1):
                if daily_lookup[eid][d].get(mod, 0) > 0:
                    return up_to_day - d
            return up_to_day + 1   # never accessed

        days_since_last_audit      = days_since_last("Audit Reports",        day_idx)
        days_since_last_compliance = days_since_last("Compliance Dashboard",  day_idx)
        days_since_last_override   = days_since_last("Override Logs",         day_idx)

        # Rolling averages
        def rolling_avg(mod, window, up_to_day):
            vals = [daily_lookup[eid][d].get(mod, 0) for d in range(max(0, up_to_day - window), up_to_day)]
            return round(sum(vals) / max(1, len(vals)), 2) if vals else 0.0

        rolling_7_day_audit_avg  = rolling_avg("Audit Reports", 7,  day_idx)
        rolling_30_day_audit_avg = rolling_avg("Audit Reports", 30, day_idx)

        # Baseline: average of first 7 days for drop % calculation (or rolling 30)
        baseline_audit      = rolling_avg("Audit Reports",        30, max(day_idx, 1))
        baseline_compliance = rolling_avg("Compliance Dashboard",  30, max(day_idx, 1))
        baseline_override   = rolling_avg("Override Logs",         30, max(day_idx, 1))

        def drop_pct(current, baseline):
            if baseline == 0:
                return 0.0
            return round(max(0.0, (baseline - current) / baseline * 100), 2)

        audit_drop_pct      = drop_pct(audit_access_count,      baseline_audit)
        compliance_drop_pct = drop_pct(compliance_access_count, baseline_compliance)
        override_drop_pct   = drop_pct(override_access_count,   baseline_override)

        # Ratios
        def ratio(num, denom):
            return round(num / max(1, denom), 4)

        audit_to_loan_ratio      = ratio(audit_access_count,      loan_access_count)
        compliance_to_loan_ratio = ratio(compliance_access_count, loan_access_count)

        # critical_module_missing_percentage
        # = fraction of expected_modules that the employee accessed 0 times today
        accessed_today = {mod for mod, cnt in day_data.items() if cnt > 0}
        missing_critical = expected_mods - accessed_today
        critical_module_missing_pct = round(len(missing_critical) / max(1, len(expected_mods)) * 100, 2)

        # peer_average_difference and peer_standard_deviation
        # Compare audit_access_count to peer cohort's average
        peer_avg_audit = cohort_peer_avg[cid].get("Audit Reports", 0)
        peer_std_audit = cohort_peer_std[cid].get("Audit Reports", 1)
        peer_avg_diff  = round(audit_access_count - peer_avg_audit, 2)
        peer_std       = round(peer_std_audit, 2)

        # expected_modules_accessed and missing
        expected_modules_accessed = len(expected_mods & accessed_today)
        expected_modules_missing  = len(expected_mods - accessed_today)

        feature_rows.append({
            "employee_id":                        eid,
            "date":                               sim_date.strftime("%Y-%m-%d"),
            "day_index":                          day_idx,
            "role":                               role,
            "branch":                             emp["branch"],
            "cohort_id":                          cid,
            "is_suspicious":                      1 if eid in suspicious_set else 0,
            # --- raw counts ---
            "loan_access_count":                  loan_access_count,
            "customer_search_count":              customer_search_count,
            "audit_access_count":                 audit_access_count,
            "compliance_access_count":            compliance_access_count,
            "override_access_count":              override_access_count,
            "total_daily_accesses":               total_daily_accesses,
            # --- time-since features ---
            "days_since_last_audit":              days_since_last_audit,
            "days_since_last_compliance":         days_since_last_compliance,
            "days_since_last_override":           days_since_last_override,
            # --- rolling averages ---
            "rolling_7_day_audit_average":        rolling_7_day_audit_avg,
            "rolling_30_day_audit_average":       rolling_30_day_audit_avg,
            # --- drop percentages ---
            "audit_drop_percentage":              audit_drop_pct,
            "compliance_drop_percentage":         compliance_drop_pct,
            "override_drop_percentage":           override_drop_pct,
            # --- ratios ---
            "audit_to_loan_ratio":                audit_to_loan_ratio,
            "compliance_to_loan_ratio":           compliance_to_loan_ratio,
            # --- module coverage ---
            "critical_module_missing_percentage": critical_module_missing_pct,
            "expected_modules_accessed":          expected_modules_accessed,
            "expected_modules_missing":           expected_modules_missing,
            # --- peer comparison ---
            "peer_average_difference":            peer_avg_diff,
            "peer_standard_deviation":            peer_std,
        })

# Write engineered_features.csv (full, with all metadata columns)
ef_path = os.path.join(PROC_DIR, "engineered_features.csv")
ef_fieldnames = list(feature_rows[0].keys())
with open(ef_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=ef_fieldnames)
    writer.writeheader()
    writer.writerows(feature_rows)
print(f"  ✓ engineered_features.csv ({len(feature_rows):,} rows, full metadata)")

# Write feature_matrix.csv — ONLY the features Isolation Forest trains on (no labels, no metadata)
ISOLATION_FOREST_FEATURES = [
    "loan_access_count",
    "customer_search_count",
    "audit_access_count",
    "compliance_access_count",
    "override_access_count",
    "days_since_last_audit",
    "days_since_last_compliance",
    "days_since_last_override",
    "rolling_7_day_audit_average",
    "rolling_30_day_audit_average",
    "audit_drop_percentage",
    "compliance_drop_percentage",
    "override_drop_percentage",
    "audit_to_loan_ratio",
    "compliance_to_loan_ratio",
    "critical_module_missing_percentage",
    "peer_average_difference",
    "peer_standard_deviation",
    "expected_modules_accessed",
    "expected_modules_missing",
    "total_daily_accesses",
]

# feature_matrix includes employee_id + date as identifiers, then all 21 features
fm_path = os.path.join(PROC_DIR, "feature_matrix.csv")
fm_fieldnames = ["employee_id", "date"] + ISOLATION_FOREST_FEATURES
with open(fm_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fm_fieldnames)
    writer.writeheader()
    for row in feature_rows:
        fm_row = {k: row[k] for k in fm_fieldnames}
        writer.writerow(fm_row)

print(f"  ✓ feature_matrix.csv ({len(feature_rows):,} rows × {len(ISOLATION_FOREST_FEATURES)} features)")
print(f"    → This is the ONLY file Isolation Forest trains on")

# ─────────────────────────────────────────────
# DEMO JSON — for the SOC dashboard
# ─────────────────────────────────────────────
print("\nGenerating demo_dataset.json")
print("=" * 60)

# Last 14 days of activity for all suspicious + 2 normal employees
demo_emps = SUSPICIOUS_EIDS[:1] + [  # Rajesh (critical)
    next(e["employee_id"] for e in employees if e["role"] == "Cashier" and e["employee_id"] not in suspicious_set),
    next(e["employee_id"] for e in employees if e["role"] == "Risk Analyst" and e["employee_id"] not in suspicious_set),
]

demo_data = []
DEMO_START_DAY = NUM_DAYS - 14  # last 14 days

for eid in demo_emps:
    emp      = EMP_MAP[eid]
    cid      = emp_cohort[eid]
    emp_rows = [r for r in feature_rows if r["employee_id"] == eid and r["day_index"] >= DEMO_START_DAY]
    daily_feats = []
    for r in emp_rows:
        daily_feats.append({
            "date":              r["date"],
            "day_index":         r["day_index"] - DEMO_START_DAY,
            "audit_count":       r["audit_access_count"],
            "compliance_count":  r["compliance_access_count"],
            "override_count":    r["override_access_count"],
            "audit_drop_pct":    r["audit_drop_percentage"],
            "compliance_drop_pct": r["compliance_drop_percentage"],
            "override_drop_pct": r["override_drop_percentage"],
            "days_since_last_audit": r["days_since_last_audit"],
            "total_accesses":    r["total_daily_accesses"],
        })

    demo_data.append({
        "employee_id":  eid,
        "name":         emp["name"],
        "role":         emp["role"],
        "branch":       emp["branch"],
        "cohort_id":    cid,
        "is_suspicious": 1 if eid in suspicious_set else 0,
        "daily_features": daily_feats,
    })

demo_json_path = os.path.join(DEMO_DIR, "demo_dataset.json")
with open(demo_json_path, "w", encoding="utf-8") as f:
    json.dump(demo_data, f, indent=2, ensure_ascii=False)

print(f"  ✓ demo_dataset.json ({len(demo_emps)} employees, 14-day window)")

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("DATASET GENERATION COMPLETE")
print("=" * 60)
print(f"""
FOLDER STRUCTURE:
  data/
    raw/
      employees.csv          → {len(employees)} employees
      modules.csv            → {len(MODULES)} banking modules
      role_permissions.csv   → {len(role_perm_rows)} role-module mappings
      access_logs.csv        → {total_log_rows:,} raw events
      ground_truth.csv       → {len(employees)} employees, {fraud_count} fraud labels

    processed/
      peer_cohorts.csv       → {len(cohort_map)} cohorts
      daily_activity.csv     → 4,500 rows (50 emp × 90 days)
      engineered_features.csv → {len(feature_rows):,} rows (full)
      feature_matrix.csv     → {len(feature_rows):,} × {len(ISOLATION_FOREST_FEATURES)} features (IF input)

    demo/
      demo_dataset.json      → {len(demo_emps)} employees, 14-day window

SUSPICIOUS EMPLOYEES (Negative Access Signal injected):
""")
for eid in SUSPICIOUS_EIDS:
    e = EMP_MAP[eid]
    print(f"  {eid} — {e['name']} ({e['role']}, {e['branch']})")

print(f"""
Engine 2 Pipeline Ready:
  feature_matrix.csv → Isolation Forest → Access Void Score → DITS

Important: Isolation Forest trains ONLY on feature_matrix.csv.
           ground_truth.csv is for evaluation ONLY.
""")
