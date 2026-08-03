"""
explainability.py — Step 11 of new_instruct.md

Generates human-readable reasons for each employee's Access Void Score.
Isolation Forest cannot explain itself — this module provides the narrative.

Strategy: For each employee, compute key statistics from engineered_features.csv
          and produce a ranked list of reasons driving their score.
"""
import sys
import pathlib
import pandas as pd
import numpy as np

_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import ENG_FEATURES, EMPLOYEES_CSV


def _load_employee_info():
    """Load employee name + role lookup."""
    try:
        df = pd.read_csv(EMPLOYEES_CSV, usecols=["employee_id", "name", "role", "branch"])
        return df.set_index("employee_id").to_dict(orient="index")
    except Exception:
        return {}


def _compute_emp_stats(ef_df: pd.DataFrame, eid: str) -> dict:
    """
    Compute per-employee statistics from engineered_features.csv.
    Uses last 30 days vs first 20 days for baseline comparison.
    """
    emp = ef_df[ef_df["employee_id"] == eid].sort_values("date")
    if emp.empty:
        return {}

    n = len(emp)
    early  = emp.head(min(20, n))
    recent = emp.tail(min(30, n))

    def avg(grp, col):
        return grp[col].mean() if col in grp.columns else 0.0

    stats = {
        "audit_early":     avg(early,  "audit_access_count"),
        "audit_recent":    avg(recent, "audit_access_count"),
        "comp_early":      avg(early,  "compliance_access_count"),
        "comp_recent":     avg(recent, "compliance_access_count"),
        "override_early":  avg(early,  "override_access_count"),
        "override_recent": avg(recent, "override_access_count"),
        "loan_recent":     avg(recent, "loan_access_count"),
        "dsl_audit":       recent["days_since_last_audit"].max()  if "days_since_last_audit"    in recent.columns else 0,
        "dsl_comp":        recent["days_since_last_compliance"].max() if "days_since_last_compliance" in recent.columns else 0,
        "dsl_override":    recent["days_since_last_override"].max()  if "days_since_last_override"   in recent.columns else 0,
        "peer_z":          avg(recent, "peer_z_score_audit"),
        "peer_pct":        avg(recent, "peer_percentile_audit"),
        "crit_miss_pct":   avg(recent, "critical_module_missing_pct"),
        "audit_slope":     avg(recent, "audit_trend_slope"),
    }
    return stats


def _drop_pct(recent, early):
    if early < 0.5:
        return 0.0
    return max(0.0, (early - recent) / early * 100.0)


def generate_reasons_for_employee(stats: dict, emp_info: dict) -> list:
    """
    Build an ordered list of human-readable reason strings.
    Most impactful reasons come first.
    """
    reasons = []

    # 1. Days since last audit
    dsl = stats.get("dsl_audit", 0)
    if dsl >= 15:
        reasons.append(f"Audit Reports not accessed for {int(dsl)} consecutive days")
    elif dsl >= 7:
        reasons.append(f"Audit Reports access gap: {int(dsl)} days without access")

    # 2. Audit access drop %
    drop_audit = _drop_pct(stats.get("audit_recent", 0), stats.get("audit_early", 0))
    if drop_audit >= 80:
        reasons.append(
            f"Audit Reports usage dropped {drop_audit:.0f}% "
            f"(avg {stats['audit_early']:.0f}/day early -> {stats['audit_recent']:.0f}/day recently)"
        )
    elif drop_audit >= 40:
        reasons.append(f"Audit Reports usage declining — {drop_audit:.0f}% reduction from baseline")

    # 3. Compliance drop
    drop_comp = _drop_pct(stats.get("comp_recent", 0), stats.get("comp_early", 0))
    if drop_comp >= 70:
        reasons.append(
            f"Compliance Dashboard usage dropped {drop_comp:.0f}% "
            f"({stats['comp_early']:.0f}/day -> {stats['comp_recent']:.0f}/day)"
        )
    elif drop_comp >= 40:
        reasons.append(f"Compliance Dashboard access declining: {drop_comp:.0f}% reduction")

    # 4. Override Logs drop
    drop_override = _drop_pct(stats.get("override_recent", 0), stats.get("override_early", 0))
    if drop_override >= 70:
        reasons.append(
            f"Override Logs usage dropped {drop_override:.0f}% "
            f"({stats['override_early']:.0f}/day -> {stats['override_recent']:.0f}/day)"
        )

    # 5. Days since compliance/override
    dsl_comp = stats.get("dsl_comp", 0)
    if dsl_comp >= 12:
        reasons.append(f"Compliance Dashboard absent for {int(dsl_comp)} consecutive days")

    dsl_over = stats.get("dsl_override", 0)
    if dsl_over >= 12:
        reasons.append(f"Override Logs absent for {int(dsl_over)} consecutive days")

    # 6. Peer deviation
    peer_z = stats.get("peer_z", 0.0)
    peer_pct = stats.get("peer_pct", 50.0)
    if peer_z <= -2.0:
        reasons.append(
            f"Audit access is {abs(peer_z):.1f} standard deviations below peer cohort average"
        )
    elif peer_z <= -1.5:
        reasons.append(
            f"Peer deviation: {abs(peer_z):.1f}sigma below cohort — in bottom {100-peer_pct:.0f}% of peers"
        )

    # 7. Selective avoidance signature
    loan_r = stats.get("loan_recent", 0.0)
    if loan_r > 10 and (stats.get("audit_recent", 0) < 2):
        reasons.append(
            f"Selective avoidance: core work (Loan Approvals {loan_r:.0f}/day) "
            f"remains HIGH while oversight modules near zero — indicates deliberate avoidance"
        )

    # 8. Critical module coverage
    crit_miss = stats.get("crit_miss_pct", 0.0)
    if crit_miss >= 60:
        reasons.append(
            f"{crit_miss:.0f}% of expected critical modules consistently unaccessed"
        )

    # 9. Negative trend
    slope = stats.get("audit_slope", 0.0)
    if slope < -1.5:
        reasons.append(
            f"Downward trend in Audit Reports access (slope {slope:.2f} accesses/day)"
        )

    if not reasons:
        reasons.append("Minor deviation from peer cohort baseline — monitoring recommended")

    return reasons


def generate_reasons(meta_df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate explanations for ALL employees in meta_df.
    Expects meta_df to have columns: employee_id, date

    Returns DataFrame with columns: employee_id, reasons_text, reasons_json
    """
    # Load enriched features
    try:
        ef_df = pd.read_csv(ENG_FEATURES)
    except Exception:
        # Fallback: use meta_df itself if engineered features not available
        ef_df = meta_df.copy()

    emp_info = _load_employee_info()
    results  = []

    for eid in meta_df["employee_id"].unique():
        stats   = _compute_emp_stats(ef_df, eid)
        info    = emp_info.get(eid, {})
        reasons = generate_reasons_for_employee(stats, info)
        results.append({
            "employee_id":  eid,
            "reasons_text": " | ".join(reasons),
            "reasons_json": reasons,
        })

    return pd.DataFrame(results)


def format_explanation_json(eid: str, name: str, score: float, risk: str, reasons: list) -> dict:
    """
    Return the structured JSON explanation as shown in new_instruct.md Step 11.
    """
    return {
        "employee_id":      eid,
        "name":             name,
        "access_void_score": score,
        "risk":             risk,
        "reasons":          reasons,
    }
