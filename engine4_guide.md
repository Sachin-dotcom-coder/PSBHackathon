# PHANTOM — Engine 4: Justification NLP & Behavioural Risk Scanner Guide

## 📌 Document Overview

This document provides a comprehensive technical manual for **Engine 4 (Justification NLP & Behavioural Risk Scanner)** within the **PHANTOM Insider Threat & Anomaly Detection Platform**. 

Engine 4 is designed to evaluate manager override notes and exception justification texts. It identifies linguistic threat signatures, template reuse, temporal-contextual contradictions, and provides natural language explainability for SOC (Security Operations Center) analysts.

---

## ⚙️ Core Objective & Problem Statement

In core banking and enterprise systems, critical security controls are often bypassed using **manager overrides** or **manual approval exceptions**. While overrides are legitimate tools for resolving operational bottlenecks, rogue or compromised employees frequently exploit them to bypass audit trails and execute unauthorized transactions.

Engine 4 addresses the following core vulnerabilities:
1. **Linguistic Manipulation**: Employees using authority pressure, fake urgency, vague explanations, or social engineering phrasing to justify policy overrides.
2. **Template Copy-Pasting**: Repeatedly using generic, pre-written justification templates to speed up unvetted overrides.
3. **Contextual & Temporal Contradiction**: Claiming an emergency customer transaction (e.g., cash withdrawal) in an override note when the underlying system action was administrative (e.g., running compliance reports), or submitting justification notes long after the transaction was executed.

---

## 🛠️ System Architecture & Design

Engine 4 employs a **Zero-Dependency Hybrid Architecture** that combines transformer-based semantic embeddings with a localized character $N$-gram TF-IDF vectorizer and regex keyword matcher. This ensures 100% operational resiliency in air-gapped or restricted banking networks.

```
                      User / API Justification Note Input
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Engine 4 Analysis Pipeline      │
                     └─────────────────┬─────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
 ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
 │  Category Scorer   │     │   Template Reuse   │     │   Contradiction    │
 │ (Regex + Semantic) │     │      Detector      │     │      Engine        │
 └──────────┬─────────┘     └──────────┬─────────┘     └──────────┬─────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Composite Language Score        │
                     │  + Natural Language Explanation   │
                     └───────────────────────────────────┘
```

---

## 🧩 Behavioural Threat Taxonomy & Dictionaries

Engine 4 categorizes justification text into **6 distinct behavioural risk dimensions**:

| Category | Risk Description | Key English / Hinglish Keywords | Example Seed Phrases |
|---|---|---|---|
| **Authority** | Appeals to high-ranking superiors, verbal orders, or executive status to discourage questioning. | `manager`, `director`, `senior`, `supervisor`, `executive`, `command`, `verbal`, `sir`, `gm`, `vp`, `sahab`, `boss` | *"Senior manager approved"*, *"verbal approval from supervisor"*, *"sir ne bola override"* |
| **Policy Bypass** | Explicit mentions of skipping controls, waiving procedures, or postponing checks. | `bypass`, `override`, `waive`, `skip`, `exception`, `ignore`, `suspend`, `controls`, `checklist`, `chhod`, `baad mein`, `bina` | *"Standard procedure waived"*, *"skip validation exception"*, *"procedure baad mein check"* |
| **Responsibility Shift** | Offloading accountability onto customers, colleagues, or upper management. | `insist`, `request`, `advise`, `discuss`, `order`, `client`, `customer`, `colleague`, `bola`, `kaha`, `kehna` | *"Customer insisted on urgency"*, *"as advised by branch head"*, *"colleague told to override"* |
| **Vagueness** | Oversimplified, generic, or empty phrases lacking concrete business detail. | `handled`, `resolved`, `done`, `complete`, `necessary`, `usual`, `ok`, `process`, `thik`, `hogya`, `chalta` | *"Handled standard override"*, *"resolved necessary exception"*, *"sab thik hai override"* |
| **Urgency** | Artificially creating high-pressure scenarios to force rapid approval without review. | `urgent`, `emergency`, `asap`, `immediate`, `critical`, `deadline`, `time-sensitive`, `fast`, `jaldi`, `hurry` | *"Immediate emergency bypass"*, *"asap processing required"*, *"customer urgent hai"* |
| **Social Engineering** | Referencing VIP status, promoter connections, or confidentiality to bypass verification. | `vip`, `sensitive`, `confidential`, `trust`, `special`, `promoter`, `disclose`, `private`, `jaanta`, `apna` | *"VIP customer transaction skip check"*, *"confidential corporate override"*, *"apna customer skip verification"* |

---

## 🔬 Mathematical & Algorithmic Details

### 1. Hybrid Category Risk Scoring
For each of the 6 categories $c \in \text{CATEGORIES}$, the category risk score $S_c \in [0.0, 1.0]$ is computed by combining **Regex Hit Ratio** and **Semantic Vector Similarity**:

$$S_c = \min\left(1.0, \max\left(0.0, \, 0.60 \cdot S_{\text{semantic}}(c) + 0.40 \cdot R_{\text{regex}}(c)\right)\right)$$

* **Regex Hit Ratio ($R_{\text{regex}}$)**: 
  Matches pre-compiled regex patterns in lowercased text. The ratio is capped at 3 hits for maximum score:
  $$R_{\text{regex}}(c) = \min\left(\frac{\text{Hits}(c)}{3.0}, \, 1.0\right)$$
* **Semantic Similarity ($S_{\text{semantic}}$)**: 
  * *Primary (SentenceTransformers)*: If `sentence-transformers/all-MiniLM-L6-v2` is available, normalized dense vector embeddings $\mathbf{e}_{\text{text}}$ and seed phrase embeddings $\mathbf{E}_{\text{seed}}(c)$ are computed, taking the maximum cosine similarity:
    $$S_{\text{semantic}}(c) = \max_{j} \left( \mathbf{e}_{\text{text}} \cdot \mathbf{E}_{\text{seed}, j}(c) \right)$$
  * *Fallback (Character $N$-gram TF-IDF)*: If offline/unsupported, text is decomposed into character 3-gram to 5-gram frequency counters ($\mathbf{v}_{\text{text}}$) and compared via Cosine Similarity against seed counters:
    $$\text{Sim}(\mathbf{v}_1, \mathbf{v}_2) = \frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{\|\mathbf{v}_1\|_2 \|\mathbf{v}_2\|_2}$$

### 2. Template Reuse Detection
To detect copy-pasted or generic notes, the current justification counter $\mathbf{v}_{\text{text}}$ is compared against the employee's historical notes $\{\mathbf{v}_{\text{hist}, 1}, \mathbf{v}_{\text{hist}, 2}, \dots\}$.
$$\text{MaxSim} = \max_{h} \text{Sim}(\mathbf{v}_{\text{text}}, \mathbf{v}_{\text{hist}, h})$$
If $\text{MaxSim} > 0.80$, the template reuse score $T_{\text{reuse}} \in [0, 100]$ scales linearly:
$$T_{\text{reuse}} = \min\left(100, \, \left\lfloor \frac{\text{MaxSim} - 0.80}{0.20} \times 100 \right\rfloor \right)$$

### 3. Temporal & Contextual Contradiction Engine
Compares justification text semantics against system event metadata:
1. **Module Mismatch**: Flags +50 points if justification claims *"Customer Cash Emergency"* while system telemetry indicates the module was `"Audit Reports"` or `"Compliance Dashboard"`.
2. **Submission Delay**: If timestamps indicate the justification note was submitted $>15$ minutes after action completion, contradiction score scales to 80 points.

### 4. Overall Composite Language Risk Score
The final **`language_score`** (0–100) aggregates category peaks, policy bypass emphasis, template reuse, contradiction penalty, and active category boosts:

$$\text{Base} = 0.50 \cdot \max_{c}(S_c \times 100) + 0.20 \cdot \text{Score}_{\text{PolicyBypass}} + 0.15 \cdot T_{\text{reuse}} + 0.15 \cdot \text{Score}_{\text{Contradiction}}$$

$$\text{Language Score} = \min\left(100, \, \max\left(\max_c(S_c \times 100), \, \lfloor \text{Base} + (\text{Active Categories} \times 5) \rfloor \right)\right)$$

### 5. Confidence Score Calculation
Prevents false alarms on ultra-short notes (e.g., "ok", "done") while rewarding detailed signal presence:
$$\text{Length Penalty} = \max(0, \, 40 - (\text{Word Count} \times 5))$$
$$\text{Confidence} = \min\left(100, \, \max\left(30, \, \lfloor 95 - \text{Length Penalty} + (0.10 \times \max_c(S_c \times 100)) \rfloor \right)\right)$$

---

## 📊 Model Evaluation & Benchmarks

Engine 4 includes an automated evaluation suite (`run_evaluation()`) that generates synthetic ground-truth override notes (300 legitimate vs 300 suspicious banking justifications) to benchmark performance.

### Key Benchmark Metrics

| Metric | Benchmark Score |
|---|---|
| **Evaluation Dataset Size** | 600 Notes (300 Legit / 300 Suspicious) |
| **Accuracy** | **98.33%** |
| **Precision** | **98.01%** |
| **Recall** | **98.67%** |
| **F1-Score** | **0.9834** |

---

## 💻 Codebase Integration & Usage

### 1. Executing Engine 4 CLI
Run Engine 4 directly via command line:
```bash
# Evaluate a single justification note
python engines/engine4/4.py --text "Senior manager approved, skip standard checks for customer"

# Evaluate with employee historical lookup (for template reuse)
python engines/engine4/4.py --text "Urgent cash transfer" --emp EMP001

# Run full evaluation benchmark
python engines/engine4/4.py --evaluate
```

### 2. Backend Integration (`backend/services/data_loader.py` & `backend/b.py`)
Engine 4 exposes `score_justification_text(text)` which returns a structured dictionary:
```json
{
  "language_score": 85,
  "categories": {
    "Authority": 90,
    "Policy Bypass": 85,
    "Responsibility Shift": 40,
    "Vagueness": 20,
    "Urgency": 70,
    "Social Engineering": 10
  },
  "evidence": {
    "Authority": ["manager", "approved"],
    "Policy Bypass": ["skip", "bypass"]
  },
  "template_reuse": 0,
  "contradiction": 0,
  "confidence": 95,
  "explanation": "High risk justification language flagged (Risk Score: 85).\n• Authority indicators detected (90/100)\n• Policy Bypass indicators detected (85/100)"
}
```

---

## 🔗 Related Documentation
- [ML Pipeline Guide (Engine 2)](file:///c:/Users/visha/OneDrive/Desktop/PHANTOM/PSBHackathon/ml_pipeline_guide.md)
- [AI Overview of Employees Work Guide](file:///c:/Users/visha/OneDrive/Desktop/PHANTOM/PSBHackathon/ai_employee_overview_guide.md)
