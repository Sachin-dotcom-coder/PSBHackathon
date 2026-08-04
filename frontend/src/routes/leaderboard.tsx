import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Users, AlertTriangle, Activity } from "lucide-react";
import { useLeaderboard, useStats, type RiskLevel } from "@/hooks/usePhantomApi";
import { RiskBadge } from "@/components/phantom/RiskBadge";
import { SkeletonCard, OfflineBanner } from "@/components/phantom/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Risk Leaderboard — PHANTOM" },
      { name: "description", content: "All employees ranked by composite insider threat risk score." },
    ],
  }),
  component: Leaderboard,
});

type Filter = "All" | RiskLevel;
const FILTERS: Filter[] = ["All", "Critical", "High", "Medium", "Low", "Normal"];

const RISK_ORDER: Record<RiskLevel, number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3, Normal: 4,
};

const RISK_BAR_COLORS: Record<string, string> = {
  Critical: "var(--color-critical)",
  High:     "#f97316",
  Medium:   "#ffffff",
  Low:      "#737373",
  Normal:   "#404040",
};

function Leaderboard() {
  const [filter, setFilter] = useState<Filter>("All");
  const { data: leaderboard, isLoading, isError } = useLeaderboard();
  const { data: stats } = useStats();

  const filtered = useMemo(() => {
    if (!leaderboard) return [];
    if (filter === "All") return leaderboard;
    return leaderboard.filter((e) => e.risk === filter);
  }, [leaderboard, filter]);

  const chartData = useMemo(() => {
    if (!stats?.risk_breakdown) return [];
    return Object.entries(stats.risk_breakdown)
      .sort((a, b) => (RISK_ORDER[a[0] as RiskLevel] ?? 9) - (RISK_ORDER[b[0] as RiskLevel] ?? 9))
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
              <span className="text-mono text-[12px] font-semibold tracking-[0.18em]">PHANTOM</span>
              <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">/ Leaderboard</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground/80" />
            </span>
            Live
          </div>
        </div>
      </header>

      {/* Stats strip */}
      {stats && (
        <div className="border-b border-border/60 bg-surface/30">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
            {[
              { v: stats.total_employees,  l: "Employees Monitored" },
              { v: stats.flagged_high,     l: "High / Critical Risk" },
              { v: stats.flagged_medium,   l: "Medium Risk" },
              { v: stats.last_scan,        l: "Last Scan Date" },
            ].map(({ v, l }) => (
              <div key={l} className="bg-background px-6 py-4">
                <div className="text-[20px] font-semibold tabular-nums text-foreground">{v}</div>
                <div className="mt-0.5 text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {isError && <OfflineBanner />}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          {/* Main table */}
          <div>
            {/* Filter tabs */}
            <div className="mb-5 flex items-center gap-1 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-mono shrink-0 rounded-md px-3 py-1.5 text-[11px] uppercase tracking-widest transition ${
                    filter === f
                      ? "bg-surface-2 text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                  }`}
                >
                  {f}
                  {f !== "All" && leaderboard && (
                    <span className="ml-1.5 text-muted-foreground/60">
                      ({leaderboard.filter((e) => e.risk === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                {/* Table header */}
                <div className="grid grid-cols-[2rem_1fr_0.6fr_0.5fr_3rem_3rem_3rem_5rem] items-center gap-2 border-b border-border bg-surface/50 px-4 py-2">
                  {["#", "Employee", "Role", "Branch", "AVS", "Chain", "Coll.", "Risk"].map((h) => (
                    <div key={h} className="text-mono text-[9.5px] uppercase tracking-widest text-muted-foreground">
                      {h}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {filtered.map((emp, i) => (
                  <motion.div
                    key={emp.employee_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.025 }}
                  >
                    <Link
                      to="/employee/$id"
                      params={{ id: emp.employee_id }}
                      className="grid grid-cols-[2rem_1fr_0.6fr_0.5fr_3rem_3rem_3rem_5rem] items-center gap-2 border-b border-border px-4 py-3 transition hover:bg-surface/50 last:border-0"
                    >
                      <span className="text-mono text-[11px] tabular-nums text-muted-foreground">
                        {(leaderboard?.indexOf(emp) ?? i) + 1}
                      </span>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{emp.name}</div>
                        <div className="text-mono text-[10px] text-muted-foreground">{emp.employee_id}</div>
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate">{emp.role}</div>
                      <div className="text-[12px] text-muted-foreground truncate">{emp.branch}</div>
                      <ScoreCell value={emp.access_void_score} warn={60} />
                      <ScoreCell value={emp.chain_score} warn={70} />
                      <ScoreCell value={emp.collusion_score} warn={50} />
                      <RiskBadge risk={emp.risk} size="xs" />
                    </Link>
                  </motion.div>
                ))}

                {filtered.length === 0 && (
                  <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">
                    No employees in this risk tier.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — distribution chart */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-surface-2 p-5">
              <div className="text-mono mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Risk Distribution
              </div>
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ left: -20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#737373", fontSize: 9, fontFamily: "JetBrains Mono" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#737373", fontSize: 9, fontFamily: "JetBrains Mono" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#151515", border: "1px solid #262626", borderRadius: 6, fontSize: 11 }}
                      itemStyle={{ color: "#ffffff" }}
                      labelStyle={{ color: "#737373", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={RISK_BAR_COLORS[entry.name] ?? "#404040"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick links to top suspects */}
            <div className="rounded-xl border border-border bg-surface-2 p-5">
              <div className="text-mono mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Top Suspects
              </div>
              <div className="space-y-2">
                {leaderboard?.slice(0, 5).map((emp) => (
                  <Link
                    key={emp.employee_id}
                    to="/employee/$id"
                    params={{ id: emp.employee_id }}
                    className="flex items-center justify-between rounded-md border border-transparent p-2 transition hover:border-border hover:bg-surface"
                  >
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{emp.name}</div>
                      <div className="text-[11px] text-muted-foreground">{emp.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-[13px] font-semibold tabular-nums text-foreground">
                        {emp.access_void_score.toFixed(0)}
                      </span>
                      <RiskBadge risk={emp.risk} size="xs" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ScoreCell({ value, warn }: { value: number; warn: number }) {
  const hot = value >= warn;
  return (
    <span className={`text-mono text-[12px] font-semibold tabular-nums ${hot ? "text-[color:var(--color-critical)]" : "text-foreground"}`}>
      {value}
    </span>
  );
}
