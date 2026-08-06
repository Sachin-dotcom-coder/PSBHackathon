/**
 * ActionChain — Level 3: Timestamped action chain cards for one employee on one day
 * Scrollable container boxes to prevent page stretching.
 */
import { motion } from "motion/react";
import type { EmployeeDayActions } from "@/hooks/usePhantomApi";
import { Activity, Clock, Layers, AlertTriangle } from "lucide-react";

interface Props {
  data: EmployeeDayActions;
}

const MODULE_COLORS: Record<string, string> = {
  "Audit":        "#3b82f6",
  "Compliance":   "#8b5cf6",
  "Override":     "#f97316",
  "Transfer":     "#E5484D",
  "Customer":     "var(--emerald)",
  "Loan":         "#facc15",
  "Report":       "var(--cyan)",
};

function getModuleColor(module: string): string {
  for (const [key, color] of Object.entries(MODULE_COLORS)) {
    if (module.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "var(--muted-foreground)";
}

export function ActionChain({ data }: Props) {
  const chainRisk = data.chain_score;
  const isHighRisk = chainRisk >= 70;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[20px] font-bold">{data.employee_name}</div>
          <div className="text-[13px] text-muted-foreground">
            {data.employee_id} · {data.role} · {data.date}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Engine 1 Chain Score */}
          <div
            className="rounded-xl border px-4 py-2 text-center"
            style={{
              borderColor: isHighRisk ? "rgba(229,72,77,0.4)" : "rgba(0,242,254,0.2)",
              background: isHighRisk ? "rgba(229,72,77,0.08)" : "rgba(0,242,254,0.05)",
            }}
          >
            <div
              className="text-mono text-[24px] font-bold"
              style={{ color: isHighRisk ? "#E5484D" : "var(--cyan)" }}
            >
              {chainRisk}
            </div>
            <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Chain Score
            </div>
            <div className="text-mono text-[9px] text-muted-foreground">Engine 1</div>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-center">
            <div className="text-mono text-[24px] font-bold text-foreground">{data.total_actions}</div>
            <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Actions</div>
          </div>
        </div>
      </div>

      {/* Sequence tokens — Scrollable Box */}
      {data.sequence_tokens.length > 0 && (
        <div className="rounded-lg border border-border bg-surface/40 p-3">
          <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> Access Sequence</span>
            <span className="text-[10px] font-normal text-muted-foreground">{data.sequence_tokens.length} tokens</span>
          </div>
          <div className="max-h-[250px] overflow-y-auto pr-1 flex flex-wrap gap-1.5">
            {data.sequence_tokens.map((token, i) => (
              <motion.span
                key={`${token}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                className="text-mono rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                style={{ color: getModuleColor(token), borderColor: `${getModuleColor(token)}30` }}
              >
                {token}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* High risk warning */}
      {isHighRisk && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-[color:var(--critical)]" />
          <div>
            <div className="text-[14px] font-semibold text-[color:var(--critical)]">High-Risk Sequence Detected</div>
            <div className="text-[12px] text-muted-foreground">Engine 1 flagged this action chain as suspicious. Score: {chainRisk}/100</div>
          </div>
        </motion.div>
      )}

      {/* Timestamped Action Log — Scrollable Box */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-surface/60 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Timestamped Action Log — {data.date}
            </span>
          </div>
          <span className="text-mono text-[10px] text-muted-foreground">
            {data.actions.length} logs
          </span>
        </div>
        <div className="max-h-[350px] overflow-y-auto divide-y divide-border pr-1">
          {data.actions.map((action, i) => {
            const mColor = getModuleColor(action.module);
            return (
              <motion.div
                key={`${action.timestamp}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface/30 transition"
              >
                {/* Index */}
                <span className="text-mono text-[12px] tabular-nums text-muted-foreground w-6 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Module dot */}
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: mColor, boxShadow: `0 0 6px ${mColor}60` }}
                />

                {/* Module name */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-foreground truncate" style={{ color: mColor }}>
                    {action.module}
                  </div>
                  <div className="text-mono text-[11px] text-muted-foreground">
                    Action: {action.action} · Session: {action.session_id}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-mono text-[11px] text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {action.timestamp.slice(11, 19)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
