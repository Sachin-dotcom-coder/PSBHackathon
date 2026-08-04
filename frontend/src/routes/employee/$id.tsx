import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useEmployee, useTimeline, useCollusion } from "@/hooks/usePhantomApi";
import { RiskBadge } from "@/components/phantom/RiskBadge";
import { TimelineChart } from "@/components/phantom/TimelineChart";
import { EngineDetailTabs } from "@/components/phantom/EngineDetailTabs";
import {
  TrustNumber,
  TrustDial,
  SubScore,
  ReasonLine,
  RecommendedPosture,
  type RiskState,
} from "@/components/phantom/PhantomUI";
import { SkeletonCard } from "@/components/phantom/LoadingSkeleton";
import type { RiskLevel } from "@/hooks/usePhantomApi";

export const Route = createFileRoute("/employee/$id")({
  head: () => ({
    meta: [
      { title: "Employee Profile — PHANTOM" },
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

function EmployeePage() {
  const { id } = useParams({ from: "/employee/$id" });
  const { data: employee, isLoading: eLoading } = useEmployee(id);
  const { data: timeline, isLoading: tLoading } = useTimeline(id);
  const { data: collusion } = useCollusion(id);

  const isLoading = eLoading || tLoading;

  const trust = employee ? Math.max(0, Math.min(100, Math.round(100 - employee.access_void_score))) : 0;
  const state: RiskState = employee ? riskToState(employee.risk) : "trusted";

  const initials = employee?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link to="/leaderboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Leaderboard
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
              <span className="text-mono text-[12px] font-semibold tracking-[0.18em]">PHANTOM</span>
              <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                / Employee / {id}
              </span>
            </div>
          </div>
          <Link
            to="/investigation"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] transition hover:bg-surface"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Investigate
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="mx-auto max-w-7xl grid gap-6 p-6 lg:grid-cols-3">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="lg:col-span-2 h-64" />
        </div>
      ) : !employee ? (
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
          Employee {id} not found.
        </div>
      ) : (
        <div className="mx-auto max-w-7xl p-6">
          {/* 3-column top layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* LEFT — Profile card */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border bg-background text-[18px] font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[18px] font-semibold leading-tight">{employee.name}</h1>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{employee.role}</div>
                    <div className="mt-1.5"><RiskBadge risk={employee.risk} /></div>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 text-[12px]">
                  {[
                    { label: "Branch",     value: employee.branch },
                    { label: "Employee ID", value: employee.employee_id },
                    { label: "Tenure",     value: employee.experience_years ? `${Math.floor(employee.experience_years)} yrs ${Math.round((employee.experience_years % 1) * 12)} mo` : "—" },
                    { label: "Cohort",     value: employee.cohort_id ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-mono text-[9.5px] uppercase tracking-widest text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 text-foreground truncate">{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Personality */}
                {employee.personality && (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="text-mono mb-3 text-[9.5px] uppercase tracking-widest text-muted-foreground">
                      Behavioral Profile
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                      {Object.entries(employee.personality)
                        .filter(([k]) => ["work_style", "risk_profile", "arrival_time", "leave_time"].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="rounded-md border border-border bg-background px-2.5 py-2">
                            <div className="text-[10px] text-muted-foreground capitalize">{k.replace("_", " ")}</div>
                            <div className="mt-0.5 font-medium text-foreground">{String(v)}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Composite score card */}
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="text-mono mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Composite Trust Score
                </div>
                <div className="flex items-center gap-4">
                  <TrustDial value={trust} state={state} />
                  <div>
                    <TrustNumber value={trust} />
                    <div className="text-mono mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                      /100 · {employee.risk}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER — 90-day timeline */}
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="text-mono mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>90-Day Behavioral Timeline</span>
                  <span>{timeline?.trend ?? ""}</span>
                </div>
                {timeline?.timeline?.length ? (
                  <TimelineChart
                    data={timeline.timeline}
                    events={timeline.events}
                    showPrimary={true}
                    showAVS={false}
                    height={240}
                  />
                ) : (
                  <div className="flex h-[240px] items-center justify-center text-[12px] text-muted-foreground">
                    No timeline data available
                  </div>
                )}
                {/* Chart legend */}
                <div className="text-mono mt-3 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/70" /> Primary</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Audit</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Compliance</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /> Override</span>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="rounded-xl border border-border bg-surface-2 p-6">
                <div className="text-mono mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Engine Score Breakdown
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <SubScore label="Chain (E1)"     value={employee.chain_score} />
                  <SubScore label="Avoidance (E2)" value={employee.access_void_score} />
                  <SubScore label="Collusion (E3)" value={employee.collusion_score} />
                  <SubScore label="Language (E4)"  value={employee.language_score} />
                </div>

                {/* AI Reasons */}
                {employee.reasons?.length > 0 && (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="text-mono mb-3 text-[9.5px] uppercase tracking-widest text-muted-foreground">
                      AI Findings
                    </div>
                    <div className="space-y-2">
                      {employee.reasons.map((r, i) => (
                        <ReasonLine key={i} text={r} delay={i * 0.15} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended action */}
                <div className="mt-5 border-t border-border pt-4">
                  <div className="text-mono mb-2 text-[9.5px] uppercase tracking-widest text-muted-foreground">
                    Recommended Action
                  </div>
                  <RecommendedPosture state={state} />
                </div>
              </div>
            </div>
          </div>

          {/* Engine detail tabs (full width) */}
          <div className="mt-6">
            <EngineDetailTabs
              employee={employee}
              timeline={timeline}
              collusion={collusion}
            />
          </div>
        </div>
      )}
    </main>
  );
}
