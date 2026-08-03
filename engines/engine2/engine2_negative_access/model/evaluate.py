"""
evaluate.py — Step 12 & 13 of new_instruct.md

Evaluates the Negative Access Profiler (Isolation Forest) model:
  1. Loads model predictions (scores.csv) and ground truth (ground_truth.csv).
  2. Compares prediction (by thresholding Access Void Score) against ground truth.
  3. Calculates: Precision, Recall, F1, ROC-AUC, Confusion Matrix.
  4. Generates the 4 requested visualizations:
     - Histogram of Access Void Scores (daily distribution)
     - Scatter Plot: Audit Count vs Anomaly Score
     - Time Series: Rajesh Kumar (EMP001) Access Void Score (Day 1 -> 90)
     - Feature Distribution: Audit Count (Normal vs Suspicious)
  5. Saves the plots to outputs/plots/
"""
import sys
import pathlib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

# Ensure parent directory is in path for imports
_ENGINE = pathlib.Path(__file__).resolve().parents[1]
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import PREDICTIONS_DIR, GROUND_TRUTH, PLOTS_DIR, DAILY_ACTIVITY, ENG_FEATURES


def evaluate_model():
    print("=" * 60)
    print("ENGINE 2 — Negative Access Profiler — Evaluation")
    print("=" * 60)

    # ── Load Predictions and Ground Truth ───────────────────────────────
    scores_path = PREDICTIONS_DIR / "scores.csv"
    if not scores_path.exists():
        print(f"[Error] Predictions file not found at {scores_path}. Run train.py first.")
        sys.exit(1)

    scores_df = pd.read_csv(scores_path)
    gt_df = pd.read_csv(GROUND_TRUTH)

    # Merge on employee_id
    eval_df = scores_df.merge(gt_df[["employee_id", "fraud_label"]], on="employee_id", how="inner")

    print(f"Loaded {len(eval_df)} employees for evaluation.")

    # ── Calculate Metrics ────────────────────────────────────────────────
    # We will classify an employee as suspicious if their Access Void Score >= 60.0 (High/Critical risk)
    threshold = 60.0
    eval_df["predicted_label"] = (eval_df["access_void_score"] >= threshold).astype(int)

    y_true = eval_df["fraud_label"].values
    y_pred = eval_df["predicted_label"].values
    y_prob = eval_df["access_void_score"].values / 100.0  # normalize score to [0,1] for ROC-AUC

    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    roc_auc = roc_auc_score(y_true, y_prob)
    cm = confusion_matrix(y_true, y_pred)

    print("\n--- Classification Metrics ---")
    print(f"Threshold: Access Void Score >= {threshold}")
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")
    print(f"F1-Score  : {f1:.4f}")
    print(f"ROC-AUC   : {roc_auc:.4f}")
    print("\nConfusion Matrix:")
    print(f"   Predicted Normal   Predicted Suspicious")
    print(f"Actual Normal        {cm[0][0]:<18} {cm[0][1]}")
    print(f"Actual Suspicious    {cm[1][0]:<18} {cm[1][1]}")
    print("------------------------------\n")

    # ── Step 13: Generate Visualizations ───────────────────────────────
    print("Generating plots...")

    # Load daily data for visualization
    daily_scores_path = PREDICTIONS_DIR / "daily_scores.csv"
    daily_scores = pd.read_csv(daily_scores_path)
    
    # Load engineered features for plots that need raw features
    eng_feat = pd.read_csv(ENG_FEATURES)

    # Merge daily_scores with eng_feat to get day_index
    daily_scores = daily_scores.merge(eng_feat[["employee_id", "date", "day_index"]], on=["employee_id", "date"], how="inner")

    # 1. Histogram of Access Void Scores (daily distribution)
    plt.figure(figsize=(8, 5))
    plt.hist(daily_scores["access_void_score"], bins=30, color="teal", edgecolor="black", alpha=0.7)
    plt.title("Distribution of Daily Access Void Scores", fontsize=12, fontweight='bold')
    plt.xlabel("Access Void Score (0-100)", fontsize=10)
    plt.ylabel("Frequency (Employee-Days)", fontsize=10)
    plt.grid(axis="y", linestyle="--", alpha=0.7)
    plt.tight_layout()
    hist_path = PLOTS_DIR / "access_void_distribution.png"
    plt.savefig(hist_path, dpi=150)
    plt.close()
    print(f"  Saved: {hist_path}")

    # 2. Scatter Plot: Audit Count vs Anomaly Score (using daily activity/scores)
    merged_daily = daily_scores.merge(
        eng_feat[["employee_id", "date", "audit_access_count"]], 
        on=["employee_id", "date"], 
        how="inner"
    )
    
    plt.figure(figsize=(8, 5))
    plt.scatter(
        merged_daily["audit_access_count"], 
        merged_daily["raw_score"], 
        alpha=0.4, 
        c=merged_daily["access_void_score"], 
        cmap="viridis",
        edgecolors="none"
    )
    cbar = plt.colorbar()
    cbar.set_label("Access Void Score")
    plt.title("Audit Access Count vs. Raw Anomaly Score", fontsize=12, fontweight='bold')
    plt.xlabel("Daily Audit Reports Access Count", fontsize=10)
    plt.ylabel("Raw Anomaly Score (decision_function)", fontsize=10)
    plt.grid(linestyle="--", alpha=0.5)
    plt.tight_layout()
    scatter_path = PLOTS_DIR / "audit_vs_anomaly_score.png"
    plt.savefig(scatter_path, dpi=150)
    plt.close()
    print(f"  Saved: {scatter_path}")

    # 3. Time Series: Rajesh Kumar (EMP001) Access Void Score (Day 1 -> 90)
    rajesh_daily = daily_scores[daily_scores["employee_id"] == "EMP001"].sort_values("day_index")
    
    plt.figure(figsize=(10, 5))
    plt.plot(rajesh_daily["day_index"], rajesh_daily["access_void_score"], color="crimson", linewidth=2.5, label="EMP001 (Rajesh Kumar)")
    plt.axvline(x=20, color="gray", linestyle="--", alpha=0.8, label="Fade Start (Day 20)")
    plt.axvline(x=60, color="black", linestyle="--", alpha=0.8, label="Fade End (Day 60)")
    plt.title("EMP001 (Rajesh Kumar) - Access Void Score Timeline", fontsize=12, fontweight='bold')
    plt.xlabel("Day Index", fontsize=10)
    plt.ylabel("Access Void Score (0-100)", fontsize=10)
    plt.ylim(-5, 105)
    plt.legend(loc="upper left")
    plt.grid(linestyle="--", alpha=0.5)
    plt.tight_layout()
    ts_path = PLOTS_DIR / "suspect_timeline_emp001.png"
    plt.savefig(ts_path, dpi=150)
    plt.close()
    print(f"  Saved: {ts_path}")

    # 4. Feature Distribution: Audit Count (Normal vs Suspicious)
    merged_daily_gt = merged_daily.merge(gt_df[["employee_id", "fraud_label"]], on="employee_id", how="inner")
    
    normal_audits = merged_daily_gt[merged_daily_gt["fraud_label"] == 0]["audit_access_count"]
    suspicious_audits = merged_daily_gt[merged_daily_gt["fraud_label"] == 1]["audit_access_count"]

    plt.figure(figsize=(8, 5))
    plt.boxplot([normal_audits, suspicious_audits], labels=["Normal Employees", "Suspicious Employees (Fraud)"])
    plt.title("Daily Audit Access Distribution: Normal vs. Suspicious", fontsize=12, fontweight='bold')
    plt.ylabel("Audit Reports Access Count", fontsize=10)
    plt.grid(axis="y", linestyle="--", alpha=0.5)
    plt.tight_layout()
    box_path = PLOTS_DIR / "audit_distribution_comparison.png"
    plt.savefig(box_path, dpi=150)
    plt.close()
    print(f"  Saved: {box_path}")

    print("\nEvaluation and visualization generation complete. Plots saved to outputs/plots/")
    return eval_df


if __name__ == "__main__":
    evaluate_model()
