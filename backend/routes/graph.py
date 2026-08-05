"""
PHANTOM Interactive Graph Router
================================
Provides 3-level graph drill-down APIs for the frontend:
  Level 1: Timeline Days Graph (GET /api/graph/timeline)
  Level 2: Daily Co-Access Employee Network Graph (GET /api/graph/day/{date_str})
  Level 3: Employee Single-Day Action Chain (GET /api/graph/employee-day-actions)
"""

import pandas as pd
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query

import config
from engines_loader import engine1
import services.data_loader as data_loader

router = APIRouter(prefix="/api/graph", tags=["Interactive Graph"])


# ---------------------------------------------------------------------------
# Level 1: Timeline Days Node Graph
# ---------------------------------------------------------------------------
@router.get("/timeline")
def get_timeline_days_graph(
    end_date: Optional[str] = None,
    days: int = Query(default=15, ge=1, le=90),
):
    """
    Level 1 Graph API: Returns a graph/list of the last N days (default 15 days).
    Each day node contains summary activity metrics and threat indicators.
    """
    if not config.DAILY_ACTIVITY_CSV.exists():
        raise HTTPException(status_code=404, detail="daily_activity.csv dataset not found")

    try:
        df = pd.read_csv(config.DAILY_ACTIVITY_CSV)
        unique_dates = sorted(df["date"].unique())

        if not unique_dates:
            return {"nodes": [], "links": []}

        # Select target date range
        if end_date and end_date in unique_dates:
            end_idx = unique_dates.index(end_date)
            selected_dates = unique_dates[max(0, end_idx - days + 1) : end_idx + 1]
        else:
            selected_dates = unique_dates[-days:]

        sub_df = df[df["date"].isin(selected_dates)]

        nodes = []
        links = []

        for i, date_str in enumerate(selected_dates):
            date_df = sub_df[sub_df["date"] == date_str]
            total_accesses = int(date_df["total_daily_accesses"].sum()) if "total_daily_accesses" in date_df.columns else 0
            suspicious_count = int(date_df["is_suspicious"].sum()) if "is_suspicious" in date_df.columns else 0
            active_emps = int(date_df["employee_id"].nunique())

            nodes.append({
                "id": date_str,
                "label": f"Day {i+1} ({date_str})",
                "date": date_str,
                "day_index": i,
                "total_accesses": total_accesses,
                "active_employees": active_emps,
                "threat_count": suspicious_count,
                "risk_level": "Critical" if suspicious_count >= 3 else ("High" if suspicious_count >= 1 else "Normal"),
            })

            # Link consecutive timeline days
            if i > 0:
                links.append({
                    "source": selected_dates[i - 1],
                    "target": date_str,
                    "type": "TIMELINE_NEXT",
                })

        return {
            "total_days": len(selected_dates),
            "start_date": selected_dates[0],
            "end_date": selected_dates[-1],
            "nodes": nodes,
            "links": links,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate timeline graph: {str(e)}")


# ---------------------------------------------------------------------------
# Level 2: Daily Employee Collusion & Co-Access Graph
# ---------------------------------------------------------------------------
@router.get("/day/{date_str}")
def get_daily_employee_network_graph(date_str: str):
    """
    Level 2 Graph API: Returns an employee co-access network graph for a given date.
    Employees who co-accessed the same banking modules on that date are linked.
    """
    if not config.ACCESS_LOGS_CSV.exists():
        raise HTTPException(status_code=404, detail="access_logs.csv not found")

    try:
        # Read access logs for the requested date
        df_logs = pd.read_csv(config.ACCESS_LOGS_CSV, usecols=["employee_id", "timestamp", "module"])
        df_logs["date"] = df_logs["timestamp"].str[:10]
        day_logs = df_logs[df_logs["date"] == date_str]

        if day_logs.empty:
            raise HTTPException(status_code=404, detail=f"No access logs found for date {date_str}")

        # Employee info lookup map
        emp_map = {}
        if not data_loader.EMPLOYEES_DF.empty:
            for _, r in data_loader.EMPLOYEES_DF.iterrows():
                emp_map[r["employee_id"]] = {
                    "name": str(r.get("name", r["employee_id"])),
                    "role": str(r.get("role", "")),
                    "branch": str(r.get("branch", "")),
                    "department": str(r.get("department", "")),
                }

        # Active employees on this date
        active_emps = sorted(day_logs["employee_id"].unique())

        nodes = []
        for eid in active_emps:
            info = emp_map.get(eid, {"name": eid, "role": "", "branch": "", "department": ""})
            pred = next((p for p in data_loader.ALL_PREDICTIONS if p["employee_id"] == eid), {})
            risk = pred.get("risk", "Normal")

            nodes.append({
                "id": eid,
                "label": info["name"],
                "employee_id": eid,
                "role": info["role"],
                "branch": info["branch"],
                "department": info["department"],
                "risk_level": risk,
                "access_void_score": pred.get("access_void_score", 0.0),
            })

        # Group accesses by module to find shared co-access connections
        mod_grouped = day_logs.groupby("module")["employee_id"].apply(lambda s: list(set(s)))

        edge_dict: Dict[tuple, list] = {}
        for module, emps in mod_grouped.items():
            if len(emps) < 2:
                continue
            sorted_emps = sorted(emps)
            for i in range(len(sorted_emps)):
                for j in range(i + 1, len(sorted_emps)):
                    pair = (sorted_emps[i], sorted_emps[j])
                    if pair not in edge_dict:
                        edge_dict[pair] = []
                    edge_dict[pair].append(module)

        links = []
        for (emp1, emp2), modules in edge_dict.items():
            # Flag high-risk suspected pairs (e.g. EMP001 Rajesh Kumar + EMP003/EMP010)
            is_suspected = (emp1 in config.SUSPECT_EMPLOYEES) and (emp2 in config.SUSPECT_EMPLOYEES)
            links.append({
                "source": emp1,
                "target": emp2,
                "shared_modules": modules,
                "co_access_count": len(modules),
                "is_suspected_collusion": is_suspected,
                "weight": len(modules) * (2.5 if is_suspected else 1.0),
            })

        return {
            "date": date_str,
            "total_active_employees": len(nodes),
            "total_co_access_links": len(links),
            "nodes": nodes,
            "links": links,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating daily employee graph: {str(e)}")


# ---------------------------------------------------------------------------
# Level 3: Employee Single-Day Action Drilldown Graph
# ---------------------------------------------------------------------------
@router.get("/employee-day-actions")
def get_employee_day_actions(
    date: str = Query(..., description="Date string YYYY-MM-DD"),
    employee_id: str = Query(..., description="Employee ID e.g. EMP001"),
):
    """
    Level 3 Graph API: Returns all raw access actions for an employee on a given date,
    including sequence analysis (Engine 1) and action node graph representations.
    """
    if not config.ACCESS_LOGS_CSV.exists():
        raise HTTPException(status_code=404, detail="access_logs.csv not found")

    try:
        df = pd.read_csv(config.ACCESS_LOGS_CSV)
        df["date_str"] = df["timestamp"].str[:10]

        emp_logs = df[(df["employee_id"] == employee_id) & (df["date_str"] == date)].copy()

        if emp_logs.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No log records found for employee {employee_id} on {date}",
            )

        emp_logs = emp_logs.sort_values("timestamp")

        # Employee info lookup
        emp_info = {"name": employee_id, "role": "", "branch": ""}
        if not data_loader.EMPLOYEES_DF.empty:
            row = data_loader.EMPLOYEES_DF[data_loader.EMPLOYEES_DF["employee_id"] == employee_id]
            if not row.empty:
                r = row.iloc[0]
                emp_info = {
                    "name": str(r.get("name", employee_id)),
                    "role": str(r.get("role", "")),
                    "branch": str(r.get("branch", "")),
                }

        actions_list = []
        action_tokens = []
        nodes = []
        links = []

        # Employee root node
        nodes.append({
            "id": employee_id,
            "label": emp_info["name"],
            "type": "EMPLOYEE",
            "group": 0,
        })

        module_nodes_added = set()

        for idx, row in emp_logs.iterrows():
            ts = str(row["timestamp"])
            module = str(row["module"])
            action = str(row.get("action", "View"))
            session = str(row.get("session_id", "S101"))

            actions_list.append({
                "timestamp": ts,
                "module": module,
                "action": action,
                "session_id": session,
            })
            action_tokens.append(module.upper())

            # Module graph node
            mod_node_id = f"MOD_{module.replace(' ', '_').upper()}"
            if mod_node_id not in module_nodes_added:
                nodes.append({
                    "id": mod_node_id,
                    "label": module,
                    "type": "MODULE",
                    "group": 1,
                })
                module_nodes_added.add(mod_node_id)
                # Link employee to module
                links.append({
                    "source": employee_id,
                    "target": mod_node_id,
                    "action": action,
                    "session_id": session,
                    "timestamp": ts,
                })

        # Calculate Engine 1 sequence risk score for this day
        chain_score = engine1.score_sequence(action_tokens)

        return {
            "employee_id": employee_id,
            "employee_name": emp_info["name"],
            "role": emp_info["role"],
            "date": date,
            "total_actions": len(actions_list),
            "chain_score": chain_score,
            "sequence_tokens": action_tokens,
            "actions": actions_list,
            "graph": {
                "nodes": nodes,
                "links": links,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch employee day actions: {str(e)}")
