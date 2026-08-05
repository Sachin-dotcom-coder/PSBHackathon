/**
 * PHANTOM — ChainSequence
 * Displays Engine 1's action sequence step-by-step per employee,
 * with dynamic tokens based on the employee's role and score.
 */

import { motion } from "motion/react";
import { ChevronRight, Activity, ShieldAlert } from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  LOOKUP:               "Customer Record Lookup",
  BALANCE_CHECK:        "Balance Check",
  TRANSACTION_HISTORY:  "Transaction History",
  REPORT_EXPORT:        "Report Export",
  LARGE_TRANSFER:       "High-Value Transfer",
  OVERRIDE_LOG:         "Manager Override Log",
  AUDIT_DISABLE:        "Audit Trail Suppression",
  CREDENTIAL_REFRESH:   "Credential Refresh",
  BULK_SEARCH:          "Bulk Customer Search",
};

const DEFAULT_SEQUENCES: Record<string, string[]> = {
  high: ["LOOKUP", "BALANCE_CHECK", "TRANSACTION_HISTORY", "OVERRIDE_LOG", "REPORT_EXPORT"],
  med:  ["BULK_SEARCH", "BALANCE_CHECK", "REPORT_EXPORT"],
  low:  ["LOOKUP", "BALANCE_CHECK", "TRANSACTION_HISTORY"],
};

interface ChainSequenceProps {
  /** Normalised action tokens from Engine 1 (uppercase) */
  actions?: string[];
  /** Engine 1 chain score 0-100 */
  score: number;
}

export function ChainSequence({ actions, score }: ChainSequenceProps) {
  const isHighRisk = score >= 70;
  const isMedRisk = score >= 35 && score < 70;

  // Use provided actions if available, or dynamic sequence based on score tier
  const sequenceKeys = actions?.length
    ? actions.slice(0, 6)
    : isHighRisk
    ? DEFAULT_SEQUENCES.high
    : isMedRisk
    ? DEFAULT_SEQUENCES.med
    : DEFAULT_SEQUENCES.low;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-foreground">
          Access sequence detected — scoring against known pre-exfiltration patterns.
        </div>
        <div
          className="text-mono text-[13px] font-bold"
          style={{ color: isHighRisk ? "#E5484D" : isMedRisk ? "#facc15" : "var(--cyan)" }}
        >
          Match: {score}%
        </div>
      </div>

      <div className="space-y-2">
        {sequenceKeys.map((step, i) => {
          const label = STEP_LABELS[step] ?? step.replace(/_/g, " ");
          const isFlagged = isHighRisk && i >= 2;

          return (
            <motion.div
              key={`${step}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.08 }}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 bg-surface-2 transition ${
                isFlagged ? "border-red-500/40 bg-red-500/5" : "border-border/60"
              }`}
            >
              <span className="text-mono w-6 text-[12px] tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-[13.5px] font-medium text-foreground">
                {label}
              </span>
              {isFlagged ? (
                <span className="text-mono flex items-center gap-1 text-[10px] uppercase font-bold text-[color:var(--critical)]">
                  <ShieldAlert className="h-3 w-3" /> Flagged
                </span>
              ) : (
                <span className="text-mono text-[10px] uppercase text-muted-foreground">
                  Nominal
                </span>
              )}
              {i < sequenceKeys.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="text-mono rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-[12px] flex items-center justify-between">
        <span className="text-muted-foreground">Pattern match score against known fraud sequences:</span>
        <span className={`font-bold text-[14px] ${isHighRisk ? "text-[color:var(--critical)]" : "text-foreground"}`}>
          {score} / 100
        </span>
      </div>
    </div>
  );
}
