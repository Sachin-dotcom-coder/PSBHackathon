"""
paths.py — Centralized path configuration for Engine 2 Negative Access Profiler.
All other modules import from here so paths never need changing elsewhere.
"""
import pathlib

# Engine root: engines/engine2/engine2_negative_access/
ENGINE_DIR   = pathlib.Path(__file__).parent.resolve()

# Project root: PSBHackathon/   (3 levels up from engine2_negative_access/)
PROJECT_ROOT = ENGINE_DIR.parents[2]

# Data directories
DATA_DIR         = PROJECT_ROOT / "data"
FEATURE_MATRIX   = DATA_DIR / "processed" / "feature_matrix.csv"
ENG_FEATURES     = DATA_DIR / "processed" / "engineered_features.csv"
DAILY_ACTIVITY   = DATA_DIR / "processed" / "daily_activity.csv"
GROUND_TRUTH     = DATA_DIR / "labels"    / "ground_truth.csv"
ANOMALY_REASONS  = DATA_DIR / "labels"    / "anomaly_reason.csv"
EMPLOYEES_CSV    = DATA_DIR / "raw"       / "employees.csv"

# Output directories (created on import)
OUTPUTS_DIR     = ENGINE_DIR / "outputs"
MODELS_DIR      = OUTPUTS_DIR / "models"
PREDICTIONS_DIR = OUTPUTS_DIR / "predictions"
PLOTS_DIR       = OUTPUTS_DIR / "plots"

for _d in [MODELS_DIR, PREDICTIONS_DIR, PLOTS_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# Config file
CONFIG_YAML = ENGINE_DIR / "model" / "config.yaml"
