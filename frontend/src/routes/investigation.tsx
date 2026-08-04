import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "motion/react";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Lock,
  FileCheck2,
  Gavel,
  AlertTriangle,
  Activity,
  ChevronDown,
} from "lucide-react";
import {
  useEmployee,
  useTimeline,
  useLeaderboard,
  useCollusion,
  type EmployeeDetail,
  type EmployeeTimeline,
  type TimelineEvent,
  type RiskLevel,
} from "@/hooks/usePhantomApi";
import { TimelineChart } from "@/components/phantom/TimelineChart";
import { CollusionGraph } from "@/components/phantom/CollusionGraph";
import { ChainSequence } from "@/components/phantom/ChainSequence";
import { NLPScorer } from "@/components/phantom/NLPScorer";
import { SkeletonCard, OfflineBanner } from "@/components/phantom/LoadingSkeleton";
import { RiskBadge } from "@/components/phantom/RiskBadge";
import {
  TrustNumber,
  TrustDial,
  SubScore,
  StateBadge,
  Typewriter,
  ReasonLine,
  RecommendedPosture,
  CountUp,
  type RiskState,
} from "@/components/phantom/PhantomUI";

export const Route = createFileRoute("/investigation")({
  head: () => ({
    meta: [
      { title: "Investigation Center — PHANTOM" },
      { name: "description", content: "Live AI investigation of insider threat indicators." },
    ],
  }),
  component: Investigation,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskToState(risk: RiskLevel): RiskState {
  if (risk === "Critical") return "critical";
  if (risk === "High" || risk === "Medium") return "elevated";
  return "trusted";
}

function trustFromAVS(avs: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - avs)));
}

const EVENT_DOT_COLOR: Record<string, string> = {
  audit_zero:     "bg-[color:var(--color-critical)]",
  compliance_zero:"bg-orange-400",
  decline_start:  "bg-blue-400",
  risk_escalation:"bg-[color:var(--color-critical)]",
};

// ---------------------------------------------------------------------------
// Main Investigation component
// ---------------------------------------------------------------------------

function Investigation() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("EMP001");
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [showCritical, setShowCritical] = useState(false);

  const { data: employee, isLoading: empLoading, isError: empError } = useEmployee(selectedEmployeeId);
  const { data: timeline, isLoading: tlLoading } = useTimeline(selectedEmployeeId);
  const { data: leaderboard } = useLeaderboard();

  const isLoading = empLoading || tlLoading;
  const isOffline = empError;

  // Derive active event data
  const activeEvent: TimelineEvent | null = useMemo(() => {
    if (selectedEventIndex === null || !timeline?.events) return null;
    return timeline.events[selectedEventIndex] ?? null;
  }, [selectedEventIndex, timeline?.events]);

  // Trust score
  const trust = employee ? trustFromAVS(employee.access_void_score) : 100;
  const state = employee ? riskToState(employee.risk) : "trusted";

  // Derive insight text from active event or default
  const insightText = useMemo(() => {
    if (!activeEvent || !employee) {
      return employee
        ? `${employee.name} is currently rated ${employee.risk} risk. ${employee.reasons?.[0] ?? ""}`
        : "Loading investigation data...";
    }
    return activeEvent.label;
  }, [activeEvent, employee]);

  // Reasons to show
  const reasons = useMemo(() => {
    if (!employee) return [];
    return employee.reasons?.slice(0, 4) ?? [];
  }, [employee]);

  // Handle risk escalation event click → show critical overlay
  const handleEventSelect = (idx: number) => {
    const ev = timeline?.events?.[idx];
    setSelectedEventIndex(idx);
    if (ev?.type === "risk_escalation" && (employee?.access_void_score ?? 0) >= 60) {
      setTimeout(() => setShowCritical(true), 600);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <TopBar
        employee={employee}
        leaderboard={leaderboard ?? []}
        selectedId={selectedEmployeeId}
        onSelect={(id) => {
          setSelectedEmployeeId(id);
          setSelectedEventIndex(null);
          setShowCritical(false);
        }}
        isOffline={!!isOffline}
      />

      <div className="grid grid-cols-12 gap-px bg-border/60">
        {/* LEFT — Subject + Event Timeline */}
        <aside className="col-span-12 bg-background p-6 lg:col-span-3 lg:min-h-[calc(100vh-65px)]">
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : employee ? (
            <>
              <SubjectCard employee={employee} />
              <EventTimeline
                events={timeline?.events ?? []}
                selectedIndex={selectedEventIndex}
                onSelect={handleEventSelect}
              />
            </>
          ) : (
            <OfflineBanner />
          )}
        </aside>

        {/* CENTER — Live Risk Analysis */}
        <section className="col-span-12 bg-background p-6 lg:col-span-6">
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard className="h-48" />
              <SkeletonCard className="h-64" />
            </div>
          ) : employee ? (
            <LiveRiskPanel
              employee={employee}
              timeline={timeline}
              activeEvent={activeEvent}
              trust={trust}
              state={state}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <OfflineBanner />
            </div>
          )}
        </section>

        {/* RIGHT — AI Reasoning */}
        <aside className="col-span-12 bg-background p-6 lg:col-span-3 lg:min-h-[calc(100vh-65px)]">
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : employee ? (
            <AiReasoning
              key={`${selectedEmployeeId}-${selectedEventIndex}`}
              insightText={insightText}
              reasons={reasons}
              state={state}
              engineName={activeEvent ? activeEvent.label : "Behavioral Analysis"}
            />
          ) : null}
        </aside>
      </div>

      <AnimatePresence>
        {showCritical && employee && (
          <CriticalIntervention
            employee={employee}
            trust={trust}
            onClose={() => setShowCritical(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

function TopBar({
  employee,
  leaderboard,
  selectedId,
  onSelect,
  isOffline,
}: {
  employee?: EmployeeDetail;
  leaderboard: EmployeeDetail[];
  selectedId: string;
  onSelect: (id: string) => void;
  isOffline: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span className="text-mono text-[12px] font-semibold tracking-[0.18em]">PHANTOM</span>
            <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              / Investigation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isOffline && (
            <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              ⚠ Offline
            </span>
          )}

          {/* Live indicator */}
          <div className="hidden items-center gap-1.5 text-mono text-[11px] uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground/80" />
            </span>
            Live
          </div>

          {/* Employee selector */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] transition hover:bg-secondary"
            >
              <span className="text-mono max-w-[160px] truncate">
                {employee?.name ?? selectedId}
              </span>
              {employee && <RiskBadge risk={employee.risk} size="xs" />}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-surface-2 shadow-xl">
                <div className="text-mono border-b border-border px-3 py-2 text-[9.5px] uppercase tracking-widest text-muted-foreground">
                  Select Employee
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {leaderboard.slice(0, 20).map((emp) => (
                    <button
                      key={emp.employee_id}
                      onClick={() => { onSelect(emp.employee_id); setOpen(false); }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-surface ${
                        emp.employee_id === selectedId ? "bg-surface" : ""
                      }`}
                    >
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{emp.name}</div>
                        <div className="text-[11px] text-muted-foreground">{emp.role} · {emp.branch}</div>
                      </div>
                      <RiskBadge risk={emp.risk} size="xs" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// SubjectCard
// ---------------------------------------------------------------------------

function SubjectCard({ employee }: { employee: EmployeeDetail }) {
  const initials = employee.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tenureText = employee.experience_years
    ? `${Math.floor(employee.experience_years)} yrs ${Math.round((employee.experience_years % 1) * 12)} mo`
    : "—";

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-5">
      <div className="text-mono mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Subject · Under Review
      </div>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-background text-sm font-semibold">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{employee.name}</div>
          <div className="text-[12px] text-muted-foreground">{employee.role}</div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <dt className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Branch</dt>
          <dd className="mt-0.5 text-foreground">{employee.branch}</dd>
        </div>
        <div>
          <dt className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Risk Level</dt>
          <dd className="mt-0.5"><RiskBadge risk={employee.risk} /></dd>
        </div>
        <div>
          <dt className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tenure</dt>
          <dd className="mt-0.5 text-foreground">{tenureText}</dd>
        </div>
        <div>
          <dt className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Cohort</dt>
          <dd className="mt-0.5 text-foreground truncate">{employee.cohort_id ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventTimeline — left sidebar event list
// ---------------------------------------------------------------------------

function EventTimeline({
  events,
  selectedIndex,
  onSelect,
}: {
  events: TimelineEvent[];
  selectedIndex: number | null;
  onSelect: (i: number) => void;
}) {
  if (!events.length) {
    return (
      <div className="mt-6">
        <div className="text-mono mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Timeline Milestones
        </div>
        <p className="text-[12px] text-muted-foreground">No significant events detected for this employee.</p>
      </div>
    );
  }

  // Sort events chronologically
  const sorted = [...events].sort((a, b) => a.day - b.day);

  return (
    <div className="mt-6">
      <div className="text-mono mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Timeline Milestones
      </div>
      <ol className="relative space-y-1">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        {sorted.map((ev, i) => {
          const active = selectedIndex === i;
          const dotColor = EVENT_DOT_COLOR[ev.type] ?? "bg-foreground/30";
          // Approximate date (2026-01-01 + day)
          const d = new Date("2026-01-01");
          d.setDate(d.getDate() + ev.day);
          const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

          return (
            <li key={i}>
              <button
                onClick={() => onSelect(i)}
                className={`group relative flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-foreground/30 bg-surface-2"
                    : "border-transparent hover:border-border hover:bg-surface"
                }`}
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ring-4 ring-background ${dotColor}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {dateStr} · Day {ev.day}
                    </span>
                  </div>
                  <div className={`mt-0.5 text-[12.5px] ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {ev.label}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LiveRiskPanel
// ---------------------------------------------------------------------------

function LiveRiskPanel({
  employee,
  timeline,
  activeEvent,
  trust,
  state,
}: {
  employee: EmployeeDetail;
  timeline?: EmployeeTimeline;
  activeEvent: TimelineEvent | null;
  trust: number;
  state: RiskState;
}) {
  const [activeEngine, setActiveEngine] = useState<"avoidance" | "collusion" | "chain" | "language">("avoidance");
  const { data: collusion } = useCollusion(employee.employee_id);

  return (
    <div className="space-y-5">
      {/* Trust score header */}
      <div className="rounded-lg border border-border bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-mono mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Trust Score · Live
            </div>
            <div className="flex items-baseline gap-3">
              <TrustNumber value={trust} />
              <StateBadge state={state} />
            </div>
            <p className="mt-3 max-w-md text-[13px] text-muted-foreground">
              {employee.reasons?.[0] ?? `${employee.name} is currently rated ${employee.risk} risk.`}
            </p>
          </div>
          <TrustDial value={trust} state={state} />
        </div>

        {/* Sub scores (interactive buttons) */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          <SubScore
            label="Chain"
            value={employee.chain_score}
            active={activeEngine === "chain"}
            onClick={() => setActiveEngine("chain")}
          />
          <SubScore
            label="Avoidance"
            value={employee.access_void_score}
            active={activeEngine === "avoidance"}
            onClick={() => setActiveEngine("avoidance")}
          />
          <SubScore
            label="Collusion"
            value={employee.collusion_score}
            active={activeEngine === "collusion"}
            onClick={() => setActiveEngine("collusion")}
          />
          <SubScore
            label="Language"
            value={employee.language_score}
            active={activeEngine === "language"}
            onClick={() => setActiveEngine("language")}
          />
        </div>
      </div>

      {/* Main visualization container */}
      <div className="rounded-lg border border-border bg-surface-2 p-6">
        {/* Engine switcher tabs */}
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 overflow-x-auto text-mono text-[10.5px] uppercase tracking-widest">
            {[
              { id: "avoidance", label: "Timeline (E2)" },
              { id: "collusion", label: "Collusion Graph (E3)" },
              { id: "chain", label: "Action Chain (E1)" },
              { id: "language", label: "NLP Scanner (E4)" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveEngine(t.id as any)}
                className={`rounded-md px-2.5 py-1 transition ${
                  activeEngine === t.id
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Activity className="h-3 w-3" /> Live
          </span>
        </div>

        {/* Active visualization */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeEngine + (activeEvent?.type ?? "overview")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
          >
            {activeEngine === "avoidance" && (
              <>
                <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {activeEvent ? activeEvent.label : "90-Day Access Void Overview"}
                </div>
                {timeline?.timeline?.length ? (
                  <TimelineChart
                    data={activeEvent ? getEventSlice(timeline, activeEvent) : timeline.timeline}
                    events={activeEvent ? [activeEvent] : timeline.events}
                    showPrimary={!activeEvent || activeEvent.type === "decline_start"}
                    showAVS={activeEvent?.type === "risk_escalation"}
                    height={240}
                  />
                ) : (
                  <div className="flex h-[240px] items-center justify-center text-[12px] text-muted-foreground">
                    Timeline data loading…
                  </div>
                )}
                {/* Chart legend */}
                <div className="text-mono mt-3 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Audit</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Compliance</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /> Override</span>
                  {activeEvent?.type === "risk_escalation" && (
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--color-critical)]" /> AVS</span>
                  )}
                </div>
              </>
            )}

            {activeEngine === "collusion" && (
              <div>
                <div className="text-mono mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Engine 3 · Co-Access Network Topology</span>
                  <span className="text-foreground font-semibold">
                    Score: {employee.collusion_score}/100
                  </span>
                </div>
                <CollusionGraph
                  nodes={collusion?.graph?.nodes ?? []}
                  links={collusion?.graph?.links ?? []}
                  focusEmployeeId={employee.employee_id}
                />
                <div className="text-mono mt-3 flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-[10.5px] text-muted-foreground">
                  <span>
                    Shared modules: {collusion?.graph?.nodes?.filter((n) => n.type === "record").length ?? 0}
                  </span>
                  <span>
                    Co-accessors: {collusion?.graph?.nodes?.filter((n) => n.type === "employee" && n.id !== employee.employee_id).length ?? 0} employees
                  </span>
                </div>
              </div>
            )}

            {activeEngine === "chain" && (
              <div>
                <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Engine 1 · Pre-Exfiltration Behavior Sequence
                </div>
                <ChainSequence score={employee.chain_score} />
              </div>
            )}

            {activeEngine === "language" && (
              <div>
                <NLPScorer />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Get a ±20 day slice around an event for focused visualization */
function getEventSlice(timeline: EmployeeTimeline, event: TimelineEvent) {
  const start = Math.max(0, event.day - 15);
  const end   = Math.min(timeline.timeline.length, event.day + 20);
  return timeline.timeline.slice(start, end);
}

// ---------------------------------------------------------------------------
// AiReasoning
// ---------------------------------------------------------------------------

function AiReasoning({
  insightText,
  reasons,
  state,
  engineName,
}: {
  insightText: string;
  reasons: string[];
  state: RiskState;
  engineName: string;
}) {
  return (
    <div className="lg:sticky lg:top-[80px]">
      <div className="text-mono mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>AI Analysis</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1 w-1 animate-pulse rounded-full bg-foreground" /> Live
        </span>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-4">
        <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          {engineName}
        </div>
        <div className="text-[13.5px] leading-relaxed text-foreground">
          <Typewriter text={insightText} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {reasons.map((r, i) => (
          <ReasonLine key={`${i}-${r.slice(0, 20)}`} text={r} delay={0.3 + i * 0.4} />
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-background p-4">
        <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Recommended action
        </div>
        <RecommendedPosture state={state} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CriticalIntervention overlay
// ---------------------------------------------------------------------------

function CriticalIntervention({
  employee,
  trust,
  onClose,
}: {
  employee: EmployeeDetail;
  trust: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-[min(720px,92vw)] overflow-hidden rounded-2xl border border-border bg-surface-2 p-10"
      >
        {/* Scan line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <div
            className="h-px w-1/3 bg-gradient-to-r from-transparent via-[color:var(--color-critical)] to-transparent"
            style={{ animation: "phantom-scan 2.4s linear infinite" }}
          />
        </div>

        <div className="text-mono mb-6 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--color-critical)]">
          <AlertTriangle className="h-3.5 w-3.5" />
          Auto Response · Critical Threshold Crossed
        </div>

        <div className="grid grid-cols-1 items-end gap-6 sm:grid-cols-[auto_1fr]">
          <div>
            <div className="text-mono text-[12px] uppercase tracking-widest text-muted-foreground">
              Trust Score
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <CountUp
                from={100}
                to={trust}
                className="text-[120px] font-bold leading-none tracking-tighter text-[color:var(--color-critical)] tabular-nums"
                duration={1.0}
              />
            </div>
            <div className="text-mono mt-1 text-[12px] uppercase tracking-widest text-[color:var(--color-critical)]">
              Critical
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">{employee.name}</div>
          </div>

          <div className="space-y-2.5 text-[14px]">
            {[
              { icon: <Lock className="h-3.5 w-3.5" />, t: "Session Frozen" },
              { icon: <ShieldAlert className="h-3.5 w-3.5" />, t: "Human Review Initiated" },
              { icon: <FileCheck2 className="h-3.5 w-3.5" />, t: "Evidence Package Generated" },
              { icon: <Gavel className="h-3.5 w-3.5" />, t: "Compliance Audit Trail Created" },
              { icon: <ShieldCheck className="h-3.5 w-3.5" />, t: "Potential Fraud Prevented" },
            ].map((a, i) => (
              <motion.div
                key={a.t}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12 }}
                className="flex items-center gap-2.5 text-foreground"
              >
                <span className="grid h-5 w-5 place-items-center rounded-sm border border-border bg-background text-foreground">
                  {a.icon}
                </span>
                {a.t}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-10 flex items-end justify-between gap-6 border-t border-border pt-6"
        >
          <div>
            <div className="text-mono text-[10.5px] uppercase tracking-widest text-muted-foreground">
              Protected
            </div>
            <CountUp
              prefix="₹"
              suffix=" Cr"
              to={17.5}
              decimals={1}
              duration={1.8}
              className="text-[44px] font-semibold leading-none tracking-tight tabular-nums"
            />
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Dismiss
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
