/**
 * PHANTOM — NLPScorer (Engine 4)
 * Displays live Engine 4 NLP language analysis: category breakdown,
 * detected keywords, and interactive justification note testing.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Send, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { useScoreText, type NLPDetails } from "@/hooks/usePhantomApi";

interface NLPScorerProps {
  nlpDetails?: NLPDetails;
  employeeId?: string;
}

const CATEGORIES = [
  { key: "authority",           label: "Authority Injection",  color: "#a855f7" },
  { key: "policy_bypass",       label: "Policy Bypass",        color: "#E5484D" },
  { key: "urgency",             label: "Urgency",              color: "#f97316" },
  { key: "vagueness",           label: "Vagueness",            color: "#facc15" },
  { key: "responsibility_shift",label: "Responsibility Shift", color: "var(--cyan)" },
];

export function NLPScorer({ nlpDetails, employeeId }: NLPScorerProps) {
  const [customText, setCustomText] = useState("");
  const { mutate: scoreText, data: liveResult, isPending } = useScoreText();

  // Use employee's nlpDetails if provided, or live scored result
  const activeNlp = liveResult ?? nlpDetails;
  const langScore = activeNlp?.language_score ?? 0;

  const handleTestNote = () => {
    if (!customText.trim()) return;
    scoreText(customText.trim());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[16px] font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-[color:var(--emerald)]" />
            Engine 4 — Language Risk Scanner
          </div>
          <div className="text-[12px] text-muted-foreground">
            Scans manager override notes for urgency, authority abuse, and policy bypass language.
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-mono text-[28px] font-bold leading-none"
            style={{ color: langScore >= 70 ? "#E5484D" : langScore >= 40 ? "#f97316" : "var(--emerald)" }}
          >
            {langScore.toFixed(0)}
          </div>
          <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Language Score / 100
          </div>
        </div>
      </div>

      {/* Scored NLP Categories */}
      {activeNlp ? (
        <div className="rounded-xl border border-border bg-surface-2 p-5 space-y-4">
          <div className="text-[14px] font-semibold text-foreground">Detected Evasion Indicators</div>
          <div className="space-y-3">
            {CATEGORIES.map(({ key, label, color }) => {
              const val = (activeNlp as unknown as Record<string, number>)[key] ?? 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-mono font-bold" style={{ color: val >= 50 ? color : "var(--muted-foreground)" }}>
                      {val}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Keywords */}
          {activeNlp.top_keywords?.length ? (
            <div className="border-t border-border pt-3">
              <div className="text-mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                Flagged Risk Keywords
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeNlp.top_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-mono rounded-full border border-[color:var(--emerald)]/30 bg-[color:var(--emerald)]/10 px-2.5 py-0.5 text-[11px] text-[color:var(--emerald)]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface/40 p-4 text-[13px] text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>No historical manager override note on record for {employeeId ?? "this employee"}. You can test a sample note below.</span>
        </div>
      )}

      {/* Live Note Test Box */}
      <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
        <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Test Custom Justification Note
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTestNote()}
            placeholder="Type a justification note e.g. 'Urgent director approval to bypass verification'..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-[color:var(--emerald)] focus:outline-none"
          />
          <button
            onClick={handleTestNote}
            disabled={!customText.trim() || isPending}
            className="flex items-center gap-1.5 rounded-lg bg-[color:var(--emerald)] px-4 py-2 text-[13px] font-bold text-background transition hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Test Note
          </button>
        </div>
      </div>
    </div>
  );
}
