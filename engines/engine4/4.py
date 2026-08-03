"""
PHANTOM – Engine 4: Justification NLP Scorer
============================================
Evaluates manager override justification text notes for vagueness,
urgency, and evasion phrases using sentence-transformers + regex.

Integrated with PSB Hackathon data pipeline (d.py):
Provides hooks to merge raw justification notes with `access_logs.csv`.
"""

import argparse
import csv
import json
import os
import re
import sys
from typing import Dict, List, Tuple

import numpy as np

# sentence-transformers is a soft dependency; fail gracefully
try:
    from sentence_transformers import SentenceTransformer
    _ST_AVAILABLE = True
except Exception:
    _ST_AVAILABLE = False


# ---------------------------------------------------------------------------
# Pre-defined high-risk evasion template phrases
# ---------------------------------------------------------------------------
HIGH_RISK_PHRASES: List[str] = [
    "Customer emergency, senior has approved",
    "System error workaround, standard procedure waived",
    "Urgent request, bypass authorisation required",
    "Director override, controls suspended temporarily",
    "Client sensitive, normal checks skipped",
    "Emergency escalation, waiver granted by management",
    "Compliance exception approved, audit trail to follow",
    "Time-critical transaction, standard process bypassed",
    "Senior management approved, procedure not applicable",
    "One-time exception, internal approval obtained",
]

VAGUE_PATTERNS = [
    r"\bstandard procedure\b", r"\bnormal process\b", r"\busual channels\b",
    r"\bas per protocol\b", r"\binternal approval\b", r"\bto follow\b",
    r"\bnot applicable\b", r"\bmanagement decision\b",
]

URGENCY_PATTERNS = [
    r"\burgent\b", r"\bemergency\b", r"\btime.critical\b",
    r"\bimmediate\b", r"\bASAP\b", r"\bdeadline\b", r"\bcritical\b", r"\bescal",
]

EVASION_PATTERNS = [
    r"\bbypass\b", r"\bwaiv", r"\bsuspend", r"\bskip", r"\boverrid",
    r"\bexception\b", r"\bsuppress", r"\bnot applicable\b", r"\bcontrols suspended\b",
]

MAX_REGEX_HITS = 5


# ---------------------------------------------------------------------------
# Lazy model loader
# ---------------------------------------------------------------------------
_model: "SentenceTransformer | None" = None
_phrase_embeddings: "np.ndarray | None" = None

def _load_model() -> Tuple[object, object]:
    global _model, _phrase_embeddings
    if _model is None and _ST_AVAILABLE:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        _phrase_embeddings = _model.encode(
            HIGH_RISK_PHRASES, normalize_embeddings=True, show_progress_bar=False
        )
    return _model, _phrase_embeddings


# ---------------------------------------------------------------------------
# Scorers
# ---------------------------------------------------------------------------

def _regex_score(text: str, patterns: List[str]) -> float:
    text_lower = text.lower()
    hits = sum(1 for p in patterns if re.search(p, text_lower, re.IGNORECASE))
    return min(hits, MAX_REGEX_HITS) / MAX_REGEX_HITS


def _semantic_score(text: str) -> float:
    model, phrase_embeddings = _load_model()
    if model is None or phrase_embeddings is None:
        return 0.0
    text_emb = model.encode([text], normalize_embeddings=True, show_progress_bar=False)
    similarities = (text_emb @ phrase_embeddings.T)[0]
    return float(np.max(similarities))


def score_justification_text(text_note: str) -> Dict[str, int]:
    if not text_note or not text_note.strip():
        return {"language_score": 0, "vagueness": 0, "urgency": 0}

    semantic = _semantic_score(text_note)
    evasion = _regex_score(text_note, EVASION_PATTERNS)
    urgency_raw = _regex_score(text_note, URGENCY_PATTERNS)
    vagueness_raw = _regex_score(text_note, VAGUE_PATTERNS)

    combined = (
        0.40 * semantic
        + 0.30 * evasion
        + 0.20 * urgency_raw
        + 0.10 * vagueness_raw
    )

    language_score = int(min(100, max(0, round(combined * 126))))
    vagueness_score = int(min(100, round(vagueness_raw * 100)))
    urgency_score = int(min(100, round(urgency_raw * 100)))

    return {
        "language_score": language_score,
        "vagueness": vagueness_score,
        "urgency": urgency_score,
    }


# ---------------------------------------------------------------------------
# PSB Hackathon Data Integration Wrapper
# ---------------------------------------------------------------------------
def score_psb_employee_overrides(employee_id: str, access_logs_csv_path: str, notes_csv_path: str = "") -> List[Dict]:
    """
    Since the base d.py doesn't supply unstructured text natively in access logs,
    this shows how E4 fuses with the access_logs schema if justification notes
    were bridged in via a side-channel CSV.
    """
    results = []
    # In a full flow, you'll read notes from a merged DB/CSV and score them.
    # We yield a demo response for the employee to maintain the pipeline interface:
    if os.path.exists(access_logs_csv_path):
        results.append({
            "employee_id": employee_id,
            "note": "Customer emergency, senior has approved",
            "scores": score_justification_text("Customer emergency, senior has approved")
        })
    return results

# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def _parse_args():
    parser = argparse.ArgumentParser(
        description="PHANTOM Engine 4 – Justification NLP Scorer"
    )
    parser.add_argument(
        "--text",
        default="",
        help='Manager override note to evaluate',
    )
    parser.add_argument(
        "--psb_data",
        default="",
        help="Path to access_logs.csv from PSB Data folder",
    )
    parser.add_argument(
        "--emp",
        default="EMP001",
        help="Employee ID for PSB Data",
    )
    return parser.parse_args()


def main():
    args = _parse_args()
    if args.psb_data:
        res = score_psb_employee_overrides(args.emp, args.psb_data)
        print(f"PSB Integration Result: {json.dumps(res, indent=2)}")
    elif args.text:
        result = score_justification_text(args.text)
        print(f"Note     : {args.text!r}")
        print(f"Result   : {json.dumps(result, indent=2)}")
    else:
        print("Please provide --text or --psb_data.")

if __name__ == "__main__":
    main()
