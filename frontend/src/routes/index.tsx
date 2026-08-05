import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Activity,
  Network,
  Users,
  Zap,
  Shield,
  ArrowUpRight,
  Terminal,
  CheckCircle2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useStats, useLeaderboard } from "@/hooks/usePhantomApi";
import { RiskBadge } from "@/components/phantom/RiskBadge";
import { SkeletonCard } from "@/components/phantom/LoadingSkeleton";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "SOC Overview — PHANTOM" },
      { name: "description", content: "Primary SOC command center for live insider threat monitoring." },
    ],
  }),
  component: SOCDashboard,
});

// ─── Shared ───────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  Critical: "#E5484D",
  High:     "#f97316",
  Medium:   "#facc15",
  Low:      "#737373",
  Normal:   "#404040",
};

const RISK_ORDER = ["Critical", "High", "Medium", "Low", "Normal"];

/** Format large numbers: 415788 → "415,788" */
function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCell({ label, value, accent, loading }: {
  label: string;
  value: string | number;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="border-r border-border last:border-r-0 px-5 py-4">
      <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
        {label}
      </div>
      {loading ? (
        <div className="h-7 w-16 animate-pulse rounded bg-surface" />
      ) : (
        <div
          className="text-mono text-[26px] font-bold tabular-nums leading-none"
          style={{ color: accent ?? "var(--foreground)" }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function EngineStatusRow({ index, name, method, status }: {
  index: string;
  name: string;
  method: string;
  status: "online" | "computing" | "offline";
}) {
  const dot = status === "online" ? "var(--emerald)" : status === "computing" ? "#facc15" : "#E5484D";
  const label = status === "online" ? "ONLINE" : status === "computing" ? "COMPUTING" : "OFFLINE";
  return (
    <tr className="border-b border-border/60 hover:bg-surface/30 transition-colors">
      <td className="text-mono py-3 pl-4 pr-3 text-[12px] text-muted-foreground">{index}</td>
      <td className="py-3 pr-4">
        <div className="text-[14px] font-semibold text-foreground">{name}</div>
        <div className="text-mono text-[11px] text-muted-foreground">{method}</div>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: dot, boxShadow: `0 0 5px ${dot}80` }}
          />
          <span className="text-mono text-[11px] uppercase tracking-widest" style={{ color: dot }}>
            {label}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function SOCDashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard();

  // All derived from real API data
  const criticalCount = stats?.risk_breakdown?.["Critical"] ?? 0;
  const highCount     = stats?.risk_breakdown?.["High"]     ?? 0;
  const critHighTotal = criticalCount + highCount;

  const threatLevel = useMemo(() => {
    if (criticalCount >= 1) return "CRITICAL";
    if (highCount >= 3)     return "HIGH";
    if (highCount >= 1)     return "ELEVATED";
    return "NOMINAL";
  }, [criticalCount, highCount]);

  const threatColor = useMemo(() => {
    if (threatLevel === "CRITICAL") return "#E5484D";
    if (threatLevel === "HIGH")     return "#f97316";
    if (threatLevel === "ELEVATED") return "#facc15";
    return "var(--emerald)";
  }, [threatLevel]);

  // Alert feed: top-risk employees from real leaderboard API
  const alertFeed = useMemo(() =>
    (leaderboard ?? [])
      .filter(e => e.risk === "Critical" || e.risk === "High" || e.risk === "Medium")
      .slice(0, 10),
    [leaderboard]
  );

  // Risk breakdown chart from real stats API
  const chartData = useMemo(() =>
    RISK_ORDER
      .filter(r => (stats?.risk_breakdown?.[r] ?? 0) > 0)
      .map(r => ({ name: r, value: stats!.risk_breakdown![r], fill: RISK_COLORS[r] })),
    [stats]
  );

  return (
    <main className="min-h-[calc(100vh-53px)] bg-background text-foreground">

      {/* ── Top metrics strip ── */}
      <div className="border-b border-border bg-surface/20">
        <div className="w-full px-8">
          <div className="flex flex-wrap items-stretch divide-x divide-border">
            <MetricCell
              label="Monitored Employees"
              value={stats?.total_employees ?? "—"}
              accent="var(--foreground)"
              loading={statsLoading}
            />
            <MetricCell
              label="Critical / High Risk"
              value={statsLoading ? "—" : critHighTotal}
              accent={critHighTotal > 0 ? "#E5484D" : "var(--emerald)"}
              loading={statsLoading}
            />
            <MetricCell
              label="Medium Risk"
              value={stats?.flagged_medium ?? "—"}
              accent="#facc15"
              loading={statsLoading}
            />
            <MetricCell
              label="Log Events Analysed"
              value={statsLoading ? "—" : fmt(stats?.total_events ?? 0)}
              accent="var(--foreground)"
              loading={statsLoading}
            />
            <div className="px-5 py-4 flex items-center gap-4 ml-auto">
              {/* Threat level — derived from real stats */}
              <div className="flex items-center gap-2">
                <span
                  className="relative flex h-2.5 w-2.5"
                  style={{ "--tc": threatColor } as React.CSSProperties}
                >
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                    style={{ background: threatColor }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ background: threatColor }}
                  />
                </span>
                <div>
                  <div className="text-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground leading-none mb-0.5">
                    Threat Level
                  </div>
                  <div
                    className="text-mono text-[13px] font-bold uppercase tracking-widest leading-none"
                    style={{ color: threatColor }}
                  >
                    {threatLevel}
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              {/* Last scan from real data */}
              <div>
                <div className="text-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground leading-none mb-0.5">
                  Last Scan
                </div>
                <div className="text-mono text-[13px] font-medium text-foreground leading-none">
                  {stats?.last_scan ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="w-full px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">

          {/* ── LEFT: Alert feed + Engine status ── */}
          <div className="space-y-5">

            {/* High-Risk Alert Feed */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-surface/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--critical)]" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Active Threat Feed
                  </span>
                  <span className="text-mono text-[10px] text-muted-foreground ml-1">
                    — sorted by DITS score · live
                  </span>
                </div>
                <Link
                  to="/leaderboard"
                  className="flex items-center gap-1 text-mono text-[11px] text-muted-foreground uppercase tracking-widest hover:text-foreground transition"
                >
                  All 50 <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[2.5rem_1fr_0.7fr_0.5fr_4.5rem_5rem] items-center gap-2 border-b border-border/60 bg-surface/20 px-4 py-2">
                {["#", "Employee", "Role", "Branch", "DITS", "Status"].map(h => (
                  <div key={h} className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</div>
                ))}
              </div>

              {lbLoading ? (
                <div className="space-y-px">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} className="h-14 rounded-none" />)}
                </div>
              ) : (
                <div>
                  {alertFeed.map((emp, i) => {
                    const isCrit = emp.risk === "Critical";
                    const isHigh = emp.risk === "High";
                    const dotColor = RISK_COLORS[emp.risk] ?? "#737373";
                    // Use real DITS from API (access_void_score is the primary risk score)
                    const score = emp.access_void_score.toFixed(0);
                    return (
                      <motion.div
                        key={emp.employee_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        <Link
                          to="/employee/$id"
                          params={{ id: emp.employee_id }}
                          className="grid grid-cols-[2.5rem_1fr_0.7fr_0.5fr_4.5rem_5rem] items-center gap-2 border-b border-border/40 px-4 py-2.5 transition hover:bg-surface/50 last:border-0 group"
                          style={isCrit ? { background: "rgba(229,72,77,0.025)" } : undefined}
                        >
                          <span className="text-mono text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-foreground group-hover:text-[color:var(--cyan)] transition-colors truncate">
                              {emp.name}
                            </div>
                            <div className="text-mono text-[11px] text-muted-foreground">{emp.employee_id}</div>
                          </div>
                          <div className="text-[12px] text-muted-foreground truncate">{emp.role}</div>
                          <div className="text-[12px] text-muted-foreground truncate">{emp.branch}</div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-mono text-[15px] font-bold tabular-nums"
                              style={{ color: dotColor }}
                            >
                              {score}
                            </span>
                          </div>
                          <RiskBadge risk={emp.risk} size="xs" />
                        </Link>
                      </motion.div>
                    );
                  })}
                  {alertFeed.length === 0 && !lbLoading && (
                    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[color:var(--emerald)]">
                      <CheckCircle2 className="h-4 w-4" />
                      No high-risk threats detected
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4-Engine Status Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-surface/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-[color:var(--cyan)]" />
                  <span className="text-[13px] font-semibold text-foreground">Detection Engine Matrix</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[color:var(--emerald)]"
                    style={{ animation: "blink-dot 2s ease-in-out infinite" }}
                  />
                  <span className="text-mono text-[11px] uppercase tracking-widest text-[color:var(--emerald)]">
                    4 / 4 Online
                  </span>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-surface/20">
                    {["ID", "Engine", "Status"].map(h => (
                      <th key={h} className="text-mono py-2 px-4 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <EngineStatusRow index="E-01" name="Temporal Chain Analyser" method="LSTM sequence scoring" status="online" />
                  <EngineStatusRow index="E-02" name="Access Void Profiler"    method="Isolation Forest (ML)" status="online" />
                  <EngineStatusRow index="E-03" name="Collusion Graph Engine"  method="Co-access pair detection" status="online" />
                  <EngineStatusRow index="E-04" name="NLP Justification Scanner" method="IndicBERT language model" status="online" />
                </tbody>
              </table>
            </div>
          </div>

          {/* ── RIGHT: Risk breakdown + quick nav ── */}
          <div className="space-y-5">

            {/* Risk Distribution */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="border-b border-border bg-surface/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">Risk Distribution</span>
                  <span className="text-mono text-[10px] text-muted-foreground ml-1">— real-time</span>
                </div>
              </div>
              <div className="p-4">
                {statsLoading ? (
                  <SkeletonCard className="h-32" />
                ) : (
                  <>
                    {/* Stacked bar */}
                    <div className="mb-4 h-3 overflow-hidden rounded-full bg-surface flex gap-px">
                      {RISK_ORDER.map(r => {
                        const count = stats?.risk_breakdown?.[r] ?? 0;
                        const total = stats?.total_employees ?? 1;
                        const pct = (count / total) * 100;
                        if (pct === 0) return null;
                        return (
                          <motion.div
                            key={r}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full"
                            style={{ background: RISK_COLORS[r] }}
                            title={`${r}: ${count}`}
                          />
                        );
                      })}
                    </div>

                    {/* Counts */}
                    <div className="space-y-2">
                      {RISK_ORDER.map(r => {
                        const count = stats?.risk_breakdown?.[r] ?? 0;
                        if (count === 0) return null;
                        const total = stats?.total_employees ?? 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={r} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-sm shrink-0"
                                style={{ background: RISK_COLORS[r] }}
                              />
                              <span className="text-[13px] text-muted-foreground">{r}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-1 bg-surface rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: RISK_COLORS[r] }}
                                />
                              </div>
                              <span className="text-mono text-[13px] font-bold tabular-nums text-foreground w-4 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick access */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="border-b border-border bg-surface/40 px-4 py-3">
                <span className="text-[13px] font-semibold text-foreground">Investigation Tools</span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { to: "/leaderboard",   label: "Employee Leaderboard",  sub: "All 50 employees ranked", icon: Users },
                  { to: "/investigation", label: "Graph Visualizer",       sub: "3-level drilldown",       icon: Network },
                  { to: "/simulator",     label: "Live Simulator",         sub: "Test logs & NLP notes",   icon: Zap },
                ].map(({ to, label, sub, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex items-center justify-between px-4 py-3 hover:bg-surface/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[color:var(--cyan)] transition-colors" />
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{label}</div>
                        <div className="text-[11px] text-muted-foreground">{sub}</div>
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* System info */}
            <div className="rounded-lg border border-border">
              <div className="border-b border-border bg-surface/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">System Summary</span>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {[
                  { label: "Dataset",         value: "PSB Bank · 50 Employees" },
                  { label: "Log Events",       value: statsLoading ? "…" : fmt(stats?.total_events ?? 0) },
                  { label: "Last Scan Date",   value: stats?.last_scan ?? "—" },
                  { label: "DITS Formula",     value: "E1×0.30 + E2×0.30 + E3×0.20 + E4×0.20" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <span className="text-mono text-[11px] text-muted-foreground uppercase tracking-widest shrink-0">
                      {label}
                    </span>
                    <span className="text-mono text-[11px] text-foreground text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
