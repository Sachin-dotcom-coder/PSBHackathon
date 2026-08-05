# Engine 4 Improvement Roadmap

# Goal

Transform Engine 4 from a simple phrase-matching system into an enterprise-grade behavioural language analysis engine suitable for banking insider-threat detection.

---

# Phase 1 — Improve Language Understanding

## Current

```
Sentence

↓

Compare with

10 phrases

↓

Similarity Score
```

## Improve

Instead of matching phrases,

identify behavioural characteristics.

Detect

- Authority Injection
- Policy Bypass
- Urgency
- Vagueness
- Responsibility Shift
- Social Engineering

Output

```
Authority Injection

92

Urgency

87

Policy Bypass

95

Responsibility Shift

78

Vagueness

81
```

---

# Phase 2 — Expand the Risk Dictionary

Current dictionary

```
Urgent

Emergency

Bypass

Override
```

Create category-specific dictionaries.

## Authority

```
Manager approved

Director approved

Regional office

Senior approval

Management instructed
```

---

## Policy Bypass

```
Override

Waived

Skip

Exception

Controls suspended

Ignore procedure
```

---

## Responsibility Shift

```
Customer insisted

Manager requested

Head office instructed

As advised

As discussed
```

---

## Vagueness

```
Handled

Resolved

Required

Necessary

As usual

As per protocol
```

---

## Urgency

```
Critical

Emergency

ASAP

Immediate

Priority

Time-sensitive
```

---

# Phase 3 — Template Reuse Detection

One of the strongest insider-threat indicators.

Store every employee's previous justifications.

```
EMP001

↓

Previous Notes

↓

Embeddings

↓

Similarity Comparison
```

If today's justification is extremely similar to previous ones,

increase Template Reuse Score.

Example

```
Customer emergency

↓

Customer emergency

↓

Customer emergency

↓

Customer emergency
```

Similarity

98%

↓

Template Reuse

High

---

# Phase 4 — Employee Behaviour Modeling

Instead of analysing notes independently,

analyse them in context.

Example

```
Past Notes

↓

Normal

↓

Today's Note

↓

Completely Different
```

Large linguistic shifts become additional features.

---

# Phase 5 — Cross-Engine Fusion

Fuse Engine 4 with Engine 2.

Example

```
Access Void

90

Language Score

88

↓

Very High Risk
```

Another employee

```
Access Void

15

Language Score

90
```

Probably poor writing rather than fraud.

The combination provides stronger evidence.

---

# Phase 6 — IndicBERT

Replace

```
all-MiniLM-L6-v2
```

with

```
IndicBERT
```

Advantages

- Hindi support
- Hinglish support
- Better Indian banking language
- Matches original project proposal

Example

```
Customer urgent hai.

Sir approved.

Procedure baad mein.
```

IndicBERT handles this significantly better.

---

# Phase 7 — Contradiction Detection

Compare the language with actual system events.

Example

Justification

```
Emergency
```

Timeline

```
Action completed

↓

Justification entered

20 minutes later
```

Suspicious.

Another example

```
Reason

Customer Emergency

↓

Transaction

Internal Transfer
```

Reason and behaviour do not match.

---

# Phase 8 — LLM Reasoning Layer

Instead of only producing numbers,

generate explanations.

Example

```
High Risk

Reason

• Authority repeatedly invoked

• Policy bypass requested

• Urgency emphasized

• No concrete business justification
```

This greatly improves analyst trust.

---

# Phase 9 — Confidence Score

Current

```
Language Score

89
```

Improve

```
Language Score

89

Confidence

94%
```

Allows analysts to judge prediction reliability.

---

# Phase 10 — Better Explainability

Current

```
Language Score

91
```

Improve

```
Authority

91

↓

"Senior Approved"

Urgency

86

↓

"Emergency"

Policy Bypass

95

↓

"Procedure Waived"

Template Reuse

82

↓

Matched 8 previous notes
```

Every score should be traceable to evidence.

---

# Phase 11 — Expand Dataset

Instead of

```
10

Suspicious Notes
```

Create

- 300 Legitimate Notes
- 300 Suspicious Notes
- English
- Hindi
- Hinglish

Examples

Loan overrides

Compliance exceptions

Cash operations

Audit justifications

System failures

Customer escalations

---

# Phase 12 — Dashboard Improvements

Instead of displaying

```
Language Score

91
```

Display

```
Language Score

91

Authority

██████████

Urgency

████████

Policy Bypass

██████████

Template Reuse

███████

Confidence

94%
```

This provides much better visual explainability.

---

# Final Architecture

```
Justification Note
        │
        ▼
IndicBERT Embedding
        │
        ▼
Authority Detector
        │
        ▼
Urgency Detector
        │
        ▼
Policy Bypass Detector
        │
        ▼
Responsibility Shift Detector
        │
        ▼
Template Reuse Detector
        │
        ▼
Contradiction Detection
        │
        ▼
Language Risk Score
        │
        ▼
Explanation Generator
        │
        ▼
Engine 2 Fusion
        │
        ▼
DITS
```

---

# Expected Benefits

- Much stronger language understanding
- Better support for Indian banking terminology
- Higher explainability for SOC analysts
- Reduced false positives
- Better integration with Engine 2
- More realistic enterprise architecture
- Significantly stronger hackathon presentation and judge appeal