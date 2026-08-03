"""
save_model.py — Step 14 of new_instruct.md

Save and load the trained NegativeAccessProfiler using joblib.
joblib is preferred over pickle for sklearn models (Step 14).
"""
import sys
import pathlib
import joblib

_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import MODELS_DIR


DEFAULT_MODEL_PATH = MODELS_DIR / "isolation_forest.pkl"


def save_model(profiler, path=None):
    """
    Persist the NegativeAccessProfiler to disk using joblib.

    Parameters
    ----------
    profiler : NegativeAccessProfiler instance (fitted)
    path     : pathlib.Path or str — default outputs/models/isolation_forest.pkl
    """
    if path is None:
        path = DEFAULT_MODEL_PATH

    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(profiler, path)
    size_kb = path.stat().st_size / 1024
    print(f"[save_model] Model saved -> {path}  ({size_kb:.1f} KB)")
    return path


def load_model(path=None):
    """
    Load a previously saved NegativeAccessProfiler from disk.

    Parameters
    ----------
    path : pathlib.Path or str — default outputs/models/isolation_forest.pkl

    Returns
    -------
    NegativeAccessProfiler (fitted)
    """
    if path is None:
        path = DEFAULT_MODEL_PATH

    path = pathlib.Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"[load_model] Model not found at {path}. "
            f"Run model/train.py first."
        )

    profiler = joblib.load(path)
    print(f"[load_model] Model loaded <- {path}")
    return profiler
