"""
PHANTOM Engine Loader
=====================
Loads all 4 detection engine modules cleanly using importlib and standard imports.
"""

import sys
import importlib.util
from typing import Any
from config import ENGINE1_DIR, ENGINE2_DIR, ENGINE3_DIR, ENGINE4_DIR


def _load_module_from_path(name: str, filepath: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, filepath)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load spec for module {name} at {filepath}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


# Engine 1 (Temporal Sequence Scorer)
engine1 = _load_module_from_path("engine1", str(ENGINE1_DIR / "1.py"))

# Engine 2 (Negative Access Isolation Forest)
try:
    from model.predict import predict_all, predict_employee
except ImportError:
    predict_all = None
    predict_employee = None

# Engine 3 (Collusion Graph)
engine3 = _load_module_from_path("engine3", str(ENGINE3_DIR / "3.py"))

# Engine 4 (Justification NLP)
engine4 = _load_module_from_path("engine4", str(ENGINE4_DIR / "4.py"))
