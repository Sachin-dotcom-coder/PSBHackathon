"""
PHANTOM — Justification Notes Generator
=========================================
Generates data/raw/justification_notes.csv with ~600 realistic multilingual notes
(English, Hinglish, Hindi) linked to employees across a 90-day observation period.
"""

import os
import csv
import random
from datetime import datetime, timedelta

# Ensure output directory exists
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "justification_notes.csv")

random.seed(42)

EMPLOYEES = [f"EMP{i:03d}" for i in range(1, 51)]
SUSPECTS = {"EMP001", "EMP010", "EMP015", "EMP023"}

MODULES = ["Loan Approval", "Audit Reports", "Compliance Dashboard", "Override Logs", "Customer Search", "Cash Operations"]
ACTIONS = ["Override", "Approval", "Exception", "Waiver", "Verification"]
OVERRIDE_TYPES = ["Emergency", "Compliance Exception", "Manual Approval", "VIP Override", "Standard Waiver"]
SOURCES = ["Portal", "Mobile", "Internal Dashboard"]
MANAGERS = [f"Manager{i:03d}" for i in range(1, 10)]

# Legitimate templates (English, Hinglish, Hindi)
LEGIT_TEMPLATES_EN = [
    "Verified customer ID card and signature for loan document.",
    "Transaction processed within standard limits and verified.",
    "Standard operational check completed successfully.",
    "Verified original KYC documents and address proof.",
    "Routine documentation generated and filed with compliance.",
    "Checked account balance before processing transaction.",
    "Customer query resolved via standard service desk procedure.",
    "Updated customer profile with verified Aadhaar proof.",
    "Completed KYC validation for new account opening.",
    "Processed regular utility bill payment after signature check.",
    "Fixed typo in customer name as per signed request form.",
    "Standard cash deposit completed within approved threshold.",
    "Checked credit score for routine loan application.",
    "No deviations found, normal processing completed.",
    "Customer provided valid PAN card and address proof."
]

LEGIT_TEMPLATES_HI = [
    "ग्राहक के पहचान पत्र और हस्ताक्षर का सत्यापन किया गया।",
    "मानक प्रक्रिया के अनुसार लेनदेन की पुष्टि की गई।",
    "सभी आवश्यक दस्तावेज नियमानुसार चेक कर लिए गए हैं।",
    "खाता खोलने हेतु केवाईसी सत्यापन सफलतापूर्वक पूरा हुआ।",
    "ग्राहक के अनुरोध पर प्रोफाइल विवरण अपडेट किया गया।"
]

LEGIT_TEMPLATES_HINGLISH = [
    "Customer Signature check karke complete kiya.",
    "Standard process follow kiya and limits verify kiye.",
    "KYC document check kar ke system main update kar diya.",
    "Account verification complete ho gaya hai.",
    "Branch regular audit record update kiya."
]

# Suspicious threat templates (English, Hinglish, Hindi)
THREAT_TEMPLATES_EN = [
    "Manager approved override, skip standard checks for client.",
    "Verbal approval from supervisor to bypass limit.",
    "Bypassed standard procedure for urgent client requirement.",
    "Urgent request from branch manager to waive verification.",
    "Standard procedure waived due to client emergency.",
    "Sir approved this bypass, do not delay transaction.",
    "Emergency cash withdrawal requested, bypass validation.",
    "VIP customer transaction, skip KYC check.",
    "Confidential trade, override applied by VP instruction.",
    "Customer insisted on urgency, controls suspended.",
    "As advised by regional head, skip checking.",
    "Told by supervisor to ignore warning and complete transaction.",
    "Handled necessary exception, done as verbal order.",
    "Quick transfer required, ignore checklist.",
    "Special promoter profile, skip documentation.",
    "Immediate bypass of limits instructed by regional office."
]

THREAT_TEMPLATES_HI = [
    "प्रबंधक के मौखिक आदेश पर प्रक्रिया को छोड़ दिया गया।",
    "ग्राहक की तत्काल आवश्यकता के कारण मानक जांच छोड़ दी गई।",
    "उच्च अधिकारी के निर्देशानुसार बाईपास स्वीकृत किया गया।",
    "आपातकालीन मामले के कारण सत्यापन को स्थगित किया गया।"
]

THREAT_TEMPLATES_HINGLISH = [
    "Procedure baad mein check, client urgent hai.",
    "Sir ne ne bola override applied, ignore checklist.",
    "Boss order to skip verification, client ne bola jaldi hai.",
    "Sir ne kaha bypass kar do, emergency case hai.",
    "Manager sahab approved, bina check approved.",
    "Client ne bola jaldi hai, sab thik hai override.",
    "Resolution baad mein hoga, hogya routine bypass.",
    "Apna customer skip verification, promoter friend bypass."
]

START_DATE = datetime(2026, 1, 1, 9, 0)

rows = []
note_counter = 1

for eid in EMPLOYEES:
    is_suspect = eid in SUSPECTS
    count = random.randint(18, 25) if is_suspect else random.randint(10, 14)
    
    for j in range(count):
        # Evenly spread over 90 days
        day_offset = int((j / count) * 90) + random.randint(0, 1)
        day_offset = min(89, day_offset)
        
        note_time = START_DATE + timedelta(days=day_offset, hours=random.randint(0, 8), minutes=random.randint(0, 59))
        time_str = note_time.strftime("%Y-%m-%d %H:%M")
        
        # Threat level decision based on time and suspect status
        if is_suspect and day_offset >= 30:
            is_threat = random.random() < (0.6 if day_offset < 60 else 0.85)
        else:
            is_threat = random.random() < 0.05
            
        lang_choice = random.choices(["English", "Hinglish", "Hindi"], weights=[0.45, 0.35, 0.20])[0]
        
        if is_threat:
            if lang_choice == "Hindi":
                text = random.choice(THREAT_TEMPLATES_HI)
            elif lang_choice == "Hinglish":
                text = random.choice(THREAT_TEMPLATES_HINGLISH)
            else:
                text = random.choice(THREAT_TEMPLATES_EN)
        else:
            if lang_choice == "Hindi":
                text = random.choice(LEGIT_TEMPLATES_HI)
            elif lang_choice == "Hinglish":
                text = random.choice(LEGIT_TEMPLATES_HINGLISH)
            else:
                text = random.choice(LEGIT_TEMPLATES_EN)

        note_id = f"NOTE{note_counter:04d}"
        note_counter += 1
        
        rows.append({
            "note_id": note_id,
            "employee_id": eid,
            "timestamp": time_str,
            "module": random.choice(MODULES),
            "action": random.choice(ACTIONS),
            "justification": text,
            "language": lang_choice,
            "source": random.choice(SOURCES),
            "override_type": random.choice(OVERRIDE_TYPES),
            "manager": random.choice(MANAGERS),
            "delay_minutes": random.randint(2, 45) if is_threat else random.randint(0, 10),
        })

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
fieldnames = ["note_id", "employee_id", "timestamp", "module", "action", "justification", "language", "source", "override_type", "manager", "delay_minutes"]

with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Generated {len(rows)} justification notes at {OUTPUT_PATH}")
