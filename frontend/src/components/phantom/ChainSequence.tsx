/**
 * PHANTOM — ChainSequence
 * Displays Engine 1's action sequence step-by-step, matching Day3Viz style.
 */

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

const TARGET_SEQUENCE = [
  "LOOKUP",
  "BALANCE_CHECK",
  "TRANSACTION_HISTORY",
  "REPORT_EXPORT",
];

const STEP_LABELS: Record<string, string> = {
  LOOKUP:               "Customer Record Lookup",
  BALANCE_CHECK:        "Balance Check",
  TRANSACTION_HISTORY:  "Transaction History",
  REPORT_EXPORT:        "Report Export",
};

interface ChainSequenceProps {
  /** Normalised action tokens from Engine 1 (uppercase) */
  actions?: string[];
  /** Engine 1 chain score 0-100 */
  score: number;
}

export function ChainSequence({ actions, score }: ChainSequenceProps) {
  // Show target sequence if no raw actions — score tells us how matched it is
  const steps = actions?.length ? actions.slice(0, 6) : TARGET_SEQUENCE;

  return (
    <div>
      <div className="text-[13px] text-foreground">
        Access sequence detected — scoring against known pre-exfiltration pattern.
      </div>
      <div className="mt-5 space-y-2">
        {steps.map((step, i) => {
          const isTarget = TARGET_SEQUENCE.includes(step);
          return (
            <motion.div
              key={`${step}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.12 }}
              className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
                isTarget
                  ? "border-foreground/20 bg-background"
                  : "border-border bg-background"
              }`}
            >
              <span className="text-mono w-6 text-[11px] tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-[13.5px] text-foreground">
                {STEP_LABELS[step] ?? step.replace(/_/g, " ")}
              </span>
              {isTarget && (
                <span className="text-mono text-[9.5px] uppercase tracking-widest text-foreground/50">
                  Flagged
                </span>
              )}
              {i < steps.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="text-mono mt-4 rounded-md border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
        Pattern match against known fraud sequences:{" "}
        <span className={`font-semibold ${score >= 60 ? "text-[color:var(--color-critical)]" : "text-foreground"}`}>
          {score}%
        </span>
      </div>
    </div>
  );
}
