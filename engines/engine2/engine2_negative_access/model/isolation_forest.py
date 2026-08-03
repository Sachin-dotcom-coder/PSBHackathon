"""
isolation_forest.py — Step 6-8 of new_instruct.md

NegativeAccessProfiler: wrapper around sklearn IsolationForest
configured specifically for banking access-void detection.
"""
import sys
import pathlib
import yaml
import numpy as np
from sklearn.ensemble import IsolationForest

_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import CONFIG_YAML


class NegativeAccessProfiler:
    """
    Isolation Forest wrapper for detecting employees who avoid oversight modules.

    Training:
        model.fit(X)
        # X = (n_samples, n_features) numerical feature matrix
        # No labels needed — purely unsupervised

    Scoring:
        raw_scores = model.decision_function(X)
        # More negative  ->  more anomalous  ->  higher Access Void Score
    """

    def __init__(self, config_path=None):
        if config_path is None:
            config_path = CONFIG_YAML

        with open(config_path, "r") as f:
            cfg = yaml.safe_load(f)

        mc = cfg.get("model", {})

        self.n_estimators  = mc.get("n_estimators",  300)
        self.contamination = mc.get("contamination",  0.08)
        self.max_samples   = mc.get("max_samples",   "auto")
        self.max_features  = mc.get("max_features",   1.0)
        self.bootstrap     = mc.get("bootstrap",      False)
        self.random_state  = mc.get("random_state",   42)

        self.model = IsolationForest(
            n_estimators  = self.n_estimators,
            contamination = self.contamination,
            max_samples   = self.max_samples,
            max_features  = self.max_features,
            bootstrap     = self.bootstrap,
            random_state  = self.random_state,
            n_jobs        = -1,
        )

        self._fitted = False

    # ── Core API ──────────────────────────────────────────────────────────

    def fit(self, X):
        """
        Train the Isolation Forest on the full feature matrix.

        Isolation Forest does NOT know who is fraudulent.
        It learns what 'Normal Behaviour' looks like across all 4,500 employee-days.
        Employees with negative-access patterns become isolated quickly
        (shorter average path length across 300 trees).

        Parameters
        ----------
        X : pd.DataFrame or np.ndarray, shape (n_samples, n_features)
        """
        print(f"[NegativeAccessProfiler] Training Isolation Forest")
        print(f"  n_estimators  = {self.n_estimators}")
        print(f"  contamination = {self.contamination}  (8% = 4/50 employees)")
        print(f"  random_state  = {self.random_state}")
        print(f"  Samples       = {len(X):,}")

        self.model.fit(X)
        self._fitted = True
        print(f"  Training complete.")
        return self

    def decision_function(self, X):
        """
        Return raw anomaly scores.
        More negative = more anomalous = higher Access Void Score.
        Do NOT display these directly to users (Step 9).
        """
        self._assert_fitted()
        return self.model.decision_function(X)

    def score_samples(self, X):
        """
        sklearn score_samples — lower value = more anomalous.
        Equivalent to decision_function but shifted by offset.
        """
        self._assert_fitted()
        return self.model.score_samples(X)

    def predict(self, X):
        """
        Binary prediction: -1 = anomaly, 1 = normal.
        Note: threshold is controlled by 'contamination' parameter.
        """
        self._assert_fitted()
        return self.model.predict(X)

    # ── Internals ─────────────────────────────────────────────────────────

    def _assert_fitted(self):
        if not self._fitted:
            raise RuntimeError(
                "NegativeAccessProfiler: call .fit(X) before scoring."
            )

    def __repr__(self):
        return (
            f"NegativeAccessProfiler("
            f"n_estimators={self.n_estimators}, "
            f"contamination={self.contamination}, "
            f"fitted={self._fitted})"
        )
