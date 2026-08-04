/**
 * PHANTOM — Shared components extracted from investigation.tsx
 * TrustNumber, TrustDial, SubScore, StateBadge, Typewriter,
 * ReasonLine, RecommendedPosture, CountUp
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useMotionValue, animate } from "motion/react";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export type RiskState = "trusted" | "elevated" | "critical";

// ---------------------------------------------------------------------------
// TrustNumber — animated counter
// ---------------------------------------------------------------------------
export function TrustNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] });
    const u = mv.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      c.stop();
      u();
    };
  }, [value, mv]);
  return (
    <span className="text-mono text-[56px] font-bold leading-none tracking-tight tabular-nums">
      {display}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TrustDial — 270° arc SVG gauge
// ---------------------------------------------------------------------------
export function TrustDial({
  value,
  state,
}: {
  value: number;
  state: RiskState;
}) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const offset = arc * (1 - value / 100);
  const stroke = state === "critical" ? "var(--color-critical)" : "#FFFFFF";
  return (
    <div className="relative h-[120px] w-[120px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-[135deg]">
        <circle
          cx="60" cy="60" r={r}
          stroke="#262626" strokeWidth="6" fill="none"
          strokeDasharray={`${arc} ${c}`} strokeLinecap="round"
        />
        <motion.circle
          cx="60" cy="60" r={r}
          stroke={stroke} strokeWidth="6" fill="none"
          strokeDasharray={`${arc} ${c}`} strokeLinecap="round"
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Score
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubScore — single engine score card
// ---------------------------------------------------------------------------
export function SubScore({
  label,
  value,
  onClick,
  active,
}: {
  label: string;
  value: number | null;
  onClick?: () => void;
  active?: boolean;
}) {
  const isEmpty = value === null || value === undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full rounded-md border text-left transition p-3 ${
        active
          ? "border-foreground bg-surface-2 ring-1 ring-foreground/30"
          : onClick
          ? "border-border bg-background hover:border-foreground/40 hover:bg-surface/50 cursor-pointer"
          : "border-border bg-background cursor-default"
      }`}
    >
      <div className="text-mono mb-2 flex items-center justify-between text-[9.5px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
      </div>
      <div className="flex items-baseline justify-between">
        {isEmpty ? (
          <span className="text-mono text-[18px] font-semibold tabular-nums text-muted-foreground/50">
            —
          </span>
        ) : (
          <>
            <span className="text-mono text-[18px] font-semibold tabular-nums">
              {value}
            </span>
            <span className="text-mono text-[9px] text-muted-foreground">/100</span>
          </>
        )}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        {!isEmpty && (
          <motion.div
            className={`h-full ${(value ?? 0) >= 70 ? "bg-[color:var(--color-critical)]" : "bg-foreground"}`}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// StateBadge — risk level badge
// ---------------------------------------------------------------------------
export function StateBadge({ state }: { state: RiskState }) {
  const map: Record<RiskState, { label: string; cls: string }> = {
    trusted: { label: "Trusted", cls: "border-border bg-surface text-muted-foreground" },
    elevated: { label: "Elevated", cls: "border-foreground/30 bg-surface text-foreground" },
    critical: { label: "Critical", cls: "border-[color:var(--color-critical)]/40 bg-[color:var(--color-critical)]/10 text-[color:var(--color-critical)]" },
  };
  const { label, cls } = map[state];
  return (
    <span className={`text-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] uppercase tracking-widest ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Typewriter — character-by-character text reveal
// ---------------------------------------------------------------------------
export function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [text]);
  return (
    <span>
      {text.slice(0, n)}
      <span className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[2px] animate-pulse bg-foreground align-middle" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// ReasonLine — animated bullet point
// ---------------------------------------------------------------------------
export function ReasonLine({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
    >
      <span className="text-mono mt-1 text-[10px] text-foreground/50">›</span>
      <span>{text}</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// RecommendedPosture — action recommendation block
// ---------------------------------------------------------------------------
export function RecommendedPosture({ state }: { state: RiskState }) {
  const map: Record<RiskState, { icon: React.ReactNode; title: string; body: string }> = {
    trusted: {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "Monitor · Passive logging",
      body: "No action needed. Background monitoring continues silently.",
    },
    elevated: {
      icon: <ShieldAlert className="h-4 w-4" />,
      title: "Alert · Notify security team",
      body: "Require manager approval for high-value transactions. Extended session recording active.",
    },
    critical: {
      icon: <ShieldX className="h-4 w-4" />,
      title: "Act · Freeze session",
      body: "Lock account for human review. Evidence package and audit trail auto-generated.",
    },
  };
  const { icon, title, body } = map[state];
  return (
    <div>
      <div className={`flex items-center gap-2 text-[13px] font-semibold text-foreground`}>
        <span className={state === "critical" ? "text-[color:var(--color-critical)]" : "text-foreground"}>
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CountUp — animated floating-point counter
// ---------------------------------------------------------------------------
export function CountUp({
  from = 0,
  to,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  from?: number;
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const mv = useMotionValue(from);
  const [v, setV] = useState(from);
  useEffect(() => {
    const c = animate(mv, to, { duration, ease: [0.2, 0.8, 0.2, 1] });
    const u = mv.on("change", (x) => setV(x));
    return () => {
      c.stop();
      u();
    };
  }, [to, duration, mv]);
  return (
    <span className={className}>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}
