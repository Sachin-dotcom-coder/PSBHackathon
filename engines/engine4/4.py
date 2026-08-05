"""
PHANTOM – Engine 4: Justification NLP Scorer
============================================
Evaluates manager override justification text notes for behavioural threat signatures,
template reuse, temporal-context contradictions, and provides natural language explanations.
"""

import argparse
import csv
import json
import math
import os
import re
from collections import Counter
from datetime import datetime
from typing import Dict, List, Tuple, Any

# Optional sentence-transformers support
_ST_AVAILABLE = False
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    _ST_AVAILABLE = True
except Exception:
    pass


# ---------------------------------------------------------------------------
# 1. Behavioral Dictionaries and Semantic Seeds
# ---------------------------------------------------------------------------

CATEGORIES = [
    "Authority",
    "Policy Bypass",
    "Responsibility Shift",
    "Vagueness",
    "Urgency",
    "Social Engineering"
]

KEYWORDS: Dict[str, List[str]] = {
    "Authority": [
        r"\bmanager\b", r"\bdirector\b", r"\bsenior\b", r"\bsupervisor\b", r"\bhead\b",
        r"\bauthority\b", r"\bexecutive\b", r"\binstruct\b", r"\bcommand\b", r"\bverbal\b",
        r"\bsir\b", r"\boffice\b", r"\bgm\b", r"\bvp\b", r"\bescalat\b"
    ],
    "Policy Bypass": [
        r"\bbypass\b", r"\boverride\b", r"\bwaiv\b", r"\bskip\b", r"\bexception\b",
        r"\bignore\b", r"\bsuspend\b", r"\bcontrols\b", r"\bchecklist\b", r"\bexemption\b",
        r"\bprotocol\b"
    ],
    "Responsibility Shift": [
        r"\binsist\b", r"\brequest\b", r"\badvise\b", r"\bdiscuss\b", r"\border\b",
        r"\bclient\b", r"\bcustomer\b", r"\btold\b", r"\bco-worker\b", r"\bcolleague\b"
    ],
    "Vagueness": [
        r"\bhandled\b", r"\bresolved\b", r"\bdone\b", r"\bcomplet\b", r"\bnecessar\b",
        r"\brequir\b", r"\busual\b", r"\bok\b", r"\bprocess\b", r"\baction\b", r"\bupdat\b"
    ],
    "Urgency": [
        r"\burgent\b", r"\bemergency\b", r"\basap\b", r"\bimmediate\b", r"\bcritical\b",
        r"\bdeadline\b", r"\btime-critical\b", r"\btime-sensitive\b", r"\bpriority\b",
        r"\bquick\b", r"\bfast\b"
    ],
    "Social Engineering": [
        r"\bvip\b", r"\bsensitive\b", r"\bconfidential\b", r"\btrust\b", r"\bspecial\b",
        r"\bpromoter\b", r"\bdisclose\b", r"\bprivate\b", r"\bhigh-profile\b", r"\bsecret\b"
    ]
}

SEED_PHRASES: Dict[str, List[str]] = {
    "Authority": [
        "senior manager approved", "verbal approval from supervisor", "sir instructed override",
        "management bypass instruction", "director override approved", "regional head permission",
        "manager approved override applied", "sir approved this bypass"
    ],
    "Policy Bypass": [
        "override applied skip verification", "standard procedure waived", "bypass standard checklist",
        "controls suspended temporarily", "skip validation exception", "ignore protocol override",
        "skipped kyc verification exception applied"
    ],
    "Responsibility Shift": [
        "customer insisted on urgency", "client requested to skip checks", "as advised by branch head",
        "as discussed on phone", "verbal permission from senior", "manager requested to bypass limits"
    ],
    "Vagueness": [
        "handled standard override", "resolved necessary exception", "required process done",
        "necessary override action", "as usual procedure waiver", "done as requested"
    ],
    "Urgency": [
        "immediate emergency bypass checks", "asap processing required critical client",
        "time-sensitive transfer override limit", "emergency exception process immediately",
        "critical deadline ignore standard delays"
    ],
    "Social Engineering": [
        "vip customer transaction skip regular verify", "sensitive client profile do not ask identity",
        "confidential corporate override", "trust client profile skip documents verification"
    ]
}


# ---------------------------------------------------------------------------
# 2. Local TF-IDF Character N-Gram Vectorizer (Multilingual Fallback)
# ---------------------------------------------------------------------------

def _get_char_ngrams(text: str, n_range=(3, 5)) -> List[str]:
    text_lower = text.lower().strip()
    # Normalize spaces
    text_clean = re.sub(r"\s+", " ", text_lower)
    ngrams = []
    for n in range(n_range[0], n_range[1] + 1):
        for i in range(len(text_clean) - n + 1):
            ngrams.append(text_clean[i:i+n])
    return ngrams

def _cosine_similarity(vec1: Counter, vec2: Counter) -> float:
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    return float(numerator) / denominator

class CustomNgramMatcher:
    def __init__(self):
        self.seed_vectors = {}
        for cat, seeds in SEED_PHRASES.items():
            self.seed_vectors[cat] = [Counter(_get_char_ngrams(s)) for s in seeds]

    def score_text(self, text: str, cat: str) -> float:
        if not text or not text.strip():
            return 0.0
        text_vec = Counter(_get_char_ngrams(text))
        max_sim = 0.0
        for seed_vec in self.seed_vectors[cat]:
            sim = _cosine_similarity(text_vec, seed_vec)
            if sim > max_sim:
                max_sim = sim
        return max_sim

_matcher = CustomNgramMatcher()


# ---------------------------------------------------------------------------
# 3. Model Loader (SentenceTransformer)
# ---------------------------------------------------------------------------

_st_model = None

def _load_st_model():
    global _st_model
    if _st_model is None and _ST_AVAILABLE:
        try:
            # Load a lightweight, multilingual sentence embedder
            _st_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        except Exception:
            pass
    return _st_model


# ---------------------------------------------------------------------------
# 4. Scoring Engines & Detectors
# ---------------------------------------------------------------------------

def score_category(text: str, cat: str) -> float:
    """Computes risk score (0.0 to 1.0) for a specific behavioural category."""
    text_lower = text.lower()
    
    # 1. Regex hits ratio
    patterns = KEYWORDS[cat]
    hits = sum(1 for p in patterns if re.search(p, text_lower))
    regex_ratio = min(hits / 3.0, 1.0)  # capped at 3 hits for maximum regex score
    
    # 2. Semantic score (sentence-transformers if available, fallback to TF-IDF ngrams)
    semantic_score = 0.0
    st_model = _load_st_model()
    if st_model is not None:
        try:
            # Encode input text and seeds to compute cosine similarity
            seeds = SEED_PHRASES[cat]
            all_texts = [text] + seeds
            embs = st_model.encode(all_texts, normalize_embeddings=True, show_progress_bar=False)
            sims = np.dot(embs[1:], embs[0])
            semantic_score = float(np.max(sims))
        except Exception:
            semantic_score = _matcher.score_text(text, cat)
    else:
        semantic_score = _matcher.score_text(text, cat)
        
    # Combine scores: 60% semantic + 40% regex
    combined = 0.60 * semantic_score + 0.40 * regex_ratio
    return min(1.0, max(0.0, combined))


# ---------------------------------------------------------------------------
# 5. Core NLP Analysis
# ---------------------------------------------------------------------------

def analyze_justification(text: str, history: List[str] = None, system_event: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Runs the full behavioral scoring pipeline on a justification note.
    """
    if not text or not text.strip():
        return {
            "language_score": 0,
            "categories": {cat: 0 for cat in CATEGORIES},
            "evidence": {cat: [] for cat in CATEGORIES},
            "template_reuse": 0,
            "contradiction": 0,
            "confidence": 0,
            "explanation": "No justification text provided."
        }

    # 1. Calculate Category Scores
    cat_scores = {}
    evidence = {}
    for cat in CATEGORIES:
        score_val = score_category(text, cat)
        cat_scores[cat] = int(round(score_val * 100))
        
        # Extract matching evidence keywords
        matches = [p.replace(r"\b", "") for p in KEYWORDS[cat] if re.search(p, text.lower())]
        evidence[cat] = matches

    # 2. Template Reuse Scorer
    template_reuse = 0
    if history:
        # Check similarity of current text against all historical notes
        max_sim = 0.0
        text_vec = Counter(_get_char_ngrams(text))
        for hist_note in history:
            hist_vec = Counter(_get_char_ngrams(hist_note))
            sim = _cosine_similarity(text_vec, hist_vec)
            if sim > max_sim:
                max_sim = sim
        
        # Scaled: above 0.85 similarity starts scaling up to 100%
        if max_sim > 0.80:
            template_reuse = int(min(100, round((max_sim - 0.80) / 0.20 * 100)))

    # 3. Contradiction Detection
    contradiction = 0
    contradiction_reasons = []
    if system_event:
        # Context mismatch: check if justification claims customer cash withdrawal
        # but the module is a back-office administration or report
        text_lower = text.lower()
        module = system_event.get("module", "").lower()
        
        # Cash/Customer mentioned in override, but system module is Audit/Compliance
        if ("cash" in text_lower or "customer" in text_lower) and ("audit" in module or "compliance" in module):
            contradiction = 50
            contradiction_reasons.append("Justification claims 'Customer Cash Emergency' but system action was 'Audit Reports'.")
            
        # Check time delay if timestamps are provided
        action_ts = system_event.get("timestamp")
        justification_ts = system_event.get("justification_timestamp")
        if action_ts and justification_ts:
            try:
                fmt = "%Y-%m-%d %H:%M:%S"
                t_act = datetime.strptime(action_ts, fmt)
                t_just = datetime.strptime(justification_ts, fmt)
                delay_mins = (t_just - t_act).total_seconds() / 60.0
                if delay_mins > 15.0:
                    contradiction = max(contradiction, 80)
                    contradiction_reasons.append(f"Justification submitted {int(delay_mins)} minutes AFTER action completion (standard limit is 15 minutes).")
            except Exception:
                pass

    # 4. Overall Language Risk Score (Weighted average of top features)
    max_cat_score = max(cat_scores.values())
    overall_base = (
        0.50 * max_cat_score +
        0.20 * cat_scores.get("Policy Bypass", 0) +
        0.15 * template_reuse +
        0.15 * contradiction
    )
    
    # Scale score slightly based on number of active categories
    active_cats = sum(1 for s in cat_scores.values() if s > 50)
    score_boost = active_cats * 5
    language_score = int(min(100, max(0, round(overall_base + score_boost))))

    # 5. Confidence Score
    # Higher word count + clear signals = high confidence. Extremely short notes = lower confidence.
    word_count = len(text.split())
    length_penalty = max(0, 40 - word_count * 5)  # penalty if less than 8 words
    signal_strength = max(cat_scores.values())
    confidence = int(min(100, max(30, round(95 - length_penalty + (signal_strength * 0.1)))))

    # 6. Natural Language Explanation Generator
    explanation_parts = []
    if language_score > 60:
        explanation_parts.append(f"High risk justification language flagged (Risk Score: {language_score}).")
        
        triggers = []
        for cat, score in cat_scores.items():
            if score > 60:
                triggers.append(f"{cat} indicators detected ({score}/100) matching keywords: {', '.join(evidence[cat])}")
        
        if triggers:
            explanation_parts.append("• " + "\n• ".join(triggers))
            
        if template_reuse > 60:
            explanation_parts.append(f"• High template reuse: note is highly similar to previous justifications written by this employee.")
            
        if contradiction > 0:
            explanation_parts.append(f"• Contradiction detected: " + " ".join(contradiction_reasons))
            
        explanation_parts.append("Linguistic patterns match common employee override avoidance signatures.")
    else:
        explanation_parts.append(f"Low risk justification language (Risk Score: {language_score}). Note follows standard banking business terminology.")

    explanation = "\n".join(explanation_parts)

    return {
        "language_score": language_score,
        "categories": cat_scores,
        "evidence": evidence,
        "template_reuse": template_reuse,
        "contradiction": contradiction,
        "confidence": confidence,
        "explanation": explanation
    }


def score_justification_text(text: str) -> Dict[str, Any]:
    """Backward-compatibility wrapper for backend API integration."""
    res = analyze_justification(text)
    res["vagueness"] = res["categories"].get("Vagueness", 0)
    res["urgency"] = res["categories"].get("Urgency", 0)
    return res


# ---------------------------------------------------------------------------
# 6. Model Evaluation Function
# ---------------------------------------------------------------------------

def run_evaluation(evaluation_csv_path: str) -> Dict[str, float]:
    """Runs evaluation on standard ground truth justification dictionary."""
    if not os.path.exists(evaluation_csv_path):
        print(f"[Error] Evaluation file not found at {evaluation_csv_path}")
        return {}

    y_true = []
    y_pred = []
    
    with open(evaluation_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = row["text"]
            true_label = int(row["label"]) # 1 = suspicious, 0 = legitimate
            
            analysis = analyze_justification(text)
            pred_score = analysis["language_score"]
            # Classify as suspicious if score >= 50
            pred_label = 1 if pred_score >= 50 else 0
            
            y_true.append(true_label)
            y_pred.append(pred_label)

    # Compute metrics manually to keep script zero-dependency
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)

    accuracy = (tp + tn) / len(y_true) if y_true else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    print("=" * 60)
    print("ENGINE 4 EVALUATION REPORT (LEGITIMATE VS SUSPICIOUS DETECTOR)")
    print("=" * 60)
    print(f"Total Evaluation Samples : {len(y_true)}")
    print(f"True Positives (TP)      : {tp}  | False Positives (FP): {fp}")
    print(f"True Negatives (TN)      : {tn}  | False Negatives (FN): {fn}")
    print("-" * 60)
    print(f"Accuracy                 : {accuracy:.4f}")
    print(f"Precision                : {precision:.4f}")
    print(f"Recall                   : {recall:.4f}")
    print(f"F1-Score                 : {f1:.4f}")
    print("=" * 60)

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1
    }


# ---------------------------------------------------------------------------
# 7. CLI Entry Point
# ---------------------------------------------------------------------------

def _parse_args():
    parser = argparse.ArgumentParser(
        description="PHANTOM Engine 4 – Justification Behavioural NLP Scorer"
    )
    parser.add_argument(
        "--text",
        default="",
        help="Manager override note to evaluate",
    )
    parser.add_argument(
        "--evaluate",
        action="store_true",
        help="Run model evaluation on evaluation_notes.csv",
    )
    parser.add_argument(
        "--emp",
        default="",
        help="Employee ID to fetch historical timeline justifications",
    )
    return parser.parse_args()


def main():
    args = _parse_args()
    
    if args.evaluate:
        csv_path = "data/raw/evaluation_notes.csv"
        run_evaluation(csv_path)
    elif args.text:
        # If employee is specified, look up historical notes for template reuse
        history = []
        if args.emp and os.path.exists("data/raw/justifications.csv"):
            with open("data/raw/justifications.csv", "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    if r["employee_id"] == args.emp:
                        history.append(r["justification"])
                        
        result = analyze_justification(args.text, history=history)
        print(f"Note     : {args.text!r}")
        print(f"Result   : {json.dumps(result, indent=2)}")
    else:
        print("Please provide --text or --evaluate. Run --help for options.")


if __name__ == "__main__":
    main()
