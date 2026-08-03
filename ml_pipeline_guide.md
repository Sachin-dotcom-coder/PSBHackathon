# PHANTOM — Engine 2: Machine Learning Pipeline Guide (Vishal's Part)

## 📌 Document Overview
This document serves as the complete technical manual for the Machine Learning and Visualization pipeline of **Engine 2 (Negative Access Profiler)**, designed and implemented by Vishal. 

It covers data preprocessing, the Isolation Forest model architecture, score normalization, the natural language explainability layer, model evaluation, and the progressive timeline visualization system.

---

## ⚙️ Model Objective: Detecting Strategic System Avoidance
The primary objective of Engine 2 is **not** to detect fraud directly. Instead, it flags employees whose access behavior deviates significantly from their peer cohort due to **negative access patterns**—specifically, the deliberate avoidance of audit trails, override logging, and compliance dashboards. 

---

## 🛠️ Pipeline Architecture
The pipeline is designed as an end-to-end reasoning engine:

```
feature_matrix.csv (37 Features)
        │
        ▼
Data Ingestion & Validation (preprocess.py)
        │
        ▼
Isolation Forest Training (isolation_forest.py)
        │
        ▼
Raw Anomaly Scoring (decision_function)
        │
        ▼
Access Void Score Normalization (access_void_score.py)
        │
        ▼
Explainability Layer (explainability.py)
        │
        ▼
Progressive Timeline Plotting & JSON Generation (timeline.py)
        │
        ▼
Demonstration and Delivery (demo.py / 2.py)
```

---

## 🧩 Step-by-Step Module Walkthrough

### 1. Ingestion & Preprocessing (`preprocessing/preprocess.py`)
Isolation Forest requires clean, numerical data. The preprocessor performs the following tasks:
*   **Column Selection**: Separates identifiers (`employee_id`, `date`) from the 37 engineered numerical features.
*   **NaN / Inf Check**: Scans the dataset for missing or infinite values, filling NaN values with `0` and replacing infinite values with standard baseline numbers.
*   **Constraint Checking**: Clips impossible negative counts (e.g., negative audit report exports) to `0`.
*   **Duplicate Elimination**: Logs duplicate rows to monitor telemetry collection stability.

### 2. Model Wrapper & Training (`model/isolation_forest.py`)
We wrap scikit-learn's `IsolationForest` to implement standard model configurations:
*   **Hyperparameter Settings (`model/config.yaml`)**:
    *   `n_estimators: 300`: Builds 300 isolation trees to ensure smooth, stable anomaly scores.
    *   `contamination: 0.08`: Establishes the expected anomaly rate (8% = 4/50 employees).
    *   `random_state: 42`: Fixed seed to guarantee identical outputs across executions.
    *   `max_samples: auto`: Selects optimal subsets for each tree to prevent overfitting.
*   **How it Works Unsupervised**:
    *   The model fits on all 4,500 employee-days without knowing who is suspicious.
    *   Every tree makes random feature splits (e.g., `Audit Reports < 12`).
    *   Because anomalous records have highly constrained, empty access profiles in critical areas, they get isolated quickly (closer to the root of the tree, resulting in a shorter **Average Path Length**). Normal records require many more splits.

### 3. Normalization & Risk Scoring (`scoring/access_void_score.py`)
The raw outputs of Isolation Forest (`decision_function()`) are mathematically dense (ranges like `[-0.8, 0.1]`) and not user-friendly.
*   The raw scores are inverted (making anomalies positive, high numbers) and normalized using a Min-Max scaler to a clean **`0–100` Access Void Score (AVS)**.
*   Scores map to categorical Risk Levels:
    *   `0–20`: **Normal**
    *   `21–40`: **Low**
    *   `41–60`: **Medium**
    *   `61–80`: **High**
    *   `81–100`: **Critical**

### 4. Explainability Layer (`scoring/explainability.py`)
Since Isolation Forest is a black-box model, this layer generates natural language reasoning:
*   **Baseline Contrast**: Compares the employee's average activity in the first 20 days (baseline) against the last 30 days (recent activity).
*   **Feature Triggers**:
    *   *System gaps*: Computes the exact number of days since the employee last touched Audit, Compliance, or Override logs.
    *   *Percentage drop*: Computes the percentage decline of these oversight modules.
    *   *Peer deviation*: Measures how many standard deviations ($Z$-score) the employee sits below their cohort peer average.
    *   *Selective avoidance*: Confirms if core job volume (e.g., Loan Approvals) remains high while compliance tasks drop to near zero.

### 5. Evaluation and Validation (`model/evaluate.py`)
To test model accuracy, we evaluate predictions (AVS $\ge 60.0$) against the locked `ground_truth.csv`:
*   **Classification Metrics**:
    *   *Precision*: `0.6667`
    *   *Recall*: `0.5000`
    *   *F1-Score*: `0.5714`
    *   *ROC-AUC*: `0.7446`
*   **Confusion Matrix**: Shows a clean separation, identifying the targeted anomalies with low false positives.

### 6. Timeline Visualization Module (`visualization/timeline.py`)
This module creates visual evidence of progressive risk over time for SOC analysts and judges, answering four core questions at once:
1.  *Is the employee still doing normal work?*
2.  *Are oversight modules disappearing?*
3.  *Is the Access Void Score increasing?*
4.  *When did the employee become suspicious?*

#### 📈 Plot Features (5 Aligned Subplots)
*   **Plot 1**: Primary Business Module Count (shows steady work).
*   **Plot 2**: Audit Reports vs. Cohort Peer Average (dashed gray line) to highlight specific divergence.
*   **Plot 3**: Compliance Dashboard counts.
*   **Plot 4**: Override Logs counts.
*   **Plot 5**: 7-day rolling average of the Access Void Score.

#### 📍 Automatic Annotations & Event Highlight Features
*   **Avoidance Shift**: Detects the first major decline in audit count relative to the baseline and marks it as a blue dotted line labeled **Beginning of Avoidance**.
*   **Red & Orange Dots**: Automatically draws colored scatter points on the exact days Audit or Compliance counts hit zero.
*   **Vertical Red Line**: Draws an aligned red vertical line through all subplots on the exact day the smoothed Access Void Score crosses 60.
*   **Background Color Bands**: Shades the Access Void Score subplot with risk-level colors (Green, Yellow, Orange, Red).

#### 🗄️ Generated Outputs
*   **Timeline Plots**: Saved under `outputs/plots/employee_timelines/` (e.g., `EMP001_timeline.png`).
*   **Standardized JSONs**: Saved under `outputs/timeline_json/` (e.g., `EMP001.json`). Contains clean day-by-day counts and lists of flagged events for frontend rendering.
*   **Text Summaries**: Saved under `outputs/timeline_summary/` (e.g., `EMP001.txt`) containing the generated behavioral transition narrative.

---

## 🚀 Pipeline Integration & Execution (`2.py` / `demo.py`)
*   **`2.py`**: Runs the entire sequence: trains the model on raw features, exports daily scores, runs the evaluation script to output metrics and plots, generates the employee timeline artifacts, and runs the CLI demo.
*   **`demo.py`**: Command-line interface to inspect any employee profile.
    ```bash
    python demo.py --employee_id EMP001
    ```
