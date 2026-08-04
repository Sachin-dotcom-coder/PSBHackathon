/**
 * PHANTOM — RiskBadge component
 * Colored pill badge for risk levels from the API.
 */

import type { RiskLevel } from "@/hooks/usePhantomApi";

const RISK_STYLES: Record<RiskLevel, { cls: string; dot: string }> = {
  Normal:   { cls: "border-border text-muted-foreground",                                      dot: "bg-muted-foreground/50" },
  Low:      { cls: "border-border text-foreground/60",                                         dot: "bg-foreground/40" },
  Medium:   { cls: "border-foreground/30 text-foreground",                                     dot: "bg-foreground/80" },
  High:     { cls: "border-orange-500/40 bg-orange-500/10 text-orange-400",                    dot: "bg-orange-400" },
  Critical: { cls: "border-[color:var(--color-critical)]/40 bg-[color:var(--color-critical)]/10 text-[color:var(--color-critical)]", dot: "bg-[color:var(--color-critical)]" },
};

export function RiskBadge({ risk, size = "sm" }: { risk: RiskLevel; size?: "xs" | "sm" }) {
  const { cls, dot } = RISK_STYLES[risk] ?? RISK_STYLES.Normal;
  const textSize = size === "xs" ? "text-[9.5px]" : "text-[10.5px]";
  return (
    <span
      className={`text-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 uppercase tracking-widest ${textSize} ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {risk}
    </span>
  );
}
