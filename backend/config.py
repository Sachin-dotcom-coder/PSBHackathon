"""
PHANTOM Backend Configuration & Paths
=====================================
Centralized path resolution and environment settings for the API backend.
"""

import sys
import pathlib

# Path definitions
BACKEND_DIR = pathlib.Path(__file__).parent.resolve()
ROOT_DIR    = BACKEND_DIR.parent.resolve()

# Ensure BACKEND_DIR and ROOT_DIR are in sys.path
for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Engine directories
ENGINE1_DIR = ROOT_DIR / "engines" / "engine1"
ENGINE2_DIR = ROOT_DIR / "engines" / "engine2" / "engine2_negative_access"
ENGINE3_DIR = ROOT_DIR / "engines" / "engine3"
ENGINE4_DIR = ROOT_DIR / "engines" / "engine4"

# Data directories
DATA_DIR            = ROOT_DIR / "data"
RAW_DATA_DIR        = DATA_DIR / "raw"
PROCESSED_DATA_DIR  = DATA_DIR / "processed"
OUTPUTS_DIR         = ENGINE2_DIR / "outputs"
PREDICTIONS_DIR     = OUTPUTS_DIR / "predictions"

# Specific file paths
EMPLOYEES_CSV       = RAW_DATA_DIR / "employees.csv"
ACCESS_LOGS_CSV     = RAW_DATA_DIR / "access_logs.csv"
JUSTIFICATION_NOTES_CSV = RAW_DATA_DIR / "justification_notes.csv"
PEER_COHORTS_CSV    = PROCESSED_DATA_DIR / "peer_cohorts.csv"
DAILY_ACTIVITY_CSV  = PROCESSED_DATA_DIR / "daily_activity.csv"
PREDICTIONS_JSON    = PREDICTIONS_DIR / "predictions.json"
DAILY_SCORES_CSV    = PREDICTIONS_DIR / "daily_scores.csv"
TIMELINE_JSON_DIR   = OUTPUTS_DIR / "timeline_json"

# Default suspect set for high-risk tracking
SUSPECT_EMPLOYEES   = {"EMP001", "EMP010", "EMP015", "EMP023"}

# Add engine paths to sys.path
for path in [str(ENGINE1_DIR), str(ENGINE2_DIR), str(ENGINE3_DIR), str(ENGINE4_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)
