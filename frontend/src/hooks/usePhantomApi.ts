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

export interface NLPDetails {
  language_score: number;
  vagueness?: number;
  urgency?: number;
  authority?: number;
  policy_bypass?: number;
  responsibility_shift?: number;
  top_keywords?: string[];
  category_scores?: Record<string, number>;
  status?: string;
  message?: string;
}

export interface EmployeeDetail extends EmployeeSummary {
  experience_years?: number;
  cohort_id?: string;
  nlp_details?: NLPDetails;
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

// Graph types
export interface GraphDayNode {
  id: string;
  label: string;
  date: string;
  day_index: number;
  total_accesses: number;
  active_employees: number;
  threat_count: number;
  risk_level: "Critical" | "High" | "Normal";
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

export interface TimelineGraph {
  total_days: number;
  start_date: string;
  end_date: string;
  nodes: GraphDayNode[];
  links: GraphLink[];
}

export interface NetworkNode {
  id: string;
  label: string;
  employee_id: string;
  role: string;
  branch: string;
  department: string;
  risk_level: string;
  access_void_score: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  shared_modules: string[];
  co_access_count: number;
  is_suspected_collusion: boolean;
  weight: number;
}

export interface DayNetworkGraph {
  date: string;
  total_active_employees: number;
  total_co_access_links: number;
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface ActionItem {
  timestamp: string;
  module: string;
  action: string;
  session_id: string;
}

export interface EmployeeDayActions {
  employee_id: string;
  employee_name: string;
  role: string;
  date: string;
  total_actions: number;
  chain_score: number;
  sequence_tokens: string[];
  actions: ActionItem[];
  graph: {
    nodes: Array<{ id: string; label: string; type: string; group: number }>;
    links: Array<{ source: string; target: string; action: string; session_id: string; timestamp: string }>;
  };
}

export interface EvaluateRequest {
  employee_id: string;
  log_actions: string[];
  co_access_events?: Array<Record<string, unknown>>;
  override_note?: string;
  access_void_score?: number;
}

export interface EvaluateResult {
  employee_id: string;
  dits_score: number;
  risk_level: RiskLevel;
  engine_scores: {
    engine1_chain_score: number;
    engine2_avoidance_score: number;
    engine3_collusion_score: number;
    engine4_language_score: number | null;
  };
  nlp_details: NLPDetails;
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

export function useGraphTimeline(days = 15) {
  return useQuery<TimelineGraph>({
    queryKey: ["graph-timeline", days],
    queryFn: () => apiFetch<TimelineGraph>(`/api/graph/timeline?days=${days}`),
    staleTime: STALE_60S,
    retry: 2,
  });
}

export function useGraphDay(date: string | null) {
  return useQuery<DayNetworkGraph>({
    queryKey: ["graph-day", date],
    queryFn: () => apiFetch<DayNetworkGraph>(`/api/graph/day/${date}`),
    staleTime: STALE_60S,
    enabled: !!date,
    retry: 2,
  });
}

export function useEmployeeDayActions(date: string | null, employeeId: string | null) {
  return useQuery<EmployeeDayActions>({
    queryKey: ["emp-day-actions", date, employeeId],
    queryFn: () =>
      apiFetch<EmployeeDayActions>(
        `/api/graph/employee-day-actions?date=${date}&employee_id=${employeeId}`,
      ),
    staleTime: STALE_60S,
    enabled: !!date && !!employeeId,
    retry: 2,
  });
}

export function useScoreText() {
  return useMutation<NLPDetails, Error, string>({
    mutationFn: (text: string) =>
      apiFetch("/api/score-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
  });
}

export function useEvaluate() {
  return useMutation<EvaluateResult, Error, EvaluateRequest>({
    mutationFn: (req: EvaluateRequest) =>
      apiFetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
  });
}
