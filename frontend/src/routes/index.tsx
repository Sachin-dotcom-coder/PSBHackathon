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

function MetricCell({ label, value, accent, loading, sublabel, delay = 0 }: {
  label: string;
  value: string | number;
  accent?: string;
  loading?: boolean;
  sublabel?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-white/[0.08] bg-[#10131e]/90 px-6 py-5.5 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex flex-col justify-between min-h-[105px]"
    >
      <div className="text-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
        <span>{label}</span>
        {sublabel && <span className="text-[10px] text-muted-foreground/70 font-normal tracking-normal">{sublabel}</span>}
      </div>
      {loading ? (
        <div className="h-9 w-24 animate-pulse rounded bg-surface-2" />
      ) : (
        <div
          className="text-mono text-[30px] font-extrabold tabular-nums tracking-tight leading-none"
          style={{ color: accent ?? "var(--foreground)" }}
        >
          {value}
        </div>
      )}
    </motion.div>
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
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
      <td className="text-mono py-3.5 pl-4 pr-3 text-[12px] text-muted-foreground">{index}</td>
      <td className="py-3.5 pr-4">
        <div className="text-[14px] font-semibold text-foreground">{name}</div>
        <div className="text-mono text-[11px] text-muted-foreground">{method}</div>
      </td>
      <td className="py-3.5 pr-4">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-mono text-[11px] font-medium border border-white/10 bg-surface-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
          {label}
        </span>
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
    if (threatLevel === "CRITICAL") return "#ef4444";
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
  const chartData = useMemo(() => {
    if (!stats?.risk_breakdown) return [];
    return RISK_ORDER
      .filter(r => (stats.risk_breakdown?.[r] ?? 0) > 0)
      .map(r => ({ name: r, value: stats.risk_breakdown![r], fill: RISK_COLORS[r] }));
  }, [stats]);

  return (
    <main className="min-h-screen bg-background text-foreground py-6">

      {/* ── Top metrics cards ── */}
      <div className="w-full px-10 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <MetricCell
            label="Monitored Employees"
            value={stats?.total_employees ?? "—"}
            accent="#f3f4f6"
            loading={statsLoading}
            sublabel="Active Roster"
            delay={0.05}
          />
          <MetricCell
            label="Critical / High Risk"
            value={statsLoading ? "—" : critHighTotal}
            accent={critHighTotal > 0 ? "#ef4444" : "var(--emerald)"}
            loading={statsLoading}
            sublabel="Action Required"
            delay={0.1}
          />
          <MetricCell
            label="Medium Risk"
            value={stats?.flagged_medium ?? "—"}
            accent="#facc15"
            loading={statsLoading}
            sublabel="Watchlist"
            delay={0.15}
          />
          <MetricCell
            label="Log Events Analysed"
            value={statsLoading ? "—" : fmt(stats?.total_events ?? 0)}
            accent="#06b6d4"
            loading={statsLoading}
            sublabel="Real-time Feed"
            delay={0.2}
          />
          
          {/* Threat Level & Last Scan combined card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-xl border border-white/[0.08] bg-[#10131e]/90 px-6 py-5.5 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex flex-col justify-between min-h-[105px]"
          >
            <div className="text-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between mb-3">
              <span>SOC Threat Level</span>
              <span className="text-[10px] text-muted-foreground/70 font-normal">Last Scan: {stats?.last_scan ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: threatColor }}
                />
                <span
                  className="relative inline-flex h-3.5 w-3.5 rounded-full"
                  style={{ background: threatColor }}
                />
              </span>
              <span
                className="text-mono text-[24px] font-extrabold uppercase tracking-wider leading-none"
                style={{ color: threatColor }}
              >
                {threatLevel}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="w-full px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">

          {/* ── LEFT: Alert feed + Engine status ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-5"
          >

            {/* High-Risk Alert Feed */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#10131e]/90 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-[color:var(--critical)]" />
                  <span className="text-[14px] font-bold text-foreground tracking-wide">
                    Active Threat Feed
                  </span>
                  <span className="text-mono text-[11px] text-muted-foreground font-normal">
                    — sorted by DITS score · live
                  </span>
                </div>
                <Link
                  to="/leaderboard"
                  className="flex items-center gap-1 text-mono text-[11px] text-muted-foreground uppercase tracking-widest hover:text-white transition"
                >
                  All 50 <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[2.5rem_1fr_0.7fr_0.5fr_4.5rem_5rem] items-center gap-2 border-b border-white/[0.06] bg-white/[0.01] px-5 py-2.5">
                {["#", "Employee", "Role", "Branch", "DITS", "Status"].map(h => (
                  <span key={h} className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {h}
                  </span>
                ))}
              </div>

              {/* Table body */}
              {lbLoading ? (
                <div className="p-5 space-y-3">
                  <SkeletonCard className="h-10" />
                  <SkeletonCard className="h-10" />
                  <SkeletonCard className="h-10" />
                </div>
              ) : (
                <div>
                  {alertFeed.map((emp, i) => {
                    const isCrit = emp.risk === "Critical";
                    const dotColor = RISK_COLORS[emp.risk] ?? "#737373";
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
                          className="grid grid-cols-[2.5rem_1fr_0.7fr_0.5fr_4.5rem_5rem] items-center gap-2 border-b border-white/[0.04] px-5 py-3 transition hover:bg-white/[0.03] last:border-0 group"
                          style={isCrit ? { background: "rgba(239,68,68,0.03)" } : undefined}
                        >
                          <span className="text-mono text-[12px] tabular-nums text-muted-foreground font-medium">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-foreground group-hover:text-[color:var(--cyan)] transition-colors truncate">
                              {emp.name}
                            </div>
                            <div className="text-mono text-[11px] text-muted-foreground/80">{emp.employee_id}</div>
                          </div>
                          <div className="text-[13px] text-muted-foreground truncate">{emp.role}</div>
                          <div className="text-[13px] text-muted-foreground truncate">{emp.branch}</div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-mono text-[16px] font-extrabold tabular-nums"
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
            <div className="rounded-2xl border border-white/[0.08] bg-[#10131e]/90 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-4 w-4 text-[color:var(--cyan)]" />
                  <span className="text-[14px] font-bold text-foreground tracking-wide">Detection Engine Matrix</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full bg-[color:var(--emerald)] shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    style={{ animation: "blink-dot 2s ease-in-out infinite" }}
                  />
                  <span className="text-mono text-[11px] uppercase tracking-widest text-[color:var(--emerald)] font-semibold">
                    4 / 4 Online
                  </span>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                    {["ID", "Engine", "Status"].map(h => (
                      <th key={h} className="text-mono py-2.5 px-5 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
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
          </motion.div>

          {/* ── RIGHT: Risk breakdown + quick nav ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-5"
          >

            {/* Risk Distribution */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#10131e]/90 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] font-bold text-foreground tracking-wide">Risk Distribution</span>
                  <span className="text-mono text-[11px] text-muted-foreground ml-1 font-normal">— real-time</span>
                </div>
              </div>
              <div className="p-5">
                {statsLoading ? (
                  <SkeletonCard className="h-32" />
                ) : (
                  <>
                    {/* Stacked bar */}
                    <div className="mb-5 h-3.5 overflow-hidden rounded-full bg-surface-2 flex gap-0.5 p-0.5 border border-white/[0.06]">
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
                            className="h-full rounded-full"
                            style={{ background: RISK_COLORS[r] }}
                            title={`${r}: ${count}`}
                          />
                        );
                      })}
                    </div>

                    {/* Counts */}
                    <div className="space-y-3">
                      {RISK_ORDER.map(r => {
                        const count = stats?.risk_breakdown?.[r] ?? 0;
                        if (count === 0) return null;
                        const total = stats?.total_employees ?? 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={r} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                                style={{ background: RISK_COLORS[r] }}
                              />
                              <span className="text-[13px] font-medium text-foreground">{r}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden border border-white/[0.04]">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: RISK_COLORS[r] }}
                                />
                              </div>
                              <span className="text-mono text-[13px] font-extrabold tabular-nums text-foreground w-6 text-right">
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
            <div className="rounded-2xl border border-white/[0.08] bg-[#10131e]/90 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
                <span className="text-[14px] font-bold text-foreground tracking-wide">Investigation Tools</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {[
                  { to: "/leaderboard",   label: "Employee Leaderboard",  sub: "All 50 employees ranked", icon: Users },
                  { to: "/investigation", label: "Graph Visualizer",       sub: "3-level drilldown",       icon: Network },
                ].map(({ to, label, sub, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-[color:var(--cyan)] transition-colors" />
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">{label}</div>
                        <div className="text-[11px] text-muted-foreground">{sub}</div>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* System info */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#10131e]/90 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] font-bold text-foreground tracking-wide">System Summary</span>
                </div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {[
                  { label: "Dataset",         value: "PSB Bank · 50 Employees" },
                  { label: "Log Events",       value: statsLoading ? "…" : fmt(stats?.total_events ?? 0) },
                  { label: "Last Scan Date",   value: stats?.last_scan ?? "—" },
                  { label: "DITS Formula",     value: "E1×0.30 + E2×0.30 + E3×0.20 + E4×0.20" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 px-5 py-3">
                    <span className="text-mono text-[11px] text-muted-foreground uppercase tracking-widest shrink-0 font-medium">
                      {label}
                    </span>
                    <span className="text-mono text-[11px] text-foreground text-right font-semibold">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
