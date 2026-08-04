/**
 * PHANTOM — TanStack Query hooks for all API endpoints
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = "Normal" | "Low" | "Medium" | "High" | "Critical";

export interface EmployeeSummary {
  employee_id: string;
  name: string;
  role: string;
  branch: string;
  access_void_score: number;
  risk: RiskLevel;
  chain_score: number;
  collusion_score: number;
  language_score: number | null;
  composite_trust_score: number;
  reasons: string[];
}

export interface EmployeeDetail extends EmployeeSummary {
  experience_years?: number;
  cohort_id?: string;
  personality?: {
    work_style?: string;
    risk_profile?: string;
    arrival_time?: string;
    leave_time?: string;
    avg_daily_customers?: number;
    typing_speed?: string;
    break_pattern?: string;
    leave_frequency?: string;
  };
}

export interface TimelineEvent {
  day: number;
  type: "decline_start" | "audit_zero" | "compliance_zero" | "risk_escalation";
  label: string;
  color: string;
}

export interface TimelineDay {
  day: number;
  date: string;
  primary_activity: number;
  audit: number;
  compliance: number;
  override: number;
  access_void_score: number;
}

export interface EmployeeTimeline {
  employee_id: string;
  name: string;
  role: string;
  primary_module_name: string;
  current_score: number;
  risk_level: RiskLevel;
  trend: string;
  events: TimelineEvent[];
  timeline: TimelineDay[];
}

export interface CollusionGraph {
  employee_id: string;
  collusion_score: number;
  graph: {
    nodes: Array<{ id: string; type: "employee" | "record"; group: number }>;
    links: Array<{ source: string; target: string; weight: number }>;
  };
}

export interface ChainScore {
  employee_id: string;
  date: string;
  chain_score: number;
}

export interface SystemStats {
  total_employees: number;
  flagged_high: number;
  flagged_medium: number;
  flagged_low: number;
  last_scan: string;
  total_events: number;
  risk_breakdown: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const STALE_30S = 30_000;
const STALE_60S = 60_000;

export function useLeaderboard() {
  return useQuery<EmployeeSummary[]>({
    queryKey: ["leaderboard"],
    queryFn: () => apiFetch<EmployeeSummary[]>("/api/leaderboard"),
    staleTime: STALE_30S,
    retry: 2,
  });
}

export function useEmployee(id: string) {
  return useQuery<EmployeeDetail>({
    queryKey: ["employee", id],
    queryFn: () => apiFetch<EmployeeDetail>(`/api/employees/${id}`),
    staleTime: STALE_30S,
    enabled: !!id,
    retry: 2,
  });
}

export function useTimeline(id: string) {
  return useQuery<EmployeeTimeline>({
    queryKey: ["timeline", id],
    queryFn: () => apiFetch<EmployeeTimeline>(`/api/employee/${id}/timeline`),
    staleTime: STALE_60S,
    enabled: !!id,
    retry: 2,
  });
}

export function useCollusion(id: string) {
  return useQuery<CollusionGraph>({
    queryKey: ["collusion", id],
    queryFn: () => apiFetch<CollusionGraph>(`/api/employee/${id}/collusion`),
    staleTime: STALE_60S,
    enabled: !!id,
    retry: 2,
  });
}

export function useChainScore(id: string, date?: string) {
  return useQuery<ChainScore>({
    queryKey: ["chain-score", id, date],
    queryFn: () =>
      apiFetch<ChainScore>(
        `/api/employee/${id}/chain-score${date ? `?date=${date}` : ""}`,
      ),
    staleTime: STALE_60S,
    enabled: !!id,
    retry: 2,
  });
}

export function useStats() {
  return useQuery<SystemStats>({
    queryKey: ["stats"],
    queryFn: () => apiFetch<SystemStats>("/api/stats"),
    staleTime: STALE_30S,
    retry: 2,
  });
}

export function useScoreText() {
  return useMutation<
    { language_score: null; status: string; message: string },
    Error,
    string
  >({
    mutationFn: (text: string) =>
      apiFetch("/api/score-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
  });
}
