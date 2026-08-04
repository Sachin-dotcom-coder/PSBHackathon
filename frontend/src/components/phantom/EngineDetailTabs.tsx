/**
 * PHANTOM — EngineDetailTabs
 * Tabbed panel showing per-engine detail for an employee.
 * E1: Chain Sequence, E2: Access Void, E3: Collusion Graph, E4: Placeholder
 */

import { useState } from "react";
import { ChainSequence } from "./ChainSequence";
import { CollusionGraph } from "./CollusionGraph";
import { NLPScorer } from "./NLPScorer";
import { TimelineChart } from "./TimelineChart";
import type {
  EmployeeDetail,
  EmployeeTimeline,
  CollusionGraph as CollusionData,
} from "@/hooks/usePhantomApi";

const TABS = [
  { id: "chain",     label: "01 / Chain",     engine: "Engine 1" },
  { id: "avoidance", label: "02 / Avoidance",  engine: "Engine 2" },
  { id: "collusion", label: "03 / Collusion",  engine: "Engine 3" },
  { id: "language",  label: "04 / Language",   engine: "Engine 4" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface EngineDetailTabsProps {
  employee: EmployeeDetail;
  timeline?: EmployeeTimeline;
  collusion?: CollusionData;
}

export function EngineDetailTabs({
  employee,
  timeline,
  collusion,
}: EngineDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chain");

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 px-5 py-3 text-left transition ${
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
              }`}
            >
              <div className="text-mono text-[10px] uppercase tracking-widest">
                {tab.label}
              </div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                {tab.engine}
              </div>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "chain" && (
          <ChainSequence score={employee.chain_score} />
        )}

        {activeTab === "avoidance" && (
          <div className="space-y-4">
            <div className="text-[13px] text-foreground">
              90-day oversight module access trend — detecting strategic avoidance.
            </div>
            {timeline?.timeline?.length ? (
              <TimelineChart
                data={timeline.timeline}
                events={timeline.events}
                showPrimary={false}
                showAVS={true}
                height={220}
              />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[12px] text-muted-foreground">
                No timeline data
              </div>
            )}
            {/* Key stats */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {employee.reasons?.slice(0, 3).map((r, i) => (
                <div key={i} className="rounded-md border border-border bg-surface/40 p-3">
                  <div className="text-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                    Finding {i + 1}
                  </div>
                  <div className="text-foreground/80 leading-snug">{r}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "collusion" && (
          <div className="space-y-4">
            <div className="text-[13px] text-foreground">
              Connected access patterns — detecting coordinated module access within 2-hour windows.
            </div>
            {collusion ? (
              <>
                <CollusionGraph
                  nodes={collusion.graph.nodes}
                  links={collusion.graph.links}
                  focusEmployeeId={employee.employee_id}
                />
                <div className="text-mono rounded-md border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
                  Collusion Score:{" "}
                  <span className={`font-semibold ${collusion.collusion_score >= 50 ? "text-[color:var(--color-critical)]" : "text-foreground"}`}>
                    {collusion.collusion_score}/100
                  </span>
                  <span className="ml-3">
                    · {collusion.graph.nodes.filter((n) => n.type === "record").length} shared modules
                    · {collusion.graph.nodes.filter((n) => n.type === "employee" && n.id !== employee.employee_id).length} co-accessors
                  </span>
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[12px] text-muted-foreground">
                Loading collusion data…
              </div>
            )}
          </div>
        )}

        {activeTab === "language" && <NLPScorer />}
      </div>
    </div>
  );
}
