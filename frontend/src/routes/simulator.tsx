import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal,
  Zap,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Activity,
  Shield,
  Network,
  Loader2,
} from "lucide-react";
import { useScoreText, useEvaluate } from "@/hooks/usePhantomApi";
import type { NLPDetails, RiskLevel } from "@/hooks/usePhantomApi";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Live Simulator — PHANTOM" },
      { name: "description", content: "Interactive sandbox for testing logs and justification notes against PHANTOM's 4-engine detection system." },
    ],
  }),
  component: Simulator,
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  Critical: "#E5484D",
  High:     "#f97316",
  Medium:   "#facc15",
  Low:      "#737373",
  Normal:   "var(--emerald)",
};

const NLP_CATEGORY_META: Array<{ key: string; label: string; color: string }> = [
  { key: "authority",           label: "Authority Injection",  color: "#a855f7" },
  { key: "policy_bypass",       label: "Policy Bypass",        color: "#E5484D" },
  { key: "urgency",             label: "Urgency",              color: "#f97316" },
  { key: "vagueness",           label: "Vagueness",            color: "#facc15" },
  { key: "responsibility_shift",label: "Responsibility Shift", color: "var(--cyan)" },
];

function ScoreBar({ label, value, color, max = 100 }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const isHigh = pct >= 70;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-muted-foreground">{label}</span>
        <span className="text-mono text-[16px] font-bold" style={{ color: isHigh ? color : "var(--muted-foreground)" }}>
          {value.toFixed(0)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function RiskLevelBadge({ risk }: { risk: RiskLevel }) {
  const color = RISK_COLORS[risk] ?? "#737373";
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[14px] font-bold"
      style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {risk} Risk
    </div>
  );
}

// ─── Engine 4 Live Note Analyzer ─────────────────────────────────────────────

function NoteAnalyzer() {
  const [text, setText] = useState("");
  const { mutate: scoreText, data: result, isPending, reset } = useScoreText();

  const SAMPLE_NOTES = [
    "Customer emergency, senior manager approved bypass of verification protocol immediately.",
    "As per head office instructions, override the compliance check. Done as discussed.",
    "Routine transaction handled as usual per standard procedure.",
    "URGENT: Director approved exception. Time-sensitive, waive normal controls.",
  ];

  const handleSubmit = () => {
    if (!text.trim()) return;
    scoreText(text.trim());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg border"
          style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "var(--emerald)" }}
        >
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[18px] font-bold">Live Note Analyzer</div>
          <div className="text-[13px] text-muted-foreground">Engine 4 · NLP Justification Scanner</div>
        </div>
      </div>

      {/* Sample notes */}
      <div>
        <div className="text-mono mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          Sample Notes
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_NOTES.map((note, i) => (
            <button
              key={i}
              onClick={() => { setText(note); reset(); }}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-muted-foreground transition hover:border-[color:var(--cyan)]/30 hover:text-foreground text-left"
            >
              {note.slice(0, 40)}…
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div>
        <label className="text-mono mb-2 block text-[11px] uppercase tracking-widest text-muted-foreground">
          Justification Note / Override Text
        </label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); reset(); }}
          placeholder="Enter a manager override note or justification text to analyze..."
          className="w-full resize-none rounded-xl border border-border bg-surface-2 p-4 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-[color:var(--emerald)] focus:outline-none transition-colors leading-relaxed"
          rows={5}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">{text.length} characters</span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isPending}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-medium transition-all disabled:opacity-40"
            style={{
              background: text.trim() ? "var(--emerald)" : "#262626",
              color: text.trim() ? "#0A0A0A" : "#737373",
            }}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Send className="h-4 w-4" /> Analyze Note</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border bg-surface-2 p-5 space-y-5"
            style={{ borderColor: (result.language_score ?? 0) >= 70 ? "rgba(229,72,77,0.3)" : "rgba(16,185,129,0.2)" }}
          >
            {/* Overall score */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-muted-foreground mb-0.5">Language Risk Score</div>
                <div
                  className="text-mono text-[48px] font-bold leading-none"
                  style={{ color: (result.language_score ?? 0) >= 70 ? "#E5484D" : "var(--emerald)" }}
                >
                  {(result.language_score ?? 0).toFixed(0)}
                </div>
                <div className="text-mono text-[12px] text-muted-foreground">/100 · Engine 4</div>
              </div>
              {(result.language_score ?? 0) >= 60 ? (
                <AlertTriangle className="h-12 w-12 text-[color:var(--critical)] opacity-40" />
              ) : (
                <CheckCircle className="h-12 w-12 text-[color:var(--emerald)] opacity-40" />
              )}
            </div>

            {/* Category breakdown */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="text-[14px] font-semibold text-foreground">Category Breakdown</div>
              {NLP_CATEGORY_META.map(({ key, label, color }) => {
                const val = (result as unknown as Record<string, number>)[key] ?? 0;
                return <ScoreBar key={key} label={label} value={val} color={color} />;
              })}
            </div>

            {/* Top keywords */}
            {(result as { top_keywords?: string[] }).top_keywords?.length ? (
              <div className="border-t border-border pt-4">
                <div className="text-mono mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Detected Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {((result as { top_keywords?: string[] }).top_keywords ?? []).map(kw => (
                    <span
                      key={kw}
                      className="text-mono rounded-full border border-[color:var(--critical)]/30 bg-[color:var(--critical)]/10 px-2.5 py-1 text-[11px] text-[color:var(--critical)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Status */}
            {result.message && (
              <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground border-t border-border pt-3">
                {result.message}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Payload Simulator (4-Engine DITS) ────────────────────────────────────────

const DEFAULT_ACTIONS = ["Login", "ViewCustomer", "AccessLoan", "OverrideLoan", "TransferFunds"];

function PayloadSimulator() {
  const [employeeId, setEmployeeId] = useState("EMP001");
  const [actions, setActions] = useState<string[]>(DEFAULT_ACTIONS);
  const [newAction, setNewAction] = useState("");
  const [overrideNote, setOverrideNote] = useState("Customer emergency, senior approved bypass.");
  const [avoidanceScore, setAvoidanceScore] = useState(72);
  const { mutate: evaluate, data: result, isPending, reset } = useEvaluate();

  const addAction = () => {
    if (!newAction.trim()) return;
    setActions(prev => [...prev, newAction.trim()]);
    setNewAction("");
  };

  const removeAction = (i: number) => setActions(prev => prev.filter((_, idx) => idx !== i));

  const handleEvaluate = () => {
    reset();
    evaluate({
      employee_id: employeeId,
      log_actions: actions,
      override_note: overrideNote || undefined,
      access_void_score: avoidanceScore,
    });
  };

  const engineLabels = [
    { key: "engine1_chain_score",     label: "Engine 1 — Chain Score",     icon: Activity, color: "var(--cyan)" },
    { key: "engine2_avoidance_score", label: "Engine 2 — Avoidance Score",  icon: Shield,   color: "#f97316" },
    { key: "engine3_collusion_score", label: "Engine 3 — Collusion Score",  icon: Network,  color: "#a855f7" },
    { key: "engine4_language_score",  label: "Engine 4 — Language Score",   icon: Zap,      color: "var(--emerald)" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg border"
          style={{ borderColor: "rgba(0,242,254,0.3)", background: "rgba(0,242,254,0.1)", color: "var(--cyan)" }}
        >
          <Terminal className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[18px] font-bold">Payload Simulator</div>
          <div className="text-[13px] text-muted-foreground">4-Engine DITS Fusion · Live Evaluation</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Employee ID */}
        <div>
          <label className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
            Employee ID
          </label>
          <input
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            placeholder="e.g. EMP001"
            className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-[14px] text-foreground focus:border-[color:var(--cyan)] focus:outline-none"
          />
        </div>

        {/* Engine 2 score override */}
        <div>
          <label className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
            Engine 2 Avoidance Score (0–100): {avoidanceScore}
          </label>
          <input
            type="range" min={0} max={100} value={avoidanceScore}
            onChange={e => setAvoidanceScore(+e.target.value)}
            className="w-full accent-[color:var(--cyan)]"
            style={{ accentColor: "var(--cyan)" }}
          />
        </div>
      </div>

      {/* Action sequence */}
      <div>
        <label className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
          Log Action Sequence (Engine 1)
        </label>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-2 p-3 min-h-[48px]">
          {actions.map((a, i) => (
            <div
              key={`${a}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] text-foreground"
            >
              <span className="text-mono text-muted-foreground">{i + 1}.</span>
              {a}
              <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-[color:var(--critical)] transition">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newAction}
            onChange={e => setNewAction(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addAction()}
            placeholder="Add action token (e.g. OverrideAudit)..."
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] focus:border-[color:var(--cyan)] focus:outline-none"
          />
          <button
            onClick={addAction}
            className="flex items-center gap-1.5 rounded-lg border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/8 px-3 py-2 text-[13px] text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/12"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Override note */}
      <div>
        <label className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
          Override Note / Justification (Engine 4)
        </label>
        <textarea
          value={overrideNote}
          onChange={e => setOverrideNote(e.target.value)}
          placeholder="Optional manager justification note..."
          className="w-full resize-none rounded-xl border border-border bg-surface-2 p-4 text-[14px] text-foreground focus:border-[color:var(--cyan)] focus:outline-none"
          rows={3}
        />
      </div>

      {/* Evaluate button */}
      <button
        onClick={handleEvaluate}
        disabled={isPending || !employeeId.trim() || actions.length === 0}
        className="group relative w-full overflow-hidden rounded-xl py-3.5 text-[15px] font-bold transition-all disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, rgba(0,242,254,0.15) 0%, rgba(16,185,129,0.1) 100%)",
          border: "1px solid rgba(0,242,254,0.3)",
          color: "var(--cyan)",
        }}
      >
        {/* Scan line */}
        {!isPending && (
          <div
            className="absolute inset-y-0 w-32 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,242,254,0.08), transparent)",
              animation: "phantom-scan 1.5s linear infinite",
            }}
          />
        )}
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Running 4-Engine Evaluation…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" /> Evaluate — Compute DITS Score
          </span>
        )}
      </button>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* DITS hero score */}
            <div
              className="rounded-xl border p-6 text-center"
              style={{
                borderColor: `${RISK_COLORS[result.risk_level] ?? "#737373"}40`,
                background: `${RISK_COLORS[result.risk_level] ?? "#737373"}08`,
              }}
            >
              <div className="text-[13px] text-muted-foreground mb-1">Dynamic Insider Threat Score (DITS)</div>
              <div
                className="text-mono text-[64px] font-black leading-none glow-cyan"
                style={{ color: RISK_COLORS[result.risk_level] ?? "#fff" }}
              >
                {result.dits_score.toFixed(1)}
              </div>
              <div className="text-mono mt-1 text-[13px] text-muted-foreground">/100 · {result.employee_id}</div>
              <div className="mt-3">
                <RiskLevelBadge risk={result.risk_level} />
              </div>
            </div>

            {/* 4-Engine breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {engineLabels.map(({ key, label, icon: Icon, color }) => {
                const score = result.engine_scores[key] ?? null;
                return (
                  <div
                    key={key}
                    className="rounded-xl border bg-surface-2 p-3 text-center"
                    style={{ borderColor: `${color}25` }}
                  >
                    <div
                      className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border"
                      style={{ borderColor: `${color}30`, background: `${color}10`, color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-mono text-[22px] font-bold" style={{ color: score !== null && score >= 70 ? "#E5484D" : color }}>
                      {score !== null ? score.toFixed(0) : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{label.split(" — ")[1]}</div>
                  </div>
                );
              })}
            </div>

            {/* NLP details if present */}
            {result.nlp_details && result.nlp_details.language_score > 0 && (
              <div className="rounded-xl border border-border bg-surface-2 p-5 space-y-3">
                <div className="text-[15px] font-bold">Engine 4 NLP Breakdown</div>
                {NLP_CATEGORY_META.map(({ key, label, color }) => {
                  const val = (result.nlp_details as unknown as Record<string, number>)[key] ?? 0;
                  return val > 0 ? <ScoreBar key={key} label={label} value={val} color={color} /> : null;
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

function Simulator() {
  const [tab, setTab] = useState<"note" | "payload">("note");

  return (
    <main className="min-h-[calc(100vh-53px)] bg-background text-foreground">
      {/* Header */}
      <div
        className="border-b border-border/60 px-6 py-6"
        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.04) 0%, transparent 60%)" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-mono mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            PHANTOM · Real-Time Evaluation Sandbox
          </div>
          <h1 className="flex items-center gap-3 text-[28px] font-bold tracking-tight">
            <Terminal className="h-6 w-6 text-[color:var(--emerald)]" />
            Live Simulator
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-2xl">
            Test custom justification notes through Engine 4's NLP scanner, or run full 4-engine
            log payload evaluation to compute a live DITS score.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex rounded-xl border border-border bg-surface-2 p-1">
          {([
            { id: "note" as const,    label: "Note Analyzer",       icon: Zap,      sub: "Engine 4 NLP" },
            { id: "payload" as const, label: "Payload Simulator",   icon: Terminal, sub: "4-Engine DITS" },
          ]).map(({ id, label, icon: Icon, sub }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[14px] font-medium transition-all ${
                tab === id
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${tab === id ? "text-[color:var(--cyan)]" : ""}`} />
              <span>{label}</span>
              <span className="text-mono text-[11px] text-muted-foreground hidden sm:block">· {sub}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === "note" ? (
            <motion.div
              key="note"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <NoteAnalyzer />
            </motion.div>
          ) : (
            <motion.div
              key="payload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <PayloadSimulator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
