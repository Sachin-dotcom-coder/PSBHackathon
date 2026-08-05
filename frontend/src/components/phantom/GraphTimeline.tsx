/**
 * GraphTimeline — Level 1: 15-day timeline node graph displayed as a 3-per-row grid
 * Sleek borderless card design with status badges & subtle hover glows
 */
import { motion } from "motion/react";
import type { GraphDayNode } from "@/hooks/usePhantomApi";
import { AlertTriangle, Users, Activity, ChevronRight, CheckCircle2, ShieldAlert } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  Critical: "#E5484D",
  High:     "#f97316",
  Medium:   "#facc15",
  Normal:   "var(--cyan)",
};

const RISK_STATUS_LABELS: Record<string, string> = {
  Critical: "Critical Threat",
  High:     "High Threat",
  Medium:   "Medium Risk",
  Normal:   "Normal / Clean",
};

interface Props {
  nodes: GraphDayNode[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export function GraphTimeline({ nodes, selectedDate, onSelectDate }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[20px] font-bold">15-Day Threat Timeline</div>
          <div className="text-[13px] text-muted-foreground">Select a day card to inspect employee co-access network and collusion risks</div>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          {[["Threat", "#E5484D"], ["Medium", "#facc15"], ["Normal / Clean", "var(--cyan)"]].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c as string }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* 3-column grid for 15 days */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {nodes.map((node, i) => {
          const isSelected = selectedDate === node.date;
          const color = RISK_COLORS[node.risk_level] ?? "var(--cyan)";
          const isHot = node.risk_level === "Critical" || node.risk_level === "High";
          const isMed = node.risk_level === "Medium";
          const statusLabel = RISK_STATUS_LABELS[node.risk_level] ?? "Normal / Clean";

          return (
            <motion.button
              key={node.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              onClick={() => onSelectDate(node.date)}
              className={`group relative flex flex-col justify-between rounded-xl p-5 text-left transition-all hover:scale-[1.02] bg-surface-2 ${
                isSelected ? "ring-2" : ""
              }`}
              style={{
                boxShadow: isSelected ? `0 0 24px ${color}30` : "0 4px 20px rgba(0,0,0,0.2)",
                ringColor: color,
                border: isSelected ? `1px solid ${color}` : `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              {/* Header: Day Index + Date */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Day {node.day_index + 1}
                  </div>
                  <div
                    className="text-[16px] font-bold tracking-tight mt-0.5"
                    style={{ color: isSelected ? color : "var(--foreground)" }}
                  >
                    {node.date}
                  </div>
                </div>

                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    background: `${color}12`,
                    color,
                    boxShadow: isHot ? `0 0 12px ${color}30` : undefined,
                  }}
                >
                  {isHot ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : isMed ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--cyan)]" />
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="my-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface/50 p-2.5">
                  <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Users className="h-3 w-3" /> Active Emps
                  </div>
                  <div className="text-mono text-[16px] font-bold text-foreground mt-1">
                    {node.active_employees}
                  </div>
                </div>

                <div className="rounded-lg bg-surface/50 p-2.5">
                  <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    Event Accesses
                  </div>
                  <div className="text-mono text-[16px] font-bold text-foreground mt-1">
                    {node.total_accesses}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <div
                  className="rounded-full px-3 py-1 text-mono text-[10px] uppercase tracking-widest font-bold"
                  style={{
                    background: `${color}15`,
                    color,
                    border: `1px solid ${color}35`,
                  }}
                >
                  {statusLabel}
                </div>

                <div className="flex items-center gap-1 text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">
                  Inspect <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Selected pulse line */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ border: `2px solid ${color}` }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
