"""
timeline.py — Step 1–15 of the new timeline instructions.
Generates:
  1. Detailed 5-subplot aligned PNG timelines for each employee.
  2. Standardized JSON timeline data files for the dashboard.
  3. Human-readable text summaries detailing the behavioral shift story.
"""
import os
import sys
import json
import pathlib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Ensure parent directory is in path for imports
_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import DATA_DIR, OUTPUTS_DIR, PREDICTIONS_DIR, ENG_FEATURES, DAILY_ACTIVITY, EMPLOYEES_CSV
from visualization.timeline_utils import (
    detect_decline_start,
    detect_first_zero,
    detect_risk_threshold_cross,
    get_trend_indicator
)

# Output directories
TIMELINES_PLOT_DIR = OUTPUTS_DIR / "plots" / "employee_timelines"
TIMELINES_JSON_DIR = OUTPUTS_DIR / "timeline_json"
TIMELINES_SUMM_DIR = OUTPUTS_DIR / "timeline_summary"

for d in [TIMELINES_PLOT_DIR, TIMELINES_JSON_DIR, TIMELINES_SUMM_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def load_data():
    """Load and merge required data structures."""
    try:
        activity = pd.read_csv(DAILY_ACTIVITY)
        daily_scores = pd.read_csv(PREDICTIONS_DIR / "daily_scores.csv")
        scores = pd.read_csv(PREDICTIONS_DIR / "scores.csv")
        employees = pd.read_csv(EMPLOYEES_CSV)
        cohorts = pd.read_csv(DATA_DIR / "processed" / "peer_cohorts.csv")
        
        # Merge daily_scores with activity counts
        merged_daily = daily_scores.merge(
            activity,
            on=["employee_id", "date"],
            how="inner",
            suffixes=("", "_act")
        )
        return merged_daily, scores, employees, cohorts
    except Exception as e:
        print(f"[Error] Failed to load data files: {e}")
        print("Please verify d2.py and model/train.py have been executed.")
        sys.exit(1)


def generate_employee_timeline(eid: str, merged_daily: pd.DataFrame, scores_df: pd.DataFrame, employees_df: pd.DataFrame, cohorts_df: pd.DataFrame):
    """
    Generate plots, JSON, and text summary for a single employee.
    """
    emp_info = employees_df[employees_df["employee_id"] == eid].iloc[0]
    emp_scores = scores_df[scores_df["employee_id"] == eid]
    
    if emp_scores.empty:
        # Fallback if not found in predictions
        return
    
    emp_score_row = emp_scores.iloc[0]
    
    # Get employee daily activity and scores sorted by day_index
    emp_daily = merged_daily[merged_daily["employee_id"] == eid].sort_values("day_index").copy()
    
    # Calculate 7-day rolling average for Access Void Score
    emp_daily["avs_smoothed"] = emp_daily["access_void_score"].rolling(window=7, min_periods=1).mean()
    
    # Determine peer cohort for comparison
    cohort_id = cohorts_df[cohorts_df["employee_id"] == eid].iloc[0]["cohort_id"]
    cohort_members = cohorts_df[cohorts_df["cohort_id"] == cohort_id]["employee_id"].tolist()
    # Exclude suspicous employees from peer average calculation
    suspicious_ids = ["EMP001", "EMP010", "EMP015", "EMP023"]
    clean_cohort_members = [m for m in cohort_members if m not in suspicious_ids and m != eid]
    if not clean_cohort_members:
        clean_cohort_members = [m for m in cohort_members if m != eid]
        
    # Get average audit counts for the clean peer cohort over time
    peer_daily = merged_daily[merged_daily["employee_id"].isin(clean_cohort_members)]
    peer_audit_avg = peer_daily.groupby("day_index")["Audit Reports"].mean()
    
    # Dynamically determine the primary module (non-oversight module with highest early activity)
    oversight_modules = ["Audit Reports", "Compliance Dashboard", "Override Logs", "Reports"]
    potential_primary = [c for c in emp_daily.columns if c not in oversight_modules and c in [
        "Loan Approval", "Customer Search", "Cash Operations", "Transaction History", "Treasury", "Risk Dashboard", "Account Creation"
    ]]
    
    primary_module = "Customer Search"  # Default fallback
    max_val = -1
    for m in potential_primary:
        avg_val = emp_daily[m].iloc[:20].mean()
        if avg_val > max_val:
            max_val = avg_val
            primary_module = m
            
    # Load daily values
    days = emp_daily["day_index"].values
    primary_counts = emp_daily[primary_module].values
    audit_counts = emp_daily["Audit Reports"].values
    comp_counts = emp_daily["Compliance Dashboard"].values
    override_counts = emp_daily["Override Logs"].values
    void_scores = emp_daily["avs_smoothed"].values
    
    # ── Detect Key Events & Shifts ─────────────────────────────────────────
    # 1. Beginning of Avoidance (Start of Audit Reports decline)
    decline_day = detect_decline_start(emp_daily["Audit Reports"], baseline_days=20, threshold=0.85)
    
    # 2. Audit Reaches Zero
    audit_zero_day = detect_first_zero(emp_daily["Audit Reports"])
    
    # 3. Compliance Reaches Zero
    comp_zero_day = detect_first_zero(emp_daily["Compliance Dashboard"])
    
    # 4. Access Void Score crosses 60 (High Risk Threshold)
    risk_cross_day = detect_risk_threshold_cross(emp_daily["avs_smoothed"], threshold=60)
    
    # Calculate trend arrow
    trend_arrow = get_trend_indicator(emp_daily["avs_smoothed"], window=7)
    
    # ── Event labels for plotting/JSON ─────────────────────────────────────
    events = []
    if decline_day is not None:
        events.append({"day": int(decline_day), "type": "decline_start", "label": "Beginning of Avoidance", "color": "blue"})
    if audit_zero_day is not None:
        events.append({"day": int(audit_zero_day), "type": "audit_zero", "label": "Audit Reports Reached Zero", "color": "red"})
    if comp_zero_day is not None:
        events.append({"day": int(comp_zero_day), "type": "compliance_zero", "label": "Compliance Dashboard Reached Zero", "color": "orange"})
    if risk_cross_day is not None:
        events.append({"day": int(risk_cross_day), "type": "risk_escalation", "label": "Access Void Score Exceeded 60 (High Risk)", "color": "crimson"})
        
    # ────────────────────────────────────────────────────────────────────────
    # 1. GENERATE PLOT (5 aligned subplots)
    # ────────────────────────────────────────────────────────────────────────
    fig, axes = plt.subplots(5, 1, figsize=(11, 14), sharex=True)
    
    # Style configuration
    grid_style = {"linestyle": "--", "alpha": 0.5}
    
    # Plot 1: Primary Activity (e.g. Loan Approvals / Cash Operations)
    axes[0].plot(days, primary_counts, color="#1f77b4", linewidth=2, label=f"Employee ({primary_module})")
    axes[0].set_ylabel("Count", fontsize=9, fontweight="bold")
    axes[0].set_title(f"1. Primary Business Activity: {primary_module} (Stable Pattern)", fontsize=10, fontweight="bold", loc="left")
    axes[0].grid(**grid_style)
    axes[0].legend(loc="upper right", fontsize=8)
    
    # Plot 2: Audit Reports (with peer average)
    axes[1].plot(days, audit_counts, color="#d62728", linewidth=2, label="Employee (Audit Reports)")
    peer_vals = [peer_audit_avg.get(d, 0) for d in days]
    axes[1].plot(days, peer_vals, color="gray", linestyle="--", linewidth=1.5, label="Cohort Peer Average")
    axes[1].set_ylabel("Count", fontsize=9, fontweight="bold")
    axes[1].set_title("2. Audit Reports Access Pattern (Strategic Decline vs. Peers)", fontsize=10, fontweight="bold", loc="left")
    axes[1].grid(**grid_style)
    axes[1].legend(loc="upper right", fontsize=8)
    # Highlight decline start
    if decline_day is not None:
        axes[1].axvline(x=decline_day, color="blue", linestyle=":", alpha=0.8)
        axes[1].annotate("Avoidance Shift", xy=(decline_day, audit_counts[decline_day]), 
                        xytext=(decline_day + 2, audit_counts[decline_day] + max(audit_counts)*0.1),
                        arrowprops=dict(facecolor='blue', shrink=0.05, width=1, headwidth=4),
                        fontsize=8, color="blue", fontweight="bold")
    # Highlight zero point
    if audit_zero_day is not None:
        axes[1].scatter([audit_zero_day], [0], color="red", s=100, zorder=5, label="Reached Zero")
        axes[1].text(audit_zero_day + 1.5, 2, "Reached Zero (Red Dot)", color="red", fontsize=8, fontweight="bold")
        
    # Plot 3: Compliance Dashboard
    axes[2].plot(days, comp_counts, color="#ff7f0e", linewidth=2, label="Employee (Compliance Dashboard)")
    axes[2].set_ylabel("Count", fontsize=9, fontweight="bold")
    axes[2].set_title("3. Compliance Dashboard Access Pattern", fontsize=10, fontweight="bold", loc="left")
    axes[2].grid(**grid_style)
    # Highlight zero point
    if comp_zero_day is not None:
        axes[2].scatter([comp_zero_day], [0], color="orange", s=100, zorder=5, label="Reached Zero")
        axes[2].text(comp_zero_day + 1.5, 2, "Reached Zero (Orange Dot)", color="orange", fontsize=8, fontweight="bold")
        
    # Plot 4: Override Logs
    axes[3].plot(days, override_counts, color="#9467bd", linewidth=2, label="Employee (Override Logs)")
    axes[3].set_ylabel("Count", fontsize=9, fontweight="bold")
    axes[3].set_title("4. Override Logs Access Pattern", fontsize=10, fontweight="bold", loc="left")
    axes[3].grid(**grid_style)
    
    # Plot 5: Access Void Score (0-100, risk background bands)
    axes[4].plot(days, void_scores, color="black", linewidth=2.5, label="Access Void Score (7d Smoothed)")
    axes[4].set_ylabel("Score (0-100)", fontsize=9, fontweight="bold")
    axes[4].set_title(f"5. Calculated Access Void Score (Trend: {trend_arrow})", fontsize=10, fontweight="bold", loc="left")
    axes[4].set_ylim(-5, 105)
    
    # Background Risk Bands (Step 6)
    axes[4].axhspan(0, 20, color="#d4edda", alpha=0.6, label="Normal Risk (0-20)")
    axes[4].axhspan(20, 40, color="#d1ecf1", alpha=0.6, label="Low Risk (20-40)")
    axes[4].axhspan(40, 60, color="#fff3cd", alpha=0.6, label="Medium Risk (40-60)")
    axes[4].axhspan(60, 80, color="#ffeeba", alpha=0.6, label="High Risk (60-80)")
    axes[4].axhspan(80, 100, color="#f8d7da", alpha=0.6, label="Critical Risk (80-100)")
    
    axes[4].grid(**grid_style)
    axes[4].legend(loc="upper left", fontsize=7, ncol=3)
    
    # Draw vertical red line where risk cross threshold (Step 5)
    if risk_cross_day is not None:
        for ax in axes:
            ax.axvline(x=risk_cross_day, color="crimson", linestyle="--", linewidth=1.5, alpha=0.7)
        axes[4].text(risk_cross_day + 1, 75, f"Risk Alert: AVS > 60\n(Day {risk_cross_day})", 
                    color="crimson", fontsize=8, fontweight="bold", bbox=dict(facecolor='white', alpha=0.8, edgecolor='none'))

    plt.xlabel("Day of Simulation (Timeline)", fontsize=10, fontweight="bold")
    fig.suptitle(f"PHANTOM Engine 2: Progressive Behavioral Threat Timeline\nEmployee: {emp_info['name']} ({eid}) | Role: {emp_info['role']} | Branch: {emp_info['branch']}", 
                 fontsize=13, fontweight="bold", y=0.97)
    
    plt.tight_layout(rect=[0, 0, 1, 0.95])
    plot_filepath = TIMELINES_PLOT_DIR / f"{eid}_timeline.png"
    plt.savefig(plot_filepath, dpi=150)
    plt.close()
    
    # ────────────────────────────────────────────────────────────────────────
    # 2. GENERATE JSON FILE (Step 12)
    # ────────────────────────────────────────────────────────────────────────
    timeline_datapoints = []
    for idx, row in emp_daily.iterrows():
        timeline_datapoints.append({
            "day": int(row["day_index"]),
            "date": str(row["date"]),
            "primary_activity": int(row[primary_module]),
            "audit": int(row["Audit Reports"]),
            "compliance": int(row["Compliance Dashboard"]),
            "override": int(row["Override Logs"]),
            "access_void_score": round(float(row["avs_smoothed"]), 1)
        })
        
    json_data = {
        "employee_id": eid,
        "name": str(emp_info["name"]),
        "role": str(emp_info["role"]),
        "branch": str(emp_info["branch"]),
        "peer_cohort_id": str(cohort_id),
        "primary_module_name": primary_module,
        "current_score": float(emp_score_row["access_void_score"]),
        "risk_level": str(emp_score_row["risk"]),
        "trend": trend_arrow,
        "events": events,
        "timeline": timeline_datapoints
    }
    
    json_filepath = TIMELINES_JSON_DIR / f"{eid}.json"
    with open(json_filepath, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
        
    # ────────────────────────────────────────────────────────────────────────
    # 3. GENERATE SUMMARY TEXT FILE (Step 11)
    # ────────────────────────────────────────────────────────────────────────
    # Compute drop percentages
    def get_drop_pct(series, baseline_days=20):
        early = series.iloc[:baseline_days].mean()
        recent = series.iloc[-30:].mean()
        if early < 0.5:
            return 0.0
        return max(0.0, (early - recent) / early * 100.0)
        
    drop_audit = get_drop_pct(emp_daily["Audit Reports"])
    drop_comp = get_drop_pct(emp_daily["Compliance Dashboard"])
    drop_over = get_drop_pct(emp_daily["Override Logs"])
    
    # Verify primary module stability
    primary_early = emp_daily[primary_module].iloc[:20].mean()
    primary_recent = emp_daily[primary_module].iloc[-30:].mean()
    primary_change_pct = ((primary_recent - primary_early) / max(1.0, primary_early)) * 100.0
    primary_status = "Stable" if abs(primary_change_pct) < 15.0 else ("Declining" if primary_change_pct < 0 else "Increasing")
    
    audit_early = emp_daily["Audit Reports"].iloc[:20].mean()
    audit_recent = emp_daily["Audit Reports"].iloc[-30:].mean()
    
    summary_text = f"""Employee
{emp_info['name']} ({eid})

--------------------------------
Details:
Role: {emp_info['role']}
Branch: {emp_info['branch']}
Peer Cohort: {cohort_id}
--------------------------------

Normal Behaviour
Days 1-{int(decline_day) - 1 if decline_day else 90}

--------------------------------
Beginning of Avoidance
Day {int(decline_day) if decline_day else 'N/A (No significant shift)'}

--------------------------------
Audit Reports
↓
Dropped {drop_audit:.1f}% (Baseline avg: {audit_early:.1f}/day -> Recent avg: {audit_recent:.1f}/day)

--------------------------------
Compliance
↓
Dropped {drop_comp:.1f}%

--------------------------------
Override
↓
Dropped {drop_over:.1f}%

--------------------------------
{primary_module} (Primary Business Activity)
↓
{primary_status} ({primary_change_pct:+.1f}% shift)

--------------------------------
Access Void Score
↓
Initial: {round(float(emp_daily['avs_smoothed'].iloc[0]), 1)}
↓
Final: {round(float(emp_daily['avs_smoothed'].iloc[-1]), 1)}

--------------------------------
Risk
{emp_score_row['risk'].upper()} (Trend: {trend_arrow})
"""

    summary_filepath = TIMELINES_SUMM_DIR / f"{eid}.txt"
    with open(summary_filepath, "w", encoding="utf-8") as f:
        f.write(summary_text)


def main():
    print("=" * 60)
    print("ENGINE 2 — Timeline Visualization Generator")
    print("=" * 60)
    
    merged_daily, scores, employees, cohorts = load_data()
    
    # Suspicious employee list
    suspicious_ids = ["EMP001", "EMP010", "EMP015", "EMP023"]
    
    print("Generating timelines for key employees...")
    for eid in suspicious_ids:
        print(f"  Processing {eid}...")
        generate_employee_timeline(eid, merged_daily, scores, employees, cohorts)
        
    print(f"\nAll timelines generated successfully!")
    print(f"  Plots: {TIMELINES_PLOT_DIR}")
    print(f"  JSONs: {TIMELINES_JSON_DIR}")
    print(f"  Summaries: {TIMELINES_SUMM_DIR}")


if __name__ == "__main__":
    main()
