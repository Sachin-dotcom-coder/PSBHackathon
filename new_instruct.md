# PHANTOM Engine 4 Dataset Integration Guide
## Adding Justification Notes Without Changing Existing Dataset

**Objective**

Currently Engine 4 returns **0 for every employee** because the dataset contains **no textual justification notes**.

Engine 2 works because it receives numerical behavioural data.

Engine 4 requires **natural language**.

The goal is to integrate realistic justification notes into the dataset **WITHOUT modifying or breaking any existing Engine 2 data or pipeline**.

---

# Current Situation

Current pipeline

```
Employee

↓

Access Logs

↓

Feature Engineering

↓

Isolation Forest

↓

Access Void Score
```

Engine 4

```
Employee

↓

NO TEXT

↓

Language Score = 0
```

Nothing is wrong with Engine 4.

It simply has nothing to analyse.

---

# DO NOT MODIFY

The following files should remain exactly as they are.

```
data/raw/access_logs.csv

data/processed/daily_activity.csv

data/processed/feature_matrix.csv

data/processed/engineered_features.csv

data/raw/employees.csv

data/raw/modules.csv

data/raw/ground_truth.csv
```

These are already being used by Engine 2.

Changing them risks breaking the Isolation Forest.

---

# DO NOT ADD COLUMNS

Do NOT add

```
justification

notes

chat

message
```

inside

```
access_logs.csv
```

or

```
feature_matrix.csv
```

These files should remain purely behavioural.

Engine 2 should never know that text even exists.

---

# Correct Solution

Create a completely independent dataset.

Example

```
data/

    raw/

        justification_notes.csv
```

Engine 2

↓

Uses

```
access_logs.csv
```

Engine 4

↓

Uses

```
justification_notes.csv
```

Later

```
Engine 2

+

Engine 4

↓

DITS
```

This keeps the architecture modular.

---

# New Dataset

Create

```
data/raw/justification_notes.csv
```

---

# Schema

```
note_id

employee_id

timestamp

module

action

justification

language

source

override_type

manager

delay_minutes
```

---

# Example

|note_id|employee_id|timestamp|module|action|justification|language|
|--------|-----------|---------|------|------|-------------|---------|
|N001|EMP001|2026-02-18 10:12|Loan Approval|Override|"Customer emergency, senior approved."|English|
|N002|EMP001|2026-02-23 11:41|Compliance Dashboard|Exception|"Urgent customer request, procedure waived."|English|
|N003|EMP015|2026-02-26 15:18|Audit Reports|Override|"Customer insisted, manager approved."|English|
|N004|EMP010|2026-03-01 09:44|Override Logs|Exception|"System issue, standard checks skipped."|English|

---

# Required Columns

## note_id

Unique identifier.

Example

```
NOTE001
```

---

## employee_id

Must exactly match

```
employees.csv
```

Example

```
EMP001
```

---

## timestamp

When the justification was submitted.

Example

```
2026-03-18 09:31
```

---

## module

Which banking module required the note.

Examples

```
Loan Approval

Audit Reports

Compliance Dashboard

Override Logs
```

---

## action

Examples

```
Override

Approval

Exception

Waiver
```

---

## justification

The natural language text.

Example

```
Customer emergency.

Senior Manager approved.

Procedure waived.
```

---

## language

Examples

```
English

Hindi

Hinglish
```

This allows multilingual testing.

---

## source

Useful for future expansion.

Example

```
Portal

Mobile

Internal Dashboard
```

---

## override_type

Examples

```
Emergency

Compliance Exception

Manual Approval

VIP Override
```

---

## manager

Example

```
Manager001

Director002
```

Optional.

---

## delay_minutes

Difference between

Action Timestamp

↓

Justification Timestamp

Used by contradiction detection.

Example

```
18
```

---

# How Many Notes?

Do NOT create

```
1 note
```

per employee.

Create realistic history.

Recommendation

```
50 Employees

×

12 notes

=

600 notes
```

Exactly matches your Engine 4 evaluation.

---

# Distribution

Normal employees

```
10–15 notes
```

Fraud employees

```
15–25 notes
```

Fraudsters usually perform more overrides.

---

# Languages

Use

```
40%

English

35%

Hinglish

25%

Hindi
```

Example

English

```
Customer requested manual approval.
```

Hindi

```
ग्राहक की आपातकालीन आवश्यकता के कारण स्वीकृति दी गई।
```

Hinglish

```
Customer urgent tha.

Sir approved.

Procedure skip kar diya.
```

---

# Good Notes

Engine 4 should learn

```
Normal

↓

Detailed

↓

Specific

↓

Professional
```

Example

```
Loan approved after KYC verification.

Regional compliance team reviewed all supporting documents.

Customer identity verified successfully.
```

---

# Suspicious Notes

Engine 4 should learn

```
Urgent.

Override.

Approved.

Waived.

Emergency.
```

Examples

```
Customer emergency.

Senior approved.

Procedure waived.
```

---

```
VIP customer.

Skip verification.

Manager approved.
```

---

```
Head office instructed.

Override completed.
```

---

# Behaviour Per Employee

Normal employee

Should have

```
Mostly legitimate notes

Few suspicious words
```

---

Fraud employee

Should gradually change.

Example

Days

1–30

```
Detailed

Professional
```

Days

31–60

```
Shorter

More urgency

Authority references
```

Days

61–90

```
Emergency

Override

Waived

Approved

ASAP
```

Notice

Language changes gradually.

Exactly like Engine 2.

---

# Link With Access Logs

Every justification should correspond to

a privileged action.

Example

```
Access Log

↓

Loan Override

↓

Justification Note
```

Never create notes

without an event.

---

# Engine 4 Pipeline

```
justification_notes.csv

↓

Load Notes

↓

Text Cleaning

↓

Behaviour Detection

↓

Semantic Matching

↓

Template Reuse

↓

Contradiction Detection

↓

Language Score

↓

Save Results
```

---

# Output

Engine 4 should produce

```
language_scores.csv
```

Example

|employee_id|language_score|authority|urgency|policy_bypass|template_reuse|
|-----------|-------------:|---------:|-------:|-------------:|-------------:|
|EMP001|86|92|84|90|81|
|EMP002|12|5|3|4|2|

---

# Merge With Dashboard

Backend

```
Engine 2

↓

Access Void Score

Engine 4

↓

Language Score

↓

DITS
```

Frontend

Instead of

```
Language

0
```

Display

```
Language

86

Authority

92

Urgency

84

Policy Bypass

90

Template Reuse

81
```

---

# DO NOT TOUCH ENGINE 2

This is the most important rule.

Engine 2

↓

Should continue using

```
feature_matrix.csv
```

ONLY.

Engine 4

↓

Should ONLY read

```
justification_notes.csv
```

Neither engine should depend on the other's dataset.

The only place where they meet is after scoring, when the backend combines the Engine 2 Access Void Score and the Engine 4 Language Score into the final DITS calculation.

This preserves the modular architecture of PHANTOM, prevents regressions in the already working Isolation Forest pipeline, and allows both engines to evolve independently in the future.

---

# Final Architecture

```
                    RAW DATA

        access_logs.csv
                │
                ▼
          Feature Engineering
                │
                ▼
          Isolation Forest
                │
                ▼
        Access Void Score
                │
                │
                ├──────────────────────┐
                │                      │
                ▼                      ▼
      justification_notes.csv     Engine 4 NLP
                │                      │
                ▼                      ▼
        Behaviour Detection     Language Score
                │                      │
                └──────────────┬───────┘
                               ▼
                       DITS Calculation
                               ▼
                      PHANTOM Dashboard
```

## Expected Result

After implementing this integration:

- Engine 2 continues to work exactly as before.
- No existing datasets are modified.
- Engine 4 receives realistic multilingual justification notes.
- The Language Score becomes meaningful instead of always being 0.
- The dashboard shows dynamic Engine 4 results for every employee.
- Both engines remain completely independent and communicate only through their final scores, which are fused into the DITS value.