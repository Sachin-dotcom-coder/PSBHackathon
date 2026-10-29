"""
Export all PHANTOM backend API responses to structured JSON for autonomous Vercel hosting.
"""

import sys
import os
import pathlib
import json

BACKEND_DIR = pathlib.Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import config
import services.data_loader as data_loader
from services.fusion import build_employee_detail, build_generic_timeline, compute_dits_score
import routes.stats as stats_route
import routes.employees as emp_route
import routes.engines as engines_route
import routes.graph as graph_route
import routes.reports as reports_route

# Initialize data
print("[PHANTOM Export] Initializing data...")
data_loader.load_all_data()

output_data = {
    "stats": stats_route.get_stats(),
    "leaderboard": emp_route.get_leaderboard(),
    "employees": {},
    "timelines": {},
    "collusions": {},
    "chain_scores": {},
    "avoidance_scores": {},
    "graph_timeline": graph_route.get_timeline_days_graph(days=15),
    "graph_days": {},
    "employee_day_actions": {},
    "reports": {}
}

# 1. Employees & Engines
print("[PHANTOM Export] Exporting 50 employees...")
for p in data_loader.ALL_PREDICTIONS:
    eid = p["employee_id"]
    output_data["employees"][eid] = build_employee_detail(p)
    try:
        output_data["timelines"][eid] = emp_route.get_timeline(eid)
    except Exception as e:
        print(f"Timeline error for {eid}: {e}")
        
    try:
        output_data["collusions"][eid] = engines_route.get_collusion(eid)
    except Exception as e:
        print(f"Collusion error for {eid}: {e}")
        
    try:
        output_data["chain_scores"][eid] = engines_route.get_chain_score(eid)
    except Exception as e:
        print(f"Chain score error for {eid}: {e}")
        
    try:
        output_data["avoidance_scores"][eid] = engines_route.get_avoidance_score(eid)
    except Exception as e:
        print(f"Avoidance error for {eid}: {e}")
        
    try:
        output_data["reports"][eid] = reports_route.get_investigation_report(eid)
    except Exception as e:
        print(f"Report error for {eid}: {e}")

# 2. Graph Days
print("[PHANTOM Export] Exporting graph timeline days...")
nodes = output_data["graph_timeline"].get("nodes", [])
for node in nodes:
    d = node["date"]
    try:
        output_data["graph_days"][d] = graph_route.get_daily_employee_network_graph(d)
    except Exception as e:
        print(f"Graph day error for {d}: {e}")

# 3. Sample Employee Day Actions for top suspects and days
print("[PHANTOM Export] Exporting employee day actions...")
sample_dates = [node["date"] for node in nodes[-5:]] # last 5 days
sample_eids = ["EMP001", "EMP010", "EMP015", "EMP023", "EMP006", "EMP012", "EMP019", "EMP027", "EMP031", "EMP043"]
for d in sample_dates:
    for eid in sample_eids:
        try:
            key = f"{d}_{eid}"
            output_data["employee_day_actions"][key] = graph_route.get_employee_day_actions(date=d, employee_id=eid)
        except Exception:
            pass

# Also do for the latest date for ALL employees active
latest_date = nodes[-1]["date"]
for eid in output_data["employees"].keys():
    key = f"{latest_date}_{eid}"
    if key not in output_data["employee_day_actions"]:
        try:
            output_data["employee_day_actions"][key] = graph_route.get_employee_day_actions(date=latest_date, employee_id=eid)
        except Exception:
            pass

out_dir = pathlib.Path(__file__).parent.parent / "frontend" / "src" / "data"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "phantomStaticData.json"

with open(out_file, "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2)

print(f"[PHANTOM Export] Successfully exported all data to {out_file} (Size: {out_file.stat().st_size / 1024:.1f} KB)")

