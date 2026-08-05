import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
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

const RISK_COLORS: Record<string, string> = {
  Critical: "#E5484D",
  High:     "#f97316",
  Medium:   "#facc15",
  Low:      "#737373",
  Normal:   "#404040",
};

const ENGINE_COLORS = ["var(--cyan)", "#f97316", "#a855f7", "var(--emerald)"];
const ENGINE_LABELS = ["Chain", "Avoid", "Coll.", "Lang"];

function EngineMiniBar({ values }: { values: (number | null)[] }) {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-sm transition-all"
          style={{
            height: `${Math.max(4, ((v ?? 0) / 100) * 20)}px`,
            background: ENGINE_COLORS[i],
            opacity: v === null ? 0.2 : 0.8,
          }}
          title={`${ENGINE_LABELS[i]}: ${v ?? "N/A"}`}
        />
      ))}
    </div>
  );
}

function ScoreCell({ value, warn }: { value: number; warn: number }) {
  const hot = value >= warn;
  return (
    <span
      className="text-mono text-[14px] font-bold tabular-nums"
      style={{ color: hot ? RISK_COLORS["Critical"] : "var(--foreground)" }}
    >
      {value.toFixed(0)}
    </span>
  );
}

function Leaderboard() {
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const { data: leaderboard, isLoading, isError } = useLeaderboard();
  const { data: stats } = useStats();

  // Unique branches
  const branches = useMemo(() => {
    if (!leaderboard) return ["All"];
    const bset = new Set(leaderboard.map(e => e.branch));
    return ["All", ...Array.from(bset).sort()];
  }, [leaderboard]);

  const filtered = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard
      .filter(e => {
        const matchRisk = filter === "All" || e.risk === filter;
        const matchSearch =
          !search ||
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
          e.role.toLowerCase().includes(search.toLowerCase());
        const matchBranch = branchFilter === "All" || e.branch === branchFilter;
        return matchRisk && matchSearch && matchBranch;
      })
      .sort((a, b) => (RISK_ORDER[a.risk] - RISK_ORDER[b.risk]) || (b.access_void_score - a.access_void_score));
  }, [leaderboard, filter, search, branchFilter]);

  const chartData = useMemo(() => {
    if (!stats?.risk_breakdown) return [];
    return Object.entries(stats.risk_breakdown)
      .sort((a, b) => (RISK_ORDER[a[0] as RiskLevel] ?? 9) - (RISK_ORDER[b[0] as RiskLevel] ?? 9))
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  return (
    <main className="min-h-[calc(100vh-53px)] bg-background text-foreground">

      {/* Page Header */}
      <div className="border-b border-border/60 bg-surface/30 px-6 py-6">
        <div className="w-full px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-mono mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                PHANTOM · Employee Risk Registry
              </div>
              <h1 className="text-[28px] font-bold tracking-tight">
                Risk Leaderboard
              </h1>
            </div>
            {stats && (
              <div className="flex flex-wrap gap-3">
                {[
                  { v: stats.total_employees, l: "Total Employees", c: "var(--cyan)" },
                  { v: stats.flagged_high, l: "High / Critical", c: "#E5484D" },
                  { v: stats.flagged_medium, l: "Medium Risk", c: "#facc15" },
                ].map(({ v, l, c }) => (
                  <div key={l} className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-center">
                    <div className="text-mono text-[22px] font-bold" style={{ color: c }}>{v}</div>
                    <div className="text-[11px] text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {isError && <OfflineBanner />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main table area */}
          <div>
            {/* Search + Filter Toolbar */}
            <div className="mb-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name, ID, role..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-[color:var(--cyan)] focus:outline-none transition-colors"
                  />
                </div>
                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition ${showFilters ? "border-[color:var(--cyan)] bg-surface text-foreground" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"}`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </button>
              </div>

              {/* Expandable filter row */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/40 p-3">
                      {/* Branch filter */}
                      <div className="relative">
                        <select
                          value={branchFilter}
                          onChange={e => setBranchFilter(e.target.value)}
                          className="appearance-none rounded-md border border-border bg-surface-2 pl-3 pr-7 py-2 text-[13px] text-foreground focus:outline-none focus:border-[color:var(--cyan)] cursor-pointer"
                        >
                          {branches.map(b => <option key={b} value={b}>{b === "All" ? "All Branches" : b}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Risk status pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-mono relative rounded-full px-3 py-1.5 text-[12px] font-medium uppercase tracking-widest transition-all ${
                      filter === f
                        ? "text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={filter === f ? {
                      background: f === "All" ? "var(--foreground)" : (RISK_COLORS[f] ?? "#fff"),
                    } : {}}
                  >
                    {f}
                    {f !== "All" && leaderboard && (
                      <span className="ml-1.5 opacity-70">
                        ({leaderboard.filter(e => e.risk === f).length})
                      </span>
                    )}
                  </button>
                ))}
                {search || branchFilter !== "All" || filter !== "All" ? (
                  <button
                    onClick={() => { setSearch(""); setBranchFilter("All"); setFilter("All"); }}
                    className="text-[12px] text-muted-foreground underline hover:text-foreground ml-2"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            </div>

            {/* Results count */}
            <div className="mb-3 text-[13px] text-muted-foreground">
              {isLoading ? "Loading..." : `${filtered.length} employee${filtered.length !== 1 ? "s" : ""} found`}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} className="h-[72px]" />)}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                {/* Table header */}
                <div className="grid grid-cols-[2.5rem_1fr_0.7fr_0.5fr_5rem_6rem_6rem] items-center gap-3 border-b border-border bg-surface/60 px-5 py-3">
                  {["#", "Employee", "Role", "Branch", "DITS", "Engine Scores", "Risk"].map(h => (
                    <div key={h} className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {h}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                <AnimatePresence mode="popLayout">
                  {filtered.map((emp, i) => {
                    const isHot = emp.risk === "Critical" || emp.risk === "High";
                    return (
                      <motion.div
                        key={emp.employee_id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                      >
                        <Link
                          to="/employee/$id"
                          params={{ id: emp.employee_id }}
                          className="group grid grid-cols-[2.5rem_1fr_0.7fr_0.5fr_5rem_6rem_6rem] items-center gap-3 border-b border-border px-5 py-3.5 transition hover:bg-surface/50 last:border-0"
                          style={isHot ? { background: "rgba(229,72,77,0.025)" } : undefined}
                        >
                          {/* Rank */}
                          <span className="text-mono text-[13px] tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          {/* Employee */}
                          <div className="min-w-0">
                            <div className="text-[16px] font-semibold text-foreground truncate group-hover:text-[color:var(--cyan)] transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-mono text-[12px] text-muted-foreground">{emp.employee_id}</div>
                          </div>
                          {/* Role */}
                          <div className="text-[13px] text-muted-foreground truncate">{emp.role}</div>
                          {/* Branch */}
                          <div className="text-[13px] text-muted-foreground truncate">{emp.branch}</div>
                          {/* DITS */}
                          <ScoreCell value={emp.access_void_score} warn={60} />
                          {/* Engine mini-bars */}
                          <EngineMiniBar values={[emp.chain_score, emp.access_void_score, emp.collusion_score, emp.language_score]} />
                          {/* Risk + Action */}
                          <div className="flex items-center gap-2">
                            <RiskBadge risk={emp.risk} size="xs" />
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filtered.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                    <div className="text-[15px] text-muted-foreground">No employees match your filters</div>
                    <button
                      onClick={() => { setSearch(""); setBranchFilter("All"); setFilter("All"); }}
                      className="text-[13px] text-[color:var(--cyan)] hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            {/* Risk Distribution Chart */}
            <div className="rounded-xl border border-border bg-surface-2 p-5">
              <div className="text-[16px] font-bold mb-1">Risk Distribution</div>
              <div className="text-mono text-[11px] text-muted-foreground mb-4 uppercase tracking-widest">
                By tier
              </div>
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ left: -20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#737373", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#737373", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#151515", border: "1px solid #262626", borderRadius: 8, fontSize: 13 }}
                      itemStyle={{ color: "#ffffff" }}
                      labelStyle={{ color: "#737373", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map(entry => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? "#404040"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Suspects */}
            <div className="rounded-xl border border-border bg-surface-2 p-5" style={{ borderColor: "rgba(229,72,77,0.2)" }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-[color:var(--critical)]" />
                <div className="text-[16px] font-bold">Top Suspects</div>
              </div>
              <div className="space-y-1.5">
                {leaderboard?.slice(0, 5).map(emp => (
                  <Link
                    key={emp.employee_id}
                    to="/employee/$id"
                    params={{ id: emp.employee_id }}
                    className="flex items-center justify-between rounded-lg border border-transparent p-2.5 transition hover:border-border hover:bg-surface"
                  >
                    <div>
                      <div className="text-[14px] font-semibold text-foreground">{emp.name}</div>
                      <div className="text-[12px] text-muted-foreground">{emp.role} · {emp.branch}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-mono text-[16px] font-bold tabular-nums"
                        style={{ color: RISK_COLORS[emp.risk] ?? "#fff" }}
                      >
                        {emp.access_void_score.toFixed(0)}
                      </span>
                      <RiskBadge risk={emp.risk} size="xs" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Engine Legend */}
            <div className="rounded-xl border border-border bg-surface-2 p-5">
              <div className="text-[14px] font-bold mb-3">Engine Score Legend</div>
              <div className="space-y-2">
                {["Chain (E1)", "Avoidance (E2)", "Collusion (E3)", "Language (E4)"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-sm" style={{ background: ENGINE_COLORS[i] }} />
                    <span className="text-[13px] text-muted-foreground">{label}</span>
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
