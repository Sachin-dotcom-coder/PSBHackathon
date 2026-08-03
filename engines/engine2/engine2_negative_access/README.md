# PHANTOM — Engine 2: Negative Access Profiler

Engine 2 is a machine learning-driven anomaly detection pipeline designed to detect **negative access patterns**—specifically, employees who selectively avoid critical oversight systems (e.g., Audit Reports, Compliance Dashboards, and Override Logs) while maintaining normal high-volume activity in their primary job functions.

This represents a realistic insider threat scenario ("Access Void") rather than simple high-volume fraud.

---

## 🚀 System Design & Pipeline

Don't present this as just an Isolation Forest algorithm. The system is designed as a complete end-to-end reasoning pipeline:

```
Employee Banking Activity (Daily Logs)
        │
        ▼
Role-Aware Feature Engineering (37 behavioral & temporal features)
        │
        ▼
Peer Cohort Comparison (Z-score & percentiles relative to role + branch + exp)
        │
        ▼
Isolation Forest learns normal behavior (unsupervised, 300 trees)
        │
        ▼
Raw Anomaly Score (decision_function)
        │
        ▼
Business Rule Normalization
        │
        ▼
Access Void Score (0–100 scaled anomaly score)
        │
        ▼
Human-Readable Explanation (rule-based NLP layer)
        │
        ▼
Dashboard & DITS Fusion
```

---

## 📁 Directory Structure

```
engine2_negative_access/
│
├── preprocessing/
│   └── preprocess.py          # Data validation (NaN/Inf, negative counts)
│
├── model/
│   ├── train.py               # Complete training & aggregation pipeline
│   ├── predict.py             # Live/cached prediction for individual employees
│   ├── evaluate.py            # Evaluation against ground truth + plots
│   ├── isolation_forest.py    # Custom Isolation Forest wrapper class
│   └── config.yaml            # Hyperparameters (contamination, estimators)
│
├── scoring/
│   ├── access_void_score.py   # Raw score mapping to 0-100 & risk categories
│   └── explainability.py      # Generates human-readable deviation narratives
│
├── outputs/
│   ├── models/                # joblib serialized models (.pkl)
│   ├── predictions/           # daily and employee-aggregated scores (.csv, .json)
│   └── plots/                 # Histograms, scatter plots, time-series, boxplots
│
├── demo.py                    # Formatted profiling printout for any employee
├── requirements.txt           # Package dependencies
└── README.md                  # System documentation
```

---

## 🛠️ Usage Instructions

### 1. Installation
Install the necessary package dependencies:
```bash
pip install -r requirements.txt
```

### 2. Training the Model
To run the full training pipeline, fit the Isolation Forest on the 4,500 daily activity records, and generate/save prediction scores and explanations:
```bash
python model/train.py
```

### 3. Model Evaluation & Visualizations
To evaluate model predictions against the `ground_truth.csv` and generate evaluation metrics (Precision, Recall, F1, ROC-AUC, Confusion Matrix) and diagnostic plots:
```bash
python model/evaluate.py
```
This script saves four plots to `outputs/plots/`:
* `access_void_distribution.png` (Histogram of Access Void Scores)
* `audit_vs_anomaly_score.png` (Scatter Plot: Audit Count vs Anomaly Score)
* `suspect_timeline_emp001.png` (Time series showing EMP001's gradual decay into high risk)
* `audit_distribution_comparison.png` (Boxplot comparing normal vs suspicious daily audits)

### 4. Running the Demo Script
To check a specific employee's behavioral profile, risk score, and natural language reasons, run the demo script:
```bash
python demo.py --employee_id EMP001
```

---

## 🛡️ How to Impress the Judges

If a judge asks:
> *"Why did your model flag EMP001 (Rajesh Kumar) as highly suspicious?"*

**Do NOT answer:**
> *"Because the Isolation Forest algorithm output an anomaly score of -0.82."*

**Answer with the pipeline's narrative:**
> *"Rajesh is a Branch Manager. Over the past 90 days, his core Retail Banking activity (customer searches, account creations) remained normal and consistent. However, his Audit Reports access dropped by 100% (from 18/day down to 0/day) and has been completely absent for 31 consecutive days. When compared to his peer cohort of Branch Managers in Tier-2 Gujarat branches, his oversight activity is 2.8 standard deviations below normal. The system mapped this selective avoidance signature to a Critical risk level with an Access Void Score of 92."*
