"""
demo.py — Step 16 of new_instruct.md

Runs live prediction / profile extraction for a suspect (default EMP001)
and displays a beautiful, formatted output as requested.
"""
import sys
import argparse
import pathlib
import pandas as pd

# Ensure parent directory is in path for imports
_ENGINE = pathlib.Path(__file__).resolve().parent
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from paths import EMPLOYEES_CSV, FEATURE_MATRIX, DAILY_ACTIVITY
from model.predict import predict_employee


def run_demo(employee_id="EMP001"):
    try:
        # Load live prediction info
        res = predict_employee(employee_id)
    except Exception as e:
        print(f"[Error] Could not predict for {employee_id}: {e}")
        return

    # Load daily activity to get their final day access counts
    # (Or recent average. Let's get the final day counts to show realistic current telemetry)
    audit_access = 0
    compliance_access = 0
    override_access = 0
    peer_cohort = "N/A"

    try:
        activity = pd.read_csv(DAILY_ACTIVITY)
        emp_act = activity[activity["employee_id"] == employee_id].sort_values("day_index")
        if not emp_act.empty:
            last_row = emp_act.iloc[-1]
            audit_access = int(last_row.get("Audit Reports", 0))
            compliance_access = int(last_row.get("Compliance Dashboard", 0))
            override_access = int(last_row.get("Override Logs", 0))
    except Exception:
        pass

    try:
        # Load peer cohort ID/details from engineered_features or peer_cohorts
        from paths import PROJECT_ROOT
        cohorts = pd.read_csv(PROJECT_ROOT / "data" / "processed" / "peer_cohorts.csv")
        emp_coh = cohorts[cohorts["employee_id"] == employee_id]
        if not emp_coh.empty:
            peer_cohort = f"{emp_coh.iloc[0]['role']}s ({emp_coh.iloc[0]['branch']}, {emp_coh.iloc[0]['experience_bucket']})"
    except Exception:
        pass

    # Print the formatted output exactly as requested (Step 16)
    print("------------------------------------------------")
    print()
    print("Employee")
    print(res["name"])
    print()
    print("Role")
    print(res["role"])
    print()
    print("Branch")
    print(res["branch"])
    print()
    print("Peer Cohort")
    print(peer_cohort)
    print()
    print("Audit Access")
    print(audit_access)
    print()
    print("Compliance Access")
    print(compliance_access)
    print()
    print("Override Access")
    print(override_access)
    print()
    print("Raw Isolation Score")
    print(f"{res['raw_anomaly_score']:.2f}")
    print()
    print("Access Void Score")
    print(int(res["access_void_score"]))
    print()
    print("Risk")
    print(res["risk"].upper())
    print()
    print("Reasons")
    for r in res["reasons"]:
        print(f"* {r}")
    print()
    print("------------------------------------------------")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PHANTOM Engine 2 Demo Script")
    parser.add_argument(
        "--employee_id", 
        type=str, 
        default="EMP001", 
        help="Employee ID to run demo for (default: EMP001)"
    )
    args = parser.parse_args()
    run_demo(args.employee_id)
