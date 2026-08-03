"""
PHANTOM — Engine 2 Dataset Generation Script v2.0
Owner: Vishal (Engine 2 — Negative Access Profiler)

Implements all 20 steps from new_instruct.md:
  Step  1  -> Employee Personalities (work_style, arrival_time, risk_profile…)
  Step  2  -> Workload Profiles (day-of-week multipliers)
  Step  3  -> Banking Seasons (BOM spike, EOM closures, quarter-end audit)
  Step  4  -> Session-based Access Logs (login -> actions -> logout flows)
  Step  5  -> Role-differentiated Behaviour (distinct profiles per role)
  Step  6  -> Working Hours (personality-driven login/logout variance)
  Step  7  -> Weekends / Holidays / Leave (zero activity where justified)
  Step  8  -> Promotions (role change mid-period, reflected in activity)
  Step  9  -> Learning Curves (new employees ramp up over first 45 days)
  Step 10  -> Peer Behaviour (cohort = role + branch + experience bucket)
  Step 11  -> Gradual Fraud (linear fade, not sudden cliff)
  Step 12  -> Diverse Fraud Strategies (4 different avoidance patterns)
  Step 13  -> Hidden Behaviour (fraudsters make occasional mistakes)
  Step 14  -> Noise (bad days, training days, server outage)
  Step 15  -> Department Events (compliance monthly audit spikes)
  Step 16  -> Relationships (manager transfers reflected in metadata)
  Step 17  -> Feature Engineering (7d/14d/30d MAs, rolling std, z-score, percentile)
  Step 18  -> Behavioural Features (login variance, session length, context switching)
  Step 19  -> Temporal Features (trend slopes, seasonality)
  Step 20  -> Explainability (anomaly_reason.csv with human-readable descriptions)

Output layout:
  data/
    raw/        employees.csv  branches.csv  departments.csv  modules.csv
                role_permissions.csv  holidays.csv  promotions.csv
                transfers.csv  access_logs.csv
    processed/  daily_activity.csv  peer_cohorts.csv  behavioural_features.csv
                temporal_features.csv  engineered_features.csv  feature_matrix.csv
    labels/     ground_truth.csv  anomaly_reason.csv
    demo/       demo_dataset.json
"""

import os
import csv
import json
import math
import random
import calendar
from datetime import datetime, timedelta, date

# ── SEED ──────────────────────────────────────────────────────────────────
random.seed(42)

# ── PATHS ─────────────────────────────────────────────────────────────────
BASE   = os.path.dirname(os.path.abspath(__file__))
RAW    = os.path.join(BASE, "raw")
PROC   = os.path.join(BASE, "processed")
LABELS = os.path.join(BASE, "labels")
DEMO   = os.path.join(BASE, "demo")
for d in [RAW, PROC, LABELS, DEMO]:
    os.makedirs(d, exist_ok=True)

START_DATE = date(2026, 1, 1)
NUM_DAYS   = 90   # Jan 1 -> Mar 31, 2026

# ══════════════════════════════════════════════════════════════════════════
# SECTION 1: MODULES AND ROLES
# ══════════════════════════════════════════════════════════════════════════
print("=" * 62)
print("PHANTOM Engine 2 v2.0 — Dataset Generation")
print("=" * 62)

MODULES = [
    {"module_id": "MOD01", "module_name": "Customer Search",      "criticality": "Low",    "department": "Retail Banking"},
    {"module_id": "MOD02", "module_name": "Loan Approval",        "criticality": "High",   "department": "Loans"},
    {"module_id": "MOD03", "module_name": "Loan Review",          "criticality": "High",   "department": "Loans"},
    {"module_id": "MOD04", "module_name": "Audit Reports",        "criticality": "High",   "department": "Compliance"},
    {"module_id": "MOD05", "module_name": "Compliance Dashboard", "criticality": "High",   "department": "Compliance"},
    {"module_id": "MOD06", "module_name": "Override Logs",        "criticality": "High",   "department": "Compliance"},
    {"module_id": "MOD07", "module_name": "KYC Portal",           "criticality": "Medium", "department": "Retail Banking"},
    {"module_id": "MOD08", "module_name": "Cash Operations",      "criticality": "High",   "department": "Operations"},
    {"module_id": "MOD09", "module_name": "Transaction History",  "criticality": "Medium", "department": "Operations"},
    {"module_id": "MOD10", "module_name": "Treasury",             "criticality": "High",   "department": "Treasury"},
    {"module_id": "MOD11", "module_name": "Risk Dashboard",       "criticality": "High",   "department": "Risk"},
    {"module_id": "MOD12", "module_name": "Account Creation",     "criticality": "High",   "department": "Retail Banking"},
    {"module_id": "MOD13", "module_name": "Account Closure",      "criticality": "High",   "department": "Retail Banking"},
    {"module_id": "MOD14", "module_name": "Locker Management",    "criticality": "Medium", "department": "Operations"},
    {"module_id": "MOD15", "module_name": "Reports",              "criticality": "Medium", "department": "Compliance"},
]
MOD_NAME_TO_ID = {m["module_name"]: m["module_id"] for m in MODULES}

ROLES = {
    "R01": {
        "role_name": "Loan Officer", "department": "Loans",
        "expected_modules": ["Customer Search", "Loan Approval", "Loan Review",
                             "Audit Reports", "Compliance Dashboard", "Override Logs"],
    },
    "R02": {
        "role_name": "Branch Manager", "department": "Retail Banking",
        "expected_modules": ["Customer Search", "Loan Approval", "Loan Review",
                             "Audit Reports", "Compliance Dashboard", "Override Logs",
                             "Account Creation", "Account Closure", "Reports", "Risk Dashboard"],
    },
    "R03": {
        "role_name": "Cashier", "department": "Operations",
        "expected_modules": ["Cash Operations", "Transaction History", "Customer Search",
                             "Account Creation", "KYC Portal"],
    },
    "R04": {
        "role_name": "Compliance Officer", "department": "Compliance",
        "expected_modules": ["Audit Reports", "Compliance Dashboard", "Override Logs",
                             "Reports", "Transaction History"],
    },
    "R05": {
        "role_name": "Relationship Manager", "department": "Retail Banking",
        "expected_modules": ["Customer Search", "Loan Approval", "KYC Portal",
                             "Account Creation", "Account Closure"],
    },
    "R06": {
        "role_name": "Operations Officer", "department": "Operations",
        "expected_modules": ["Cash Operations", "Transaction History", "Locker Management",
                             "Account Creation", "Account Closure", "KYC Portal"],
    },
    "R07": {
        "role_name": "Treasury Officer", "department": "Treasury",
        "expected_modules": ["Treasury", "Reports", "Risk Dashboard", "Audit Reports"],
    },
    "R08": {
        "role_name": "Risk Analyst", "department": "Risk",
        "expected_modules": ["Risk Dashboard", "Audit Reports", "Compliance Dashboard",
                             "Reports", "Transaction History"],
    },
}

# ── Normal daily count ranges per role per module (Step 5) ────────────────
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

# ══════════════════════════════════════════════════════════════════════════
# SECTION 2: EMPLOYEES (preserved names, fixed EMP001)
# ══════════════════════════════════════════════════════════════════════════
EMPLOYEE_DATA = [
    # (emp_id, name, role, role_id, department, branch, exp, joining_date, manager)
    ("EMP001", "Rajesh Kumar",   "Branch Manager",       "R02", "Retail Banking", "Ahmedabad", 1.9,  "2022-06-23", "EMP010"),
    ("EMP002", "Priya Joshi",    "Loan Officer",         "R01", "Loans",          "Surat",     3.8,  "2022-12-30", "EMP014"),
    ("EMP003", "Anil Yadav",     "Loan Officer",         "R01", "Loans",          "Delhi",     2.9,  "2020-04-13", "EMP011"),
    ("EMP004", "Sunita Sharma",  "Loan Officer",         "R01", "Loans",          "Mumbai",    3.0,  "2022-11-01", "EMP012"),
    ("EMP005", "Vikram Saxena",  "Loan Officer",         "R01", "Loans",          "Mumbai",    1.9,  "2023-06-16", "EMP013"),
    ("EMP006", "Meena Joshi",    "Loan Officer",         "R01", "Loans",          "Ahmedabad", 8.9,  "2023-03-09", "EMP011"),
    ("EMP007", "Arjun Sharma",   "Loan Officer",         "R01", "Loans",          "Mumbai",    14.0, "2018-06-28", "EMP014"),
    ("EMP008", "Kavita Nair",    "Loan Officer",         "R01", "Loans",          "Mumbai",    6.1,  "2020-09-05", "EMP011"),
    ("EMP009", "Deepak Singh",   "Loan Officer",         "R01", "Loans",          "Surat",     3.0,  "2022-01-06", "EMP014"),
    ("EMP010", "Aarti Iyer",     "Branch Manager",       "R02", "Retail Banking", "Surat",     11.5, "2021-10-24", "EMP011"),
    ("EMP011", "Sanjay Yadav",   "Branch Manager",       "R02", "Retail Banking", "Delhi",     3.6,  "2019-11-05", "EMP010"),
    ("EMP012", "Neha Yadav",     "Branch Manager",       "R02", "Retail Banking", "Bangalore", 6.3,  "2020-10-05", "EMP010"),
    ("EMP013", "Ravi Pandey",    "Branch Manager",       "R02", "Retail Banking", "Surat",     4.7,  "2018-10-26", "EMP010"),
    ("EMP014", "Pooja Joshi",    "Branch Manager",       "R02", "Retail Banking", "Surat",     14.3, "2013-12-07", "EMP010"),
    ("EMP015", "Amit Singh",     "Cashier",              "R03", "Operations",     "Delhi",     7.8,  "2022-05-02", "EMP011"),
    ("EMP016", "Shweta Iyer",    "Cashier",              "R03", "Operations",     "Ahmedabad", 4.2,  "2019-12-24", "EMP011"),
    ("EMP017", "Rahul Shah",     "Cashier",              "R03", "Operations",     "Surat",     13.1, "2023-07-29", "EMP013"),
    ("EMP018", "Anjali Gupta",   "Cashier",              "R03", "Operations",     "Mumbai",    10.3, "2016-05-16", "EMP013"),
    ("EMP019", "Suresh Mishra",  "Cashier",              "R03", "Operations",     "Bangalore", 7.8,  "2017-09-01", "EMP012"),
    ("EMP020", "Divya Nair",     "Cashier",              "R03", "Operations",     "Surat",     15.4, "2012-09-30", "EMP010"),
    ("EMP021", "Kiran Patel",    "Cashier",              "R03", "Operations",     "Delhi",     14.8, "2014-03-20", "EMP011"),
    ("EMP022", "Smita Kumar",    "Cashier",              "R03", "Operations",     "Bangalore", 5.0,  "2021-07-13", "EMP012"),
    ("EMP023", "Nikhil Mehta",   "Compliance Officer",   "R04", "Compliance",     "Delhi",     12.3, "2020-12-31", "EMP011"),
    ("EMP024", "Rekha Verma",    "Compliance Officer",   "R04", "Compliance",     "Mumbai",    5.9,  "2023-05-27", "EMP013"),
    ("EMP025", "Manish Yadav",   "Compliance Officer",   "R04", "Compliance",     "Bangalore", 5.8,  "2022-01-03", "EMP012"),
    ("EMP026", "Pallavi Pandey", "Compliance Officer",   "R04", "Compliance",     "Mumbai",    8.1,  "2016-06-16", "EMP013"),
    ("EMP027", "Gaurav Dubey",   "Compliance Officer",   "R04", "Compliance",     "Surat",     9.6,  "2023-01-24", "EMP014"),
    ("EMP028", "Sneha Singh",    "Compliance Officer",   "R04", "Compliance",     "Mumbai",    4.0,  "2023-06-12", "EMP010"),
    ("EMP029", "Vivek Reddy",    "Relationship Manager", "R05", "Retail Banking", "Delhi",     11.3, "2020-04-08", "EMP011"),
    ("EMP030", "Nisha Saxena",   "Relationship Manager", "R05", "Retail Banking", "Bangalore", 17.9, "2010-10-02", "EMP012"),
    ("EMP031", "Ashok Yadav",    "Relationship Manager", "R05", "Retail Banking", "Surat",     15.7, "2022-07-27", "EMP013"),
    ("EMP032", "Madhuri Singh",  "Relationship Manager", "R05", "Retail Banking", "Bangalore", 12.7, "2016-04-17", "EMP012"),
    ("EMP033", "Rohit Nair",     "Relationship Manager", "R05", "Retail Banking", "Delhi",     3.3,  "2020-08-03", "EMP011"),
    ("EMP034", "Geeta Mishra",   "Relationship Manager", "R05", "Retail Banking", "Ahmedabad", 1.6,  "2022-10-21", "EMP011"),
    ("EMP035", "Harish Gupta",   "Relationship Manager", "R05", "Retail Banking", "Surat",     9.9,  "2022-11-14", "EMP010"),
    ("EMP036", "Lakshmi Rao",    "Relationship Manager", "R05", "Retail Banking", "Bangalore", 15.4, "2021-04-08", "EMP012"),
    ("EMP037", "Dinesh Mehta",   "Operations Officer",   "R06", "Operations",     "Mumbai",    4.0,  "2022-01-10", "EMP014"),
    ("EMP038", "Usha Dubey",     "Operations Officer",   "R06", "Operations",     "Bangalore", 16.7, "2013-08-01", "EMP012"),
    ("EMP039", "Prakash Tiwari", "Operations Officer",   "R06", "Operations",     "Ahmedabad", 1.8,  "2023-08-31", "EMP011"),
    ("EMP040", "Rina Rao",       "Operations Officer",   "R06", "Operations",     "Mumbai",    5.5,  "2023-11-13", "EMP013"),
    ("EMP041", "Mohan Kumar",    "Operations Officer",   "R06", "Operations",     "Delhi",     2.9,  "2020-06-28", "EMP011"),
    ("EMP042", "Shalini Yadav",  "Operations Officer",   "R06", "Operations",     "Mumbai",    14.1, "2023-09-16", "EMP012"),
    ("EMP043", "Nilesh Tiwari",  "Treasury Officer",     "R07", "Treasury",       "Mumbai",    17.1, "2011-11-10", "EMP013"),
    ("EMP044", "Anita Dubey",    "Treasury Officer",     "R07", "Treasury",       "Delhi",     15.9, "2011-11-12", "EMP011"),
    ("EMP045", "Vijay Yadav",    "Treasury Officer",     "R07", "Treasury",       "Mumbai",    14.0, "2016-01-01", "EMP010"),
    ("EMP046", "Seema Pillai",   "Treasury Officer",     "R07", "Treasury",       "Ahmedabad", 17.9, "2014-12-09", "EMP013"),
    ("EMP047", "Krishna Dubey",  "Risk Analyst",         "R08", "Risk",           "Mumbai",    8.9,  "2016-08-17", "EMP014"),
    ("EMP048", "Tara Kumar",     "Risk Analyst",         "R08", "Risk",           "Bangalore", 7.1,  "2022-02-12", "EMP012"),
    ("EMP049", "Ajay Joshi",     "Risk Analyst",         "R08", "Risk",           "Surat",     11.2, "2013-05-26", "EMP010"),
    ("EMP050", "Radha Patel",    "Risk Analyst",         "R08", "Risk",           "Surat",     5.3,  "2021-05-30", "EMP014"),
]

employees = []
for row in EMPLOYEE_DATA:
    emp_id, name, role, role_id, dept, branch, exp, jdate, manager = row
    employees.append({
        "employee_id":    emp_id,
        "name":           name,
        "role":           role,
        "role_id":        role_id,
        "department":     dept,
        "branch":         branch,
        "experience_years": exp,
        "joining_date":   jdate,
        "manager":        manager,
        "status":         "Active",
    })
EMP_MAP = {e["employee_id"]: e for e in employees}

# ══════════════════════════════════════════════════════════════════════════
# SECTION 3: EMPLOYEE PERSONALITIES (Step 1)
# ══════════════════════════════════════════════════════════════════════════
# Each employee has a fixed personality — deterministic, makes them unique.
PERSONALITIES = {
    "EMP001": {"work_style": "Fast",   "risk_profile": "High", "arrival_time": "08:55", "leave_time": "18:20", "avg_daily_customers": 42, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP002": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:30", "leave_time": "17:45", "avg_daily_customers": 35, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP003": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "18:05", "avg_daily_customers": 28, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP004": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "17:30", "avg_daily_customers": 32, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP005": {"work_style": "Fast",   "risk_profile": "High", "arrival_time": "08:50", "leave_time": "18:10", "avg_daily_customers": 38, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP006": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "18:00", "avg_daily_customers": 30, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP007": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:05", "leave_time": "19:00", "avg_daily_customers": 45, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP008": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:25", "leave_time": "17:50", "avg_daily_customers": 33, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP009": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:40", "leave_time": "17:40", "avg_daily_customers": 25, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP010": {"work_style": "Fast",   "risk_profile": "High", "arrival_time": "08:45", "leave_time": "18:30", "avg_daily_customers": 50, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP011": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:10", "leave_time": "18:00", "avg_daily_customers": 40, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP012": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "18:15", "avg_daily_customers": 44, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP013": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "17:55", "avg_daily_customers": 38, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP014": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:30", "leave_time": "17:45", "avg_daily_customers": 35, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP015": {"work_style": "Fast",   "risk_profile": "High", "arrival_time": "08:55", "leave_time": "18:05", "avg_daily_customers": 48, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP016": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "17:50", "avg_daily_customers": 36, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Medium"},
    "EMP017": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:05", "leave_time": "18:20", "avg_daily_customers": 42, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP018": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "18:00", "avg_daily_customers": 38, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP019": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:35", "leave_time": "17:40", "avg_daily_customers": 28, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP020": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "08:50", "leave_time": "18:30", "avg_daily_customers": 46, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP021": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "18:15", "avg_daily_customers": 44, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP022": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "17:55", "avg_daily_customers": 34, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP023": {"work_style": "Fast",   "risk_profile": "High", "arrival_time": "08:50", "leave_time": "18:25", "avg_daily_customers": 40, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP024": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "17:50", "avg_daily_customers": 32, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP025": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:30", "leave_time": "17:45", "avg_daily_customers": 26, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP026": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:10", "leave_time": "18:00", "avg_daily_customers": 36, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP027": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "18:10", "avg_daily_customers": 40, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP028": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:45", "leave_time": "17:40", "avg_daily_customers": 22, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "High"},
    "EMP029": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:05", "leave_time": "18:20", "avg_daily_customers": 48, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP030": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "17:55", "avg_daily_customers": 38, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP031": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "08:55", "leave_time": "18:30", "avg_daily_customers": 44, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP032": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "18:00", "avg_daily_customers": 36, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP033": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:35", "leave_time": "17:45", "avg_daily_customers": 27, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP034": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:10", "leave_time": "17:50", "avg_daily_customers": 30, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP035": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "18:15", "avg_daily_customers": 42, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP036": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "18:00", "avg_daily_customers": 35, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP037": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "17:55", "avg_daily_customers": 32, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP038": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "08:50", "leave_time": "18:20", "avg_daily_customers": 44, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP039": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:40", "leave_time": "17:40", "avg_daily_customers": 22, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP040": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:10", "leave_time": "18:05", "avg_daily_customers": 34, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP041": {"work_style": "Slow",   "risk_profile": "Low",  "arrival_time": "09:30", "leave_time": "17:45", "avg_daily_customers": 26, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Medium"},
    "EMP042": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "18:25", "avg_daily_customers": 40, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP043": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "08:55", "leave_time": "18:30", "avg_daily_customers": 38, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP044": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "18:00", "avg_daily_customers": 33, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP045": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:00", "leave_time": "18:20", "avg_daily_customers": 40, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP046": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "17:55", "avg_daily_customers": 35, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP047": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "08:50", "leave_time": "18:15", "avg_daily_customers": 42, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP048": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:15", "leave_time": "17:50", "avg_daily_customers": 34, "typing_speed": "Medium", "break_pattern": "Long",  "leave_frequency": "Low"},
    "EMP049": {"work_style": "Fast",   "risk_profile": "Low",  "arrival_time": "09:05", "leave_time": "18:25", "avg_daily_customers": 40, "typing_speed": "High",   "break_pattern": "Short", "leave_frequency": "Low"},
    "EMP050": {"work_style": "Medium", "risk_profile": "Low",  "arrival_time": "09:20", "leave_time": "17:55", "avg_daily_customers": 32, "typing_speed": "Medium", "break_pattern": "Short", "leave_frequency": "Low"},
}

STYLE_MULT = {"Fast": 1.15, "Medium": 1.00, "Slow": 0.83}

# ══════════════════════════════════════════════════════════════════════════
# SECTION 4: WORKLOAD PROFILES (Step 2) & BANKING SEASONS (Step 3)
# ══════════════════════════════════════════════════════════════════════════

# Day-of-week multipliers (Mon=0, Sun=6)
DOW_MULT = {0: 1.10, 1: 1.15, 2: 1.00, 3: 1.05, 4: 1.10, 5: 0.40, 6: 0.00}

# Indian national / bank holidays in Jan–Mar 2026
HOLIDAY_LIST = [
    (date(2026, 1,  1),  "New Year"),
    (date(2026, 1, 26),  "Republic Day"),
    (date(2026, 3,  2),  "Holi"),
]
HOLIDAY_MAP = {}   # day_idx -> holiday_name
for hd, hn in HOLIDAY_LIST:
    idx = (hd - START_DATE).days
    if 0 <= idx < NUM_DAYS:
        HOLIDAY_MAP[idx] = hn


def get_season_mult(day_idx: int) -> float:
    """Monthly seasonality multiplier (Step 3)."""
    d   = START_DATE + timedelta(days=day_idx)
    dom = d.day
    last_day = calendar.monthrange(d.year, d.month)[1]
    if dom <= 3:               return 1.20   # BOM salary spike
    if dom >= last_day - 2:    return 1.15   # EOM loan closures
    if d.month == 3 and dom >= 25: return 1.30  # Quarter-end audit surge
    if 12 <= dom <= 16:        return 0.95   # Mid-month lull
    return 1.00


def get_audit_season_boost(day_idx: int) -> float:
    """Additional boost to audit-critical modules at quarter end."""
    d = START_DATE + timedelta(days=day_idx)
    if d.month == 3 and d.day >= 25:
        return 1.50
    return 1.00


# Department event days: compliance-wide audit spike (Step 15)
# All employees whose modules include Audit Reports get +50% on these days
DEPT_AUDIT_EVENT_DAYS = {28, 29, 58, 59}

# ══════════════════════════════════════════════════════════════════════════
# SECTION 5: NOISE SCHEDULES (Step 7, 14)
# ══════════════════════════════════════════════════════════════════════════

# Training days: 2–3 per employee, near-zero activity
_rng_tr = random.Random(1999)
TRAINING_DAYS: dict[str, set] = {}
for emp in employees:
    eid = emp["employee_id"]
    n   = _rng_tr.randint(2, 3)
    TRAINING_DAYS[eid] = set(_rng_tr.sample(range(5, 85), n))

# Global server outage on day 45 (≈ Feb 15): everyone at ~20% (Step 14)
OUTAGE_DAY = 45

# Leave days: driven by leave_frequency personality trait (Step 7)
_rng_lv = random.Random(7777)
LEAVE_DAYS: dict[str, set] = {}
for emp in employees:
    eid  = emp["employee_id"]
    freq = PERSONALITIES[eid]["leave_frequency"]
    n_lv = {"Low": _rng_lv.randint(1, 3),
             "Medium": _rng_lv.randint(3, 6),
             "High": _rng_lv.randint(5, 8)}[freq]
    # Only weekdays that aren't already holidays or training days
    candidates = [
        d for d in range(NUM_DAYS)
        if (START_DATE + timedelta(days=d)).weekday() < 5
        and d not in HOLIDAY_MAP
        and d not in TRAINING_DAYS[eid]
    ]
    LEAVE_DAYS[eid] = set(_rng_lv.sample(candidates, min(n_lv, len(candidates))))

# ══════════════════════════════════════════════════════════════════════════
# SECTION 6: PROMOTIONS AND TRANSFERS (Steps 8, 16)
# ══════════════════════════════════════════════════════════════════════════

PROMOTIONS = [
    {"employee_id": "EMP005", "from_role": "Loan Officer",        "to_role": "Branch Manager",
     "from_role_id": "R01", "to_role_id": "R02", "effective_day": 50, "branch": "Mumbai"},
    {"employee_id": "EMP033", "from_role": "Relationship Manager", "to_role": "Branch Manager",
     "from_role_id": "R05", "to_role_id": "R02", "effective_day": 45, "branch": "Delhi"},
]
PROMOTION_MAP = {p["employee_id"]: p for p in PROMOTIONS}

TRANSFERS = [
    {"employee_id": "EMP009", "from_branch": "Surat",     "to_branch": "Mumbai",    "effective_day": 40},
    {"employee_id": "EMP022", "from_branch": "Bangalore", "to_branch": "Ahmedabad", "effective_day": 55},
]
TRANSFER_MAP = {t["employee_id"]: t for t in TRANSFERS}

# ══════════════════════════════════════════════════════════════════════════
# SECTION 7: FRAUD STRATEGIES (Steps 11–13)
# ══════════════════════════════════════════════════════════════════════════

# Suspicious employees match existing ground_truth.csv
SUSPICIOUS_EIDS = {"EMP001", "EMP010", "EMP015", "EMP023"}

FRAUD_STRATEGIES = {
    # EMP001 — Classic Access Void: audit + compliance + override all fade to 0
    "EMP001": {
        "strategy":    "Classic Access Void",
        "targets":     ["Audit Reports", "Compliance Dashboard", "Override Logs"],
        "fade_start":  20,   "fade_end":  60,
        "final_level": 0.00,
        "mistake_prob": 0.03,   # Step 13: 3% chance of accessing anyway
    },
    # EMP010 — Override Avoider: only Override Logs fade; everything else normal
    "EMP010": {
        "strategy":    "Override Avoider",
        "targets":     ["Override Logs"],
        "fade_start":  30,   "fade_end":  70,
        "final_level": 0.05,
        "mistake_prob": 0.05,
    },
    # EMP015 — Audit Avoider: only Audit Reports fade; cash ops remain high
    "EMP015": {
        "strategy":    "Audit Avoider",
        "targets":     ["Audit Reports"],
        "fade_start":  25,   "fade_end":  65,
        "final_level": 0.02,
        "mistake_prob": 0.04,
    },
    # EMP023 — Chameleon: avoids Compliance + Override, higher mistake prob (Step 13)
    "EMP023": {
        "strategy":    "Chameleon (Compliance Avoider)",
        "targets":     ["Compliance Dashboard", "Override Logs"],
        "fade_start":  35,   "fade_end":  75,
        "final_level": 0.03,
        "mistake_prob": 0.08,   # Makes more mistakes — harder to detect
    },
}


def fraud_multiplier(eid: str, module: str, day_idx: int) -> float:
    """
    Returns a [0, 1] multiplier to apply to a fraudster's module access count.
    Implements Steps 11 (gradual fade), 12 (diverse strategies), 13 (mistakes).
    """
    if eid not in FRAUD_STRATEGIES:
        return 1.0
    strat = FRAUD_STRATEGIES[eid]
    if module not in strat["targets"]:
        return 1.0

    # Step 13: Fraudsters occasionally make mistakes and access the module normally
    if random.random() < strat["mistake_prob"]:
        return 1.0

    fs, fe = strat["fade_start"], strat["fade_end"]
    final  = strat["final_level"]

    if day_idx < fs:
        return 1.0
    elif day_idx >= fe:
        return final
    else:
        # Linear fade (Step 11)
        progress = (day_idx - fs) / max(1, fe - fs)
        return 1.0 - progress * (1.0 - final)


# ══════════════════════════════════════════════════════════════════════════
# SECTION 8: DAILY ACTIVITY GENERATION
# ══════════════════════════════════════════════════════════════════════════
print("\nStep 1-14 — Generating daily activity for 50 x 90 days ...")

daily_lookup: dict[str, dict[int, dict[str, int]]] = {}

for emp in employees:
    eid   = emp["employee_id"]
    role  = emp["role"]
    exp   = emp["experience_years"]
    pers  = PERSONALITIES[eid]
    s_m   = STYLE_MULT[pers["work_style"]]
    profile = NORMAL_PROFILE.get(role, {})
    daily_lookup[eid] = {}

    for day_idx in range(NUM_DAYS):
        sim_date = START_DATE + timedelta(days=day_idx)
        dow_m    = DOW_MULT[sim_date.weekday()]

        is_holiday  = day_idx in HOLIDAY_MAP
        is_training = day_idx in TRAINING_DAYS[eid]
        is_leave    = day_idx in LEAVE_DAYS[eid]
        is_outage   = day_idx == OUTAGE_DAY

        # Zero-activity days (Step 7)
        if dow_m == 0.0 or is_holiday or is_leave:
            daily_lookup[eid][day_idx] = {}
            continue

        if is_training:
            special_m = random.uniform(0.05, 0.10)     # Step 14: training day
        elif is_outage:
            special_m = random.uniform(0.18, 0.25)     # Step 14: outage
        else:
            special_m = 1.0

        # Step 9: Learning curve — new employees ramp over first 45 days
        if exp < 2.0:
            ramp = min(1.0, 0.50 + day_idx / 45.0 * 0.50)
        elif exp < 3.0:
            ramp = min(1.0, 0.75 + day_idx / 45.0 * 0.25)
        else:
            ramp = 1.0

        season_m      = get_season_mult(day_idx)
        audit_boost   = get_audit_season_boost(day_idx)

        # After promotion: switch profile (Step 8)
        active_profile = profile
        if eid in PROMOTION_MAP and day_idx >= PROMOTION_MAP[eid]["effective_day"]:
            new_role = PROMOTION_MAP[eid]["to_role"]
            active_profile = NORMAL_PROFILE.get(new_role, profile)

        day_counts: dict[str, int] = {}
        for mod, (lo, hi) in active_profile.items():
            base  = random.randint(lo, hi)
            noise = int(base * random.gauss(0, 0.08))

            m = s_m * dow_m * season_m * special_m * ramp

            # Audit season boost for oversight modules
            if mod in {"Audit Reports", "Compliance Dashboard", "Override Logs"}:
                m *= audit_boost

            # Department-wide audit event (Step 15)
            if day_idx in DEPT_AUDIT_EVENT_DAYS and mod == "Audit Reports":
                m *= 1.50

            count = max(0, int((base + noise) * m))

            # Apply fraud multiplier (Steps 11–13)
            if eid in SUSPICIOUS_EIDS:
                count = max(0, int(count * fraud_multiplier(eid, mod, day_idx)))

            day_counts[mod] = count

        # Step 14: Random bad day (~5% chance) for any employee
        if random.random() < 0.05:
            bad_m = random.uniform(0.40, 0.70)
            day_counts = {m: max(0, int(c * bad_m)) for m, c in day_counts.items()}

        daily_lookup[eid][day_idx] = day_counts

print("  [OK] Daily activity generated (50 x 90 = 4 500 employee-days)")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 9: PEER COHORTS (Step 10)
# ══════════════════════════════════════════════════════════════════════════

def exp_bucket(exp: float) -> str:
    if exp <= 3:    return "0-3yr"
    elif exp <= 6:  return "3-6yr"
    elif exp <= 12: return "6-12yr"
    else:           return "12+yr"


cohort_map:     dict[tuple, str] = {}
emp_cohort:     dict[str, str]   = {}
cohort_ctr = 1

for emp in employees:
    key = (emp["role"], emp["branch"], exp_bucket(emp["experience_years"]))
    if key not in cohort_map:
        cohort_map[key] = f"COHORT{cohort_ctr:03d}"
        cohort_ctr += 1
    emp_cohort[emp["employee_id"]] = cohort_map[key]

cohort_members: dict[str, list] = {}
for eid, cid in emp_cohort.items():
    cohort_members.setdefault(cid, []).append(eid)

# ══════════════════════════════════════════════════════════════════════════
# SECTION 10: WRITE RAW SUPPORT FILES
# ══════════════════════════════════════════════════════════════════════════
print("\nWriting raw support files ...")

# modules.csv
with open(os.path.join(RAW, "modules.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["module_id", "module_name", "criticality", "department"])
    w.writeheader(); w.writerows(MODULES)
print("  [OK] modules.csv")

# role_permissions.csv
rp_rows = []
for rid, robj in ROLES.items():
    for mod in robj["expected_modules"]:
        rp_rows.append({"role_id": rid, "role_name": robj["role_name"],
                         "department": robj["department"], "module_name": mod,
                         "module_id": MOD_NAME_TO_ID.get(mod, "")})
with open(os.path.join(RAW, "role_permissions.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["role_id", "role_name", "department", "module_name", "module_id"])
    w.writeheader(); w.writerows(rp_rows)
print("  [OK] role_permissions.csv")

# employees.csv — extended with personality columns (Step 1)
emp_fields = ["employee_id", "name", "role", "role_id", "department", "branch",
              "experience_years", "joining_date", "manager", "status",
              "work_style", "risk_profile", "arrival_time", "leave_time",
              "avg_daily_customers", "typing_speed", "break_pattern", "leave_frequency"]
emp_out_rows = []
for emp in employees:
    row = {**emp, **PERSONALITIES[emp["employee_id"]]}
    emp_out_rows.append(row)
with open(os.path.join(RAW, "employees.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=emp_fields)
    w.writeheader(); w.writerows(emp_out_rows)
print("  [OK] employees.csv (extended with 8 personality columns)")

# branches.csv (NEW)
branches = [
    {"branch_id": "BR01", "name": "Surat",     "city": "Surat",     "state": "Gujarat",      "region": "West",  "tier": "Tier-2"},
    {"branch_id": "BR02", "name": "Mumbai",    "city": "Mumbai",    "state": "Maharashtra",  "region": "West",  "tier": "Tier-1"},
    {"branch_id": "BR03", "name": "Ahmedabad", "city": "Ahmedabad", "state": "Gujarat",      "region": "West",  "tier": "Tier-2"},
    {"branch_id": "BR04", "name": "Delhi",     "city": "Delhi",     "state": "Delhi",        "region": "North", "tier": "Tier-1"},
    {"branch_id": "BR05", "name": "Bangalore", "city": "Bangalore", "state": "Karnataka",    "region": "South", "tier": "Tier-1"},
]
with open(os.path.join(RAW, "branches.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["branch_id", "name", "city", "state", "region", "tier"])
    w.writeheader(); w.writerows(branches)
print("  [OK] branches.csv")

# departments.csv (NEW)
depts = [
    {"department_id": "D01", "department_name": "Loans",          "head_count": 9,  "type": "Revenue"},
    {"department_id": "D02", "department_name": "Retail Banking",  "head_count": 13, "type": "Revenue"},
    {"department_id": "D03", "department_name": "Compliance",      "head_count": 6,  "type": "Control"},
    {"department_id": "D04", "department_name": "Treasury",        "head_count": 4,  "type": "Revenue"},
    {"department_id": "D05", "department_name": "Operations",      "head_count": 14, "type": "Support"},
    {"department_id": "D06", "department_name": "Risk",            "head_count": 4,  "type": "Control"},
]
with open(os.path.join(RAW, "departments.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["department_id", "department_name", "head_count", "type"])
    w.writeheader(); w.writerows(depts)
print("  [OK] departments.csv")

# holidays.csv (NEW)
hol_rows = []
for hd, hn in HOLIDAY_LIST:
    idx = (hd - START_DATE).days
    hol_rows.append({"date": hd.strftime("%Y-%m-%d"), "holiday_name": hn,
                     "day_index": idx, "type": "National"})
with open(os.path.join(RAW, "holidays.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["date", "holiday_name", "day_index", "type"])
    w.writeheader(); w.writerows(hol_rows)
print("  [OK] holidays.csv")

# promotions.csv (NEW — Step 8)
promo_out = []
for p in PROMOTIONS:
    promo_date = (START_DATE + timedelta(days=p["effective_day"])).strftime("%Y-%m-%d")
    promo_out.append({
        "employee_id":    p["employee_id"],
        "employee_name":  EMP_MAP[p["employee_id"]]["name"],
        "from_role":      p["from_role"],      "from_role_id": p["from_role_id"],
        "to_role":        p["to_role"],        "to_role_id":   p["to_role_id"],
        "effective_date": promo_date,          "effective_day": p["effective_day"],
        "branch":         p["branch"],
    })
with open(os.path.join(RAW, "promotions.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["employee_id", "employee_name", "from_role", "from_role_id",
                                       "to_role", "to_role_id", "effective_date", "effective_day", "branch"])
    w.writeheader(); w.writerows(promo_out)
print("  [OK] promotions.csv")

# transfers.csv (NEW — Step 16)
transfer_out = []
for t in TRANSFERS:
    t_date = (START_DATE + timedelta(days=t["effective_day"])).strftime("%Y-%m-%d")
    transfer_out.append({
        "employee_id":    t["employee_id"],
        "employee_name":  EMP_MAP[t["employee_id"]]["name"],
        "from_branch":    t["from_branch"],    "to_branch":    t["to_branch"],
        "effective_date": t_date,              "effective_day": t["effective_day"],
    })
with open(os.path.join(RAW, "transfers.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["employee_id", "employee_name", "from_branch",
                                       "to_branch", "effective_date", "effective_day"])
    w.writeheader(); w.writerows(transfer_out)
print("  [OK] transfers.csv")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 11: WRITE daily_activity.csv
# ══════════════════════════════════════════════════════════════════════════
print("\nWriting processed/daily_activity.csv ...")

all_mods_set = set()
for prof in NORMAL_PROFILE.values():
    all_mods_set.update(prof.keys())
ALL_MODS = sorted(all_mods_set)

da_fields = (["employee_id", "date", "day_index", "day_of_week",
               "is_weekend", "is_holiday", "is_training", "is_leave", "is_outage"]
             + ALL_MODS
             + ["total_daily_accesses", "is_suspicious"])

with open(os.path.join(PROC, "daily_activity.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=da_fields)
    w.writeheader()
    for emp in employees:
        eid = emp["employee_id"]
        for day_idx in range(NUM_DAYS):
            sim_date = START_DATE + timedelta(days=day_idx)
            dd = daily_lookup[eid][day_idx]
            total = sum(dd.values())
            row = {
                "employee_id":         eid,
                "date":                sim_date.strftime("%Y-%m-%d"),
                "day_index":           day_idx,
                "day_of_week":         sim_date.strftime("%A"),
                "is_weekend":          1 if sim_date.weekday() >= 5 else 0,
                "is_holiday":          1 if day_idx in HOLIDAY_MAP else 0,
                "is_training":         1 if day_idx in TRAINING_DAYS[eid] else 0,
                "is_leave":            1 if day_idx in LEAVE_DAYS[eid] else 0,
                "is_outage":           1 if day_idx == OUTAGE_DAY else 0,
                "total_daily_accesses": total,
                "is_suspicious":       1 if eid in SUSPICIOUS_EIDS else 0,
            }
            for mod in ALL_MODS:
                row[mod] = dd.get(mod, 0)
            w.writerow(row)

print(f"  [OK] daily_activity.csv ({len(employees) * NUM_DAYS:,} rows)")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 12: WRITE access_logs.csv — SESSION-BASED (Steps 4, 6)
# ══════════════════════════════════════════════════════════════════════════
print("\nGenerating raw/access_logs.csv (session-based) ...")

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

session_ctr   = 1
total_log_rows = 0

# Pre-compute per-employee RNGs for consistent login/logout variance (Step 6)
emp_login_rng = {emp["employee_id"]: random.Random(hash(emp["employee_id"]) & 0xFFFF)
                 for emp in employees}

with open(os.path.join(RAW, "access_logs.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["employee_id", "timestamp", "module", "action", "session_id"])
    w.writeheader()

    for emp in employees:
        eid  = emp["employee_id"]
        pers = PERSONALITIES[eid]
        arr_h, arr_m   = map(int, pers["arrival_time"].split(":"))
        leave_h, leave_m = map(int, pers["leave_time"].split(":"))
        lrng = emp_login_rng[eid]

        for day_idx in range(NUM_DAYS):
            sim_date = START_DATE + timedelta(days=day_idx)
            dd = daily_lookup[eid][day_idx]
            if not dd or sum(dd.values()) == 0:
                continue

            # Build event pool (Step 4)
            events = []
            for mod, cnt in dd.items():
                acts = ACTIONS_MAP.get(mod, ["View"])
                for _ in range(cnt):
                    events.append((mod, random.choice(acts)))
            if not events:
                continue
            random.shuffle(events)

            # Personality-driven login/logout times (Step 6)
            av = int(lrng.gauss(0, 8))    # ±8 min login variance
            lv = int(lrng.gauss(0, 12))   # ±12 min logout variance
            login_min  = arr_h  * 60 + max(0, min(59, arr_m  + av))
            logout_min = leave_h * 60 + max(0, min(59, leave_m + lv))
            login_dt  = datetime(sim_date.year, sim_date.month, sim_date.day,
                                 login_min // 60, login_min % 60, 0)
            logout_dt = datetime(sim_date.year, sim_date.month, sim_date.day,
                                 logout_min // 60, logout_min % 60, 0)
            work_secs = max(3600, int((logout_dt - login_dt).total_seconds()))

            # 1–3 sessions per day (Step 4)
            num_sess = random.randint(1, 3)
            sess_ids = []
            for _ in range(num_sess):
                sess_ids.append(f"S{session_ctr:07d}")
                session_ctr += 1

            total_events = len(events)
            sample_range = max(total_events + 1, work_secs)
            offsets = sorted(random.sample(range(sample_range), min(total_events, sample_range - 1)))
            if len(offsets) < total_events:
                last = offsets[-1] if offsets else 0
                offsets += [last + i for i in range(1, total_events - len(offsets) + 1)]

            # Lunch break: push events between ~2700s–4500s (≈ 12:45–13:15) to after
            adjusted = []
            for off in offsets:
                adjusted.append(off + 1800 if 2700 <= off <= 4500 else off)
            offsets = sorted(adjusted)

            for i, (mod, action) in enumerate(events):
                off = offsets[i] if i < len(offsets) else offsets[-1] + i
                ts  = login_dt + timedelta(seconds=off)
                if ts > logout_dt:
                    ts = logout_dt - timedelta(seconds=max(1, random.randint(1, 300)))
                w.writerow({
                    "employee_id": eid,
                    "timestamp":   ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "module":      mod,
                    "action":      action,
                    "session_id":  sess_ids[i % num_sess],
                })
                total_log_rows += 1

print(f"  [OK] access_logs.csv ({total_log_rows:,} events)")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 13: WRITE peer_cohorts.csv
# ══════════════════════════════════════════════════════════════════════════
pc_rows = []
for emp in employees:
    eid = emp["employee_id"]
    cid = emp_cohort[eid]
    key = next(k for k, v in cohort_map.items() if v == cid)
    pc_rows.append({
        "employee_id":       eid,
        "cohort_id":         cid,
        "role":              key[0],
        "branch":            key[1],
        "experience_bucket": key[2],
        "cohort_size":       len(cohort_members[cid]),
    })
with open(os.path.join(PROC, "peer_cohorts.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["employee_id", "cohort_id", "role",
                                       "branch", "experience_bucket", "cohort_size"])
    w.writeheader(); w.writerows(pc_rows)
print(f"  [OK] peer_cohorts.csv ({len(cohort_map)} cohorts)")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 14: FEATURE ENGINEERING (Steps 17–19)
# ══════════════════════════════════════════════════════════════════════════
print("\nEngineering features (Steps 17–19) ...")

# ── Cohort peer averages (from non-suspicious members) ────────────────────
cohort_peer_avg: dict[str, dict[str, float]] = {}
cohort_peer_std: dict[str, dict[str, float]] = {}

for cid, members in cohort_members.items():
    normals = [m for m in members if m not in SUSPICIOUS_EIDS] or members
    totals: dict[str, float] = {}
    sqs:    dict[str, float] = {}
    cnt = 0
    for eid in normals:
        for d in range(NUM_DAYS):
            for mod, val in daily_lookup[eid][d].items():
                totals[mod] = totals.get(mod, 0.0) + val
                sqs[mod]    = sqs.get(mod, 0.0)    + val * val
            cnt += 1
    cohort_peer_avg[cid] = {}
    cohort_peer_std[cid] = {}
    for mod, tot in totals.items():
        avg = tot / max(1, cnt)
        var = (sqs[mod] / max(1, cnt)) - (avg ** 2)
        cohort_peer_avg[cid][mod] = round(avg, 2)
        cohort_peer_std[cid][mod] = round(math.sqrt(max(0.0, var)), 2)


# ── Helper functions ──────────────────────────────────────────────────────

def rolling_avg(eid: str, mod: str, window: int, up_to: int) -> float:
    vals = [daily_lookup[eid][d].get(mod, 0) for d in range(max(0, up_to - window), up_to)]
    return round(sum(vals) / max(1, len(vals)), 2) if vals else 0.0


def rolling_std_fn(eid: str, mod: str, window: int, up_to: int) -> float:
    vals = [daily_lookup[eid][d].get(mod, 0) for d in range(max(0, up_to - window), up_to)]
    if len(vals) < 2:
        return 0.0
    mn = sum(vals) / len(vals)
    return round(math.sqrt(sum((v - mn) ** 2 for v in vals) / len(vals)), 2)


def days_since_last_fn(eid: str, mod: str, up_to: int) -> int:
    for d in range(up_to - 1, -1, -1):
        if daily_lookup[eid][d].get(mod, 0) > 0:
            return up_to - d
    return up_to + 1


def trend_slope_fn(eid: str, mod: str, window: int, up_to: int) -> float:
    """Linear regression slope over last `window` days (Step 19)."""
    vals = [daily_lookup[eid][d].get(mod, 0) for d in range(max(0, up_to - window), up_to)]
    n = len(vals)
    if n < 3:
        return 0.0
    x_mean = (n - 1) / 2.0
    y_mean = sum(vals) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(vals))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return round(num / den if den != 0 else 0.0, 4)


def drop_pct(current: float, baseline: float) -> float:
    if baseline == 0:
        return 0.0
    return round(max(0.0, (baseline - current) / baseline * 100.0), 2)


def z_score(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return round((value - mean) / std, 3)


# ── Pre-compute login/logout variance per employee (Step 18) ─────────────
_lt = {emp["employee_id"]: [] for emp in employees}
_lo = {emp["employee_id"]: [] for emp in employees}
_sl = {emp["employee_id"]: [] for emp in employees}

for emp in employees:
    eid  = emp["employee_id"]
    pers = PERSONALITIES[eid]
    arr_h, arr_m   = map(int, pers["arrival_time"].split(":"))
    leave_h, leave_m = map(int, pers["leave_time"].split(":"))
    lrng2 = random.Random(hash(eid + "_feat") & 0xFFFF)
    for day_idx in range(NUM_DAYS):
        if not daily_lookup[eid][day_idx] or sum(daily_lookup[eid][day_idx].values()) == 0:
            continue
        av = int(lrng2.gauss(0, 8))
        lv = int(lrng2.gauss(0, 12))
        lm = arr_h * 60 + max(0, min(59, arr_m + av))
        om = leave_h * 60 + max(0, min(59, leave_m + lv))
        _lt[eid].append(lm)
        _lo[eid].append(om)
        _sl[eid].append(max(0, om - lm))


def _list_std(vals: list) -> float:
    if len(vals) < 2: return 0.0
    mn = sum(vals) / len(vals)
    return round(math.sqrt(sum((v - mn) ** 2 for v in vals) / len(vals)), 2)


def _list_mean(vals: list) -> float:
    return round(sum(vals) / len(vals), 2) if vals else 0.0


emp_login_var  = {eid: _list_std(_lt[eid])  for eid in _lt}
emp_logout_var = {eid: _list_std(_lo[eid])  for eid in _lo}
emp_avg_sess   = {eid: _list_mean(_sl[eid]) for eid in _sl}

# Critical modules set
ALL_CRITICAL_MODS = {
    "Loan Approval", "Loan Review", "Audit Reports", "Compliance Dashboard",
    "Override Logs", "Cash Operations", "Treasury", "Risk Dashboard",
    "Account Creation", "Account Closure",
}

# ── Build feature rows ────────────────────────────────────────────────────
print("  Computing per-employee per-day features (this may take ~30 s) ...")
feature_rows = []

for emp in employees:
    eid      = emp["employee_id"]
    role     = emp["role"]
    role_id  = emp["role_id"]
    cid      = emp_cohort[eid]
    exp_mods = set(ROLES.get(role_id, {}).get("expected_modules", []))

    for day_idx in range(NUM_DAYS):
        sim_date = START_DATE + timedelta(days=day_idx)
        dd = daily_lookup[eid][day_idx]

        # Raw counts
        loan_cnt     = dd.get("Loan Approval", 0)
        cust_cnt     = dd.get("Customer Search", 0)
        audit_cnt    = dd.get("Audit Reports", 0)
        comp_cnt     = dd.get("Compliance Dashboard", 0)
        override_cnt = dd.get("Override Logs", 0)
        total_cnt    = sum(dd.values())

        # Rolling averages (Step 17)
        ra7  = rolling_avg(eid, "Audit Reports", 7,  day_idx)
        ra14 = rolling_avg(eid, "Audit Reports", 14, day_idx)
        ra30 = rolling_avg(eid, "Audit Reports", 30, day_idx)
        rc30 = rolling_avg(eid, "Compliance Dashboard", 30, day_idx)
        ro30 = rolling_avg(eid, "Override Logs",        30, day_idx)

        # Rolling std (Step 17)
        rstd7  = rolling_std_fn(eid, "Audit Reports", 7,  day_idx)
        rstd30 = rolling_std_fn(eid, "Audit Reports", 30, day_idx)

        # Trend slopes (Step 19)
        slope_audit    = trend_slope_fn(eid, "Audit Reports",        30, day_idx)
        slope_comp     = trend_slope_fn(eid, "Compliance Dashboard", 30, day_idx)
        slope_override = trend_slope_fn(eid, "Override Logs",        30, day_idx)

        # Days since last access (Step 18)
        dsl_audit    = days_since_last_fn(eid, "Audit Reports",        day_idx)
        dsl_comp     = days_since_last_fn(eid, "Compliance Dashboard", day_idx)
        dsl_override = days_since_last_fn(eid, "Override Logs",        day_idx)

        # Drop percentages vs 30-day rolling baseline
        base_audit = rolling_avg(eid, "Audit Reports",        30, max(day_idx, 1))
        base_comp  = rolling_avg(eid, "Compliance Dashboard", 30, max(day_idx, 1))
        base_over  = rolling_avg(eid, "Override Logs",        30, max(day_idx, 1))
        audit_drop = drop_pct(audit_cnt,    base_audit)
        comp_drop  = drop_pct(comp_cnt,     base_comp)
        over_drop  = drop_pct(override_cnt, base_over)

        # Ratios
        audit_loan_r = round(audit_cnt    / max(1, loan_cnt), 4)
        comp_loan_r  = round(comp_cnt     / max(1, loan_cnt), 4)

        # Module coverage
        accessed_today = {m for m, c in dd.items() if c > 0}
        missing_crit   = exp_mods - accessed_today
        crit_miss_pct  = round(len(missing_crit) / max(1, len(exp_mods)) * 100.0, 2)
        exp_acc = len(exp_mods & accessed_today)
        exp_mis = len(exp_mods - accessed_today)

        # Critical access ratio (Step 18)
        crit_accessed = sum(dd.get(m, 0) for m in ALL_CRITICAL_MODS)
        crit_ratio    = round(crit_accessed / max(1, total_cnt), 4)

        # Peer comparison (Step 10, 17)
        peer_avg_audit = cohort_peer_avg[cid].get("Audit Reports", 0.0)
        peer_std_audit = max(1.0, cohort_peer_std[cid].get("Audit Reports", 1.0))
        peer_diff      = round(audit_cnt - peer_avg_audit, 2)
        peer_z         = z_score(audit_cnt, peer_avg_audit, peer_std_audit)

        # Peer percentile (Step 17)
        cohort_30d = [rolling_avg(m, "Audit Reports", 30, day_idx)
                      for m in cohort_members[cid] if m != eid]
        n_lower    = sum(1 for x in cohort_30d if x < audit_cnt)
        peer_pct   = round(n_lower / max(1, len(cohort_30d)) * 100.0, 1) if cohort_30d else 50.0

        # Behavioural features (Step 18)
        login_var  = emp_login_var[eid]
        logout_var = emp_logout_var[eid]
        avg_sess   = emp_avg_sess[eid]
        ctx_switch = len(accessed_today)                         # context switching score
        mods_sess  = round(total_cnt / 2.0, 1)                  # approx modules per session

        feature_rows.append({
            # Identifiers
            "employee_id":   eid,
            "date":          sim_date.strftime("%Y-%m-%d"),
            "day_index":     day_idx,
            "role":          role,
            "branch":        emp["branch"],
            "cohort_id":     cid,
            "is_suspicious": 1 if eid in SUSPICIOUS_EIDS else 0,
            # Raw
            "loan_access_count":       loan_cnt,
            "customer_search_count":   cust_cnt,
            "audit_access_count":      audit_cnt,
            "compliance_access_count": comp_cnt,
            "override_access_count":   override_cnt,
            "total_daily_accesses":    total_cnt,
            # Time-since (Step 18)
            "days_since_last_audit":      dsl_audit,
            "days_since_last_compliance": dsl_comp,
            "days_since_last_override":   dsl_override,
            # Rolling averages (Step 17)
            "rolling_7_day_audit_avg":      ra7,
            "rolling_14_day_audit_avg":     ra14,
            "rolling_30_day_audit_avg":     ra30,
            "rolling_30_day_comp_avg":      rc30,
            "rolling_30_day_override_avg":  ro30,
            # Rolling std (Step 17)
            "rolling_7_day_audit_std":  rstd7,
            "rolling_30_day_audit_std": rstd30,
            # Trend slopes (Step 19)
            "audit_trend_slope":    slope_audit,
            "comp_trend_slope":     slope_comp,
            "override_trend_slope": slope_override,
            # Drop percentages (Step 17)
            "audit_drop_pct":      audit_drop,
            "compliance_drop_pct": comp_drop,
            "override_drop_pct":   over_drop,
            # Ratios (Step 17)
            "audit_to_loan_ratio":      audit_loan_r,
            "compliance_to_loan_ratio": comp_loan_r,
            # Module coverage (Step 17)
            "critical_module_missing_pct": crit_miss_pct,
            "expected_modules_accessed":   exp_acc,
            "expected_modules_missing":    exp_mis,
            # Peer comparison (Step 17)
            "peer_avg_audit_diff":   peer_diff,
            "peer_std_audit":        peer_std_audit,
            "peer_z_score_audit":    peer_z,
            "peer_percentile_audit": peer_pct,
            # Behavioural (Step 18)
            "login_time_variance":     login_var,
            "logout_time_variance":    logout_var,
            "avg_session_length_min":  avg_sess,
            "context_switching_score": ctx_switch,
            "critical_access_ratio":   crit_ratio,
            "modules_per_session":     mods_sess,
        })

print(f"  [OK] Features computed ({len(feature_rows):,} rows)")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 15: WRITE PROCESSED FILES
# ══════════════════════════════════════════════════════════════════════════

# engineered_features.csv (all metadata + all features)
ef_fields = list(feature_rows[0].keys())
with open(os.path.join(PROC, "engineered_features.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=ef_fields)
    w.writeheader(); w.writerows(feature_rows)
print(f"  [OK] engineered_features.csv ({len(feature_rows):,} rows x {len(ef_fields)} cols)")

# feature_matrix.csv — ONLY training features for Isolation Forest
FM_FEATURES = [
    "loan_access_count", "customer_search_count", "audit_access_count",
    "compliance_access_count", "override_access_count", "total_daily_accesses",
    "days_since_last_audit", "days_since_last_compliance", "days_since_last_override",
    "rolling_7_day_audit_avg", "rolling_14_day_audit_avg", "rolling_30_day_audit_avg",
    "rolling_30_day_comp_avg", "rolling_30_day_override_avg",
    "rolling_7_day_audit_std", "rolling_30_day_audit_std",
    "audit_trend_slope", "comp_trend_slope", "override_trend_slope",
    "audit_drop_pct", "compliance_drop_pct", "override_drop_pct",
    "audit_to_loan_ratio", "compliance_to_loan_ratio",
    "critical_module_missing_pct", "expected_modules_accessed", "expected_modules_missing",
    "peer_avg_audit_diff", "peer_std_audit", "peer_z_score_audit", "peer_percentile_audit",
    "login_time_variance", "logout_time_variance", "avg_session_length_min",
    "context_switching_score", "critical_access_ratio", "modules_per_session",
]
fm_fields = ["employee_id", "date"] + FM_FEATURES
with open(os.path.join(PROC, "feature_matrix.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fm_fields)
    w.writeheader()
    for row in feature_rows:
        w.writerow({k: row[k] for k in fm_fields})
print(f"  [OK] feature_matrix.csv ({len(feature_rows):,} rows x {len(FM_FEATURES)} features)")

# behavioural_features.csv (Step 18)
beh_fields = ["employee_id", "date",
               "login_time_variance", "logout_time_variance", "avg_session_length_min",
               "context_switching_score", "critical_access_ratio", "modules_per_session",
               "days_since_last_audit", "days_since_last_compliance", "days_since_last_override",
               "peer_z_score_audit", "peer_percentile_audit"]
with open(os.path.join(PROC, "behavioural_features.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=beh_fields)
    w.writeheader()
    for row in feature_rows:
        w.writerow({k: row[k] for k in beh_fields})
print(f"  [OK] behavioural_features.csv")

# temporal_features.csv (Step 19)
temp_fields = ["employee_id", "date",
               "rolling_7_day_audit_avg", "rolling_14_day_audit_avg", "rolling_30_day_audit_avg",
               "rolling_30_day_comp_avg", "rolling_30_day_override_avg",
               "rolling_7_day_audit_std", "rolling_30_day_audit_std",
               "audit_trend_slope", "comp_trend_slope", "override_trend_slope"]
with open(os.path.join(PROC, "temporal_features.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=temp_fields)
    w.writeheader()
    for row in feature_rows:
        w.writerow({k: row[k] for k in temp_fields})
print(f"  [OK] temporal_features.csv")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 16: LABELS — ground_truth + anomaly_reason (Steps 9, 20)
# ══════════════════════════════════════════════════════════════════════════
print("\nWriting labels/ ...")

# ground_truth.csv (moved to labels/)
gt_rows = [{"employee_id": e["employee_id"], "name": e["name"],
            "role": e["role"], "fraud_label": 1 if e["employee_id"] in SUSPICIOUS_EIDS else 0}
           for e in employees]
with open(os.path.join(LABELS, "ground_truth.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["employee_id", "name", "role", "fraud_label"])
    w.writeheader(); w.writerows(gt_rows)
print("  [OK] labels/ground_truth.csv")

# anomaly_reason.csv (Step 20) — human-readable explanation per suspicious employee
def build_anomaly_reason(eid: str) -> dict:
    emp   = EMP_MAP[eid]
    strat = FRAUD_STRATEGIES[eid]
    cid   = emp_cohort[eid]

    audit_early  = [daily_lookup[eid][d].get("Audit Reports", 0) for d in range(0, 20)]
    audit_recent = [daily_lookup[eid][d].get("Audit Reports", 0) for d in range(60, 90)]
    avg_early    = sum(audit_early)  / max(1, len(audit_early))
    avg_recent   = sum(audit_recent) / max(1, len(audit_recent))
    a_drop       = drop_pct(avg_recent, avg_early)

    peer_avg = cohort_peer_avg[cid].get("Audit Reports", 0.0)
    peer_std = max(1.0, cohort_peer_std[cid].get("Audit Reports", 1.0))
    sigma    = round((avg_recent - peer_avg) / peer_std, 2)
    dsl      = days_since_last_fn(eid, "Audit Reports", 89)

    # Loan continuity — are they still doing core work?
    loan_recent = [daily_lookup[eid][d].get("Loan Approval", 0) for d in range(60, 90)]
    loan_r      = sum(loan_recent) / max(1, len(loan_recent))

    reasons = []
    if a_drop > 50:
        reasons.append(
            f"Audit Reports access dropped {a_drop:.0f}% from baseline "
            f"(avg {avg_early:.0f}/day early -> {avg_recent:.0f}/day recent)"
        )
    if dsl > 10:
        reasons.append(f"Audit Reports not accessed for {dsl} consecutive days")
    if sigma < -1.5:
        reasons.append(f"Audit access is {abs(sigma):.1f}σ below peer cohort average")
    for mod in strat["targets"]:
        if mod != "Audit Reports":
            mod_e = sum(daily_lookup[eid][d].get(mod, 0) for d in range(0,  20)) / 20.0
            mod_r = sum(daily_lookup[eid][d].get(mod, 0) for d in range(60, 90)) / 30.0
            md    = drop_pct(mod_r, mod_e)
            if md > 40:
                reasons.append(f"{mod} usage declined {md:.0f}% from baseline "
                                f"({mod_e:.0f}/day -> {mod_r:.0f}/day)")
    if loan_r > 5 and avg_recent < 3:
        reasons.append(
            f"Core work (Loan Approval {loan_r:.0f}/day) remains HIGH while oversight "
            f"modules near zero — selective avoidance detected"
        )
    reasons.append(f"Fraud strategy signature: {strat['strategy']}")

    return {
        "employee_id":          eid,
        "name":                 emp["name"],
        "role":                 emp["role"],
        "branch":               emp["branch"],
        "strategy":             strat["strategy"],
        "audit_drop_pct":       round(a_drop, 1),
        "peer_sigma":           sigma,
        "days_since_last_audit": dsl,
        "fade_start_day":       strat["fade_start"],
        "fade_end_day":         strat["fade_end"],
        "target_modules":       "; ".join(strat["targets"]),
        "reasons":              " | ".join(reasons),
    }


anomaly_rows = [build_anomaly_reason(eid) for eid in sorted(SUSPICIOUS_EIDS)]
ar_fields = ["employee_id", "name", "role", "branch", "strategy",
             "audit_drop_pct", "peer_sigma", "days_since_last_audit",
             "fade_start_day", "fade_end_day", "target_modules", "reasons"]
with open(os.path.join(LABELS, "anomaly_reason.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=ar_fields)
    w.writeheader(); w.writerows(anomaly_rows)
print("  [OK] labels/anomaly_reason.csv")

# ══════════════════════════════════════════════════════════════════════════
# SECTION 17: DEMO JSON (Step 20)
# ══════════════════════════════════════════════════════════════════════════
print("\nGenerating demo/demo_dataset.json ...")

demo_emp_ids = (
    sorted(SUSPICIOUS_EIDS)[:1]   # primary suspect (EMP001 — Rajesh Kumar)
    + [next(e["employee_id"] for e in employees
            if e["role"] == "Cashier" and e["employee_id"] not in SUSPICIOUS_EIDS)]
    + [next(e["employee_id"] for e in employees
            if e["role"] == "Risk Analyst" and e["employee_id"] not in SUSPICIOUS_EIDS)]
)

DEMO_START = NUM_DAYS - 14
demo_data  = []

for eid in demo_emp_ids:
    emp   = EMP_MAP[eid]
    cid   = emp_cohort[eid]
    strat = FRAUD_STRATEGIES.get(eid, {})
    anom  = next((a for a in anomaly_rows if a["employee_id"] == eid), {})

    daily_feats = []
    for row in feature_rows:
        if row["employee_id"] != eid or row["day_index"] < DEMO_START:
            continue
        daily_feats.append({
            "date":                 row["date"],
            "day_index":            row["day_index"] - DEMO_START,
            "audit_count":          row["audit_access_count"],
            "compliance_count":     row["compliance_access_count"],
            "override_count":       row["override_access_count"],
            "audit_drop_pct":       row["audit_drop_pct"],
            "compliance_drop_pct":  row["compliance_drop_pct"],
            "override_drop_pct":    row["override_drop_pct"],
            "days_since_last_audit": row["days_since_last_audit"],
            "total_accesses":       row["total_daily_accesses"],
            "audit_trend_slope":    row["audit_trend_slope"],
            "peer_z_score":         row["peer_z_score_audit"],
            "peer_percentile":      row["peer_percentile_audit"],
        })

    demo_data.append({
        "employee_id":     eid,
        "name":            emp["name"],
        "role":            emp["role"],
        "branch":          emp["branch"],
        "experience_years": emp["experience_years"],
        "cohort_id":       cid,
        "personality":     PERSONALITIES[eid],
        "is_suspicious":   1 if eid in SUSPICIOUS_EIDS else 0,
        "fraud_strategy":  strat.get("strategy", "None"),
        "audit_drop_pct":  anom.get("audit_drop_pct", 0),
        "peer_sigma":      anom.get("peer_sigma", 0),
        "anomaly_reasons": anom.get("reasons", "").split(" | ") if anom else [],
        "daily_features":  daily_feats,
    })

with open(os.path.join(DEMO, "demo_dataset.json"), "w", encoding="utf-8") as f:
    json.dump(demo_data, f, indent=2, ensure_ascii=False)
print(f"  [OK] demo_dataset.json ({len(demo_emp_ids)} employees, 14-day window)")

# ══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 62)
print("PHANTOM Engine 2 v2.0 — COMPLETE")
print("=" * 62)
print(f"""
data/
  raw/
    employees.csv          -> {len(employees)} employees  (+8 personality cols)
    branches.csv           -> {len(branches)} branches
    departments.csv        -> {len(depts)} departments
    modules.csv            -> {len(MODULES)} banking modules
    role_permissions.csv   -> {len(rp_rows)} role-module mappings
    holidays.csv           -> {len(hol_rows)} holidays (Jan–Mar 2026)
    promotions.csv         -> {len(promo_out)} promotions
    transfers.csv          -> {len(transfer_out)} transfers
    access_logs.csv        -> {total_log_rows:,} events (session-based)

  processed/
    daily_activity.csv         -> {len(employees) * NUM_DAYS:,} rows (50 emp x 90 days)
    peer_cohorts.csv           -> {len(cohort_map)} cohorts
    behavioural_features.csv   -> {len(feature_rows):,} rows (Step 18)
    temporal_features.csv      -> {len(feature_rows):,} rows (Step 19)
    engineered_features.csv    -> {len(feature_rows):,} x {len(ef_fields)} cols (full)
    feature_matrix.csv         -> {len(feature_rows):,} x {len(FM_FEATURES)} features (IF input)

  labels/
    ground_truth.csv       -> {len(employees)} employees, 4 fraud labels
    anomaly_reason.csv     -> {len(anomaly_rows)} suspicious employees (Step 20)

  demo/
    demo_dataset.json      -> {len(demo_emp_ids)} employees, 14-day window
""")

print("Suspicious Employees & Fraud Strategies:")
for eid in sorted(SUSPICIOUS_EIDS):
    e = EMP_MAP[eid]
    s = FRAUD_STRATEGIES[eid]
    print(f"  {eid}  {e['name']:<18}  {e['role']:<22}  {s['strategy']}")

print("""
Feature Matrix ({} features) -> Isolation Forest -> Access Void Score -> DITS
ground_truth.csv (labels/) is for EVALUATION ONLY — not used in training.
""".format(len(FM_FEATURES)))
