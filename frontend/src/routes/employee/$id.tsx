import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Shield,
  Activity,
  Network,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
} from "lucide-react";
import { useEmployee, useTimeline, useCollusion } from "@/hooks/usePhantomApi";
import { RiskBadge } from "@/components/phantom/RiskBadge";
import { TimelineChart } from "@/components/phantom/TimelineChart";
import { AIInvestigationPanel } from "@/components/phantom/AIInvestigationPanel";
import {
  TrustNumber,
  TrustDial,
  SubScore,
  ReasonLine,
  RecommendedPosture,
  type RiskState,
} from "@/components/phantom/PhantomUI";
import { SkeletonCard } from "@/components/phantom/LoadingSkeleton";
import type { RiskLevel, NLPDetails } from "@/hooks/usePhantomApi";

export const Route = createFileRoute("/employee/$id")({
  head: () => ({
    meta: [
      { title: "Employee 360° Profile — PHANTOM" },
      { name: "description", content: "Forensic employee risk profile with 90-day behavioral timeline." },
    ],
  }),
  component: EmployeePage,
});

function riskToState(risk: RiskLevel): RiskState {
  if (risk === "Critical") return "critical";
  if (risk === "High" || risk === "Medium") return "elevated";
  return "trusted";
}

// NLP category badge colors
const NLP_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  authority:           { bg: "rgba(168,85,247,0.12)", text: "#a855f7", border: "rgba(168,85,247,0.3)" },
  policy_bypass:       { bg: "rgba(229,72,77,0.12)",  text: "#E5484D", border: "rgba(229,72,77,0.3)" },
  urgency:             { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
  vagueness:           { bg: "rgba(250,204,21,0.12)", text: "#facc15", border: "rgba(250,204,21,0.3)" },
  responsibility_shift: { bg: "rgba(0,242,254,0.10)", text: "#00f2fe", border: "rgba(0,242,254,0.25)" },
};

const NLP_CATEGORY_LABELS: Record<string, string> = {
  authority:           "Authority Injection",
  policy_bypass:       "Policy Bypass",
  urgency:             "Urgency",
  vagueness:           "Vagueness",
  responsibility_shift: "Responsibility Shift",
};

function NLPCategoryBar({ label, value, colorKey }: { label: string; value: number; colorKey: string }) {
  const colors = NLP_CATEGORY_COLORS[colorKey] ?? { bg: "rgba(255,255,255,0.08)", text: "#fff", border: "rgba(255,255,255,0.15)" };
  const isHigh = value >= 70;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <span
          className="text-mono text-[13px] font-bold"
          style={{ color: isHigh ? colors.text : "var(--muted-foreground)" }}
        >
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ background: colors.text }}
        />
      </div>
    </div>
  );
}

function Engine2XAICard({ reasons }: { reasons: string[] }) {
  return (
    <div
      className="rounded-xl border bg-surface-2 p-5"
      style={{ borderColor: "rgba(249,115,22,0.25)" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className="grid h-8 w-8 place-items-center rounded-md border"
          style={{ borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.1)", color: "#f97316" }}
        >
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[15px] font-bold text-foreground">Engine 2 — Access Void Analysis</div>
          <div className="text-mono text-[11px] text-muted-foreground">Deterministic XAI · Isolation Forest</div>
        </div>
      </div>
      <div className="space-y-2">
        {reasons.length === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-[color:var(--emerald)]">
            <CheckCircle className="h-4 w-4" />
            No anomaly indicators detected
          </div>
        ) : (
          reasons.map((reason, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="flex items-start gap-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              <span className="text-[13px] leading-relaxed text-foreground">{reason}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function Engine4NLPCard({ nlp }: { nlp: NLPDetails | undefined }) {
  if (!nlp) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-md border"
            style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "var(--emerald)" }}
          >
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[15px] font-bold">Engine 4 — NLP Justification Scanner</div>
            <div className="text-mono text-[11px] text-muted-foreground">No override note on record</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Info className="h-4 w-4" />
          No manager override note submitted for this employee.
        </div>
      </div>
    );
  }

  const categories = [
    { key: "authority",           val: nlp.authority ?? 0 },
    { key: "policy_bypass",       val: nlp.policy_bypass ?? 0 },
    { key: "urgency",             val: nlp.urgency ?? 0 },
    { key: "vagueness",           val: nlp.vagueness ?? 0 },
    { key: "responsibility_shift",val: nlp.responsibility_shift ?? 0 },
  ].filter(c => c.val > 0);

  const topKeywords = nlp.top_keywords ?? [];

  return (
    <div
      className="rounded-xl border bg-surface-2 p-5"
      style={{ borderColor: "rgba(16,185,129,0.2)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-md border"
            style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "var(--emerald)" }}
          >
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[15px] font-bold">Engine 4 — NLP Justification Scanner</div>
            <div className="text-mono text-[11px] text-muted-foreground">Language risk analysis</div>
          </div>
        </div>
        <div
          className="text-mono text-[22px] font-bold"
          style={{ color: (nlp.language_score ?? 0) >= 70 ? "#E5484D" : "var(--emerald)" }}
        >
          {nlp.language_score ?? 0}
        </div>
      </div>

      {/* Category scores */}
      {categories.length > 0 ? (
        <div className="space-y-3 mb-4">
          {categories.map(({ key, val }) => (
            <NLPCategoryBar
              key={key}
              label={NLP_CATEGORY_LABELS[key] ?? key}
              value={val}
              colorKey={key}
            />
          ))}
        </div>
      ) : (
        <div className="mb-4 text-[13px] text-muted-foreground">No significant risk categories detected.</div>
      )}

      {/* Keyword badges */}
      {topKeywords.length > 0 && (
        <div>
          <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Detected Keywords
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topKeywords.map(kw => {
              const cat = Object.entries(NLP_CATEGORY_LABELS).find(([, v]) => v.toLowerCase().includes(kw.toLowerCase()))?.[0];
              const colors = cat ? NLP_CATEGORY_COLORS[cat] : { bg: "rgba(255,255,255,0.06)", text: "#737373", border: "rgba(255,255,255,0.1)" };
              return (
                <span
                  key={kw}
                  className="text-mono rounded-full px-2.5 py-1 text-[11px] font-medium border"
                  style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                >
                  {kw}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeePage() {
  const { id } = useParams({ from: "/employee/$id" });
  const { data: employee, isLoading: eLoading } = useEmployee(id);
  const { data: timeline, isLoading: tLoading } = useTimeline(id);
  const { data: collusion } = useCollusion(id);
  const [activeTab, setActiveTab] = useState<"overview" | "engines">("overview");

  const isLoading = eLoading || tLoading;

  const trust = employee ? Math.max(0, Math.min(100, Math.round(100 - employee.access_void_score))) : 0;
  const state: RiskState = employee ? riskToState(employee.risk) : "trusted";

  const initials = employee?.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

  return (
    <main className="min-h-[calc(100vh-53px)] bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border bg-surface/30 px-6 py-4">
        <div className="w-full px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Leaderboard
            </Link>
            {employee && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="text-[13px] text-muted-foreground">
                  {employee.employee_id} · {employee.name}
                </div>
              </>
            )}
          </div>
          <Link
            to="/investigation"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-4 py-2 text-[13px] font-medium transition hover:bg-surface hover:border-[color:var(--cyan)]"
          >
            <Network className="h-3.5 w-3.5" />
            Graph Visualizer
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full grid gap-6 p-10 lg:grid-cols-3">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="lg:col-span-2 h-72" />
        </div>
      ) : !employee ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="text-[18px] font-semibold text-foreground mb-2">Employee Not Found</div>
            <div className="text-[14px] text-muted-foreground mb-4">ID: {id}</div>
            <Link to="/leaderboard" className="text-[color:var(--cyan)] hover:underline text-[13px]">
              ← Back to leaderboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full p-10">
          {/* TOP ROW: Profile + Score + Timeline */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            {/* LEFT — Profile card */}
            <div className="space-y-4">
              {/* Profile */}
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="flex items-start gap-4">
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border text-[20px] font-bold"
                    style={
                      state === "critical"
                        ? { borderColor: "rgba(229,72,77,0.4)", background: "rgba(229,72,77,0.08)", color: "#E5484D" }
                        : { borderColor: "var(--border)", background: "var(--surface-2)" }
                    }
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[22px] font-bold leading-tight">{employee.name}</h1>
                    <div className="mt-0.5 text-[14px] text-muted-foreground">{employee.role}</div>
                    <div className="mt-2"><RiskBadge risk={employee.risk} /></div>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { label: "Branch",      value: employee.branch },
                    { label: "Employee ID", value: employee.employee_id },
                    { label: "Tenure",      value: employee.experience_years ? `${Math.floor(employee.experience_years)} yrs ${Math.round((employee.experience_years % 1) * 12)} mo` : "—" },
                    { label: "Cohort",      value: employee.cohort_id ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-2">
                      <dt className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 text-[13px] font-medium text-foreground truncate">{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Personality */}
                {employee.personality && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="text-mono mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Behavioral Profile
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.entries(employee.personality)
                        .filter(([k]) => ["work_style", "risk_profile", "typing_speed", "break_pattern"].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-[13px]">
                            <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                            <span className="font-medium text-foreground">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Trust Score */}
              <div className="rounded-xl border border-border bg-surface-2 p-5">
                <div className="text-mono mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Composite Trust Score
                </div>
                <div className="flex items-center gap-4">
                  <TrustDial value={trust} state={state} />
                  <div>
                    <TrustNumber value={trust} />
                    <div className="text-mono mt-1 text-[12px] uppercase tracking-widest text-muted-foreground">
                      /100 · {employee.risk}
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <RecommendedPosture state={state} />
                </div>
              </div>
            </div>

            {/* RIGHT — 90-day timeline + Engine scores */}
            <div className="space-y-4">
              {/* 90-Day Timeline */}
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[18px] font-bold">90-Day Risk History</div>
                    <div className="text-[13px] text-muted-foreground">{timeline?.trend ?? ""}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {timeline?.timeline?.length ?? 0} days tracked
                  </div>
                </div>
                {timeline?.timeline?.length ? (
                  <TimelineChart
                    data={timeline.timeline}
                    events={timeline.events}
                    showPrimary={true}
                    showAVS={false}
                    height={200}
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-[13px] text-muted-foreground">
                    No timeline data available
                  </div>
                )}
                <div className="text-mono mt-3 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/70" /> Primary</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Audit</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Compliance</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /> Override</span>
                </div>
              </div>

              {/* Engine Score Breakdown */}
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="mb-4 text-[18px] font-bold">Engine Score Breakdown</div>
                <div className="grid grid-cols-4 gap-3">
                  <SubScore label="Chain (E1)"     value={employee.chain_score} />
                  <SubScore label="Avoidance (E2)" value={employee.access_void_score} />
                  <SubScore label="Collusion (E3)" value={employee.collusion_score} />
                  <SubScore label="Language (E4)"  value={employee.language_score} />
                </div>

                {/* AI Findings */}
                {employee.reasons?.length > 0 && (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="text-mono mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                      AI Findings
                    </div>
                    <div className="space-y-1.5">
                      {employee.reasons.map((r, i) => (
                        <ReasonLine key={i} text={r} delay={i * 0.1} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ENGINE DEEP-DIVE SECTION */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Engine 2 XAI Card */}
            <Engine2XAICard reasons={employee.reasons ?? []} />
            {/* Engine 4 NLP Card */}
            <Engine4NLPCard nlp={employee.nlp_details} />
          </div>

          {/* AI INVESTIGATION REPORT PANEL */}
          <div className="mt-6">
            <AIInvestigationPanel employee={employee} timeline={timeline} />
          </div>

        </div>
      )}
    </main>
  );
}
