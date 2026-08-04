import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, ShieldCheck, Activity, Network } from "lucide-react";
import { NetworkBackground } from "@/components/phantom/NetworkBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PHANTOM — AI Insider Threat Detection for Banking" },
      { name: "description", content: "Detecting malicious intent before fraud occurs. An autonomous trust engine for privileged-access monitoring." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* top bar */}
      <header className="relative z-20 flex items-center justify-between border-b border-border/60 px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-sm border border-border bg-surface-2">
            <div className="h-2 w-2 rounded-full bg-foreground" />
          </div>
          <span className="text-mono text-[13px] font-semibold tracking-[0.2em]">PHANTOM</span>
        </div>
        <div className="flex items-center gap-8 text-[12px] text-muted-foreground">
          <span className="text-mono tracking-widest">v1.0 · ENTERPRISE</span>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground/80" />
            </span>
            System nominal
          </span>
        </div>
      </header>

      {/* network background */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <NetworkBackground density={55} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0A0A0A_75%)]" />
      </div>

      {/* hero */}
      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-24 pb-20 text-center sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-mono mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur"
        >
          <span className="h-1 w-1 rounded-full bg-foreground/80" />
          Banking Fraud Prevention · AI-Powered
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display text-[68px] font-bold leading-[0.95] tracking-[-0.04em] sm:text-[112px]"
        >
          PHANTOM
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
        >
          AI that spots suspicious employee activity before money leaves the bank.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-3 text-sm text-muted-foreground/80"
        >
          Catches the warning signs <span className="text-foreground">before</span> a fraud happens.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/investigation"
            className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Launch Investigation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-5 py-2.5 text-sm text-foreground transition hover:bg-surface-2"
          >
            See How It Works
          </a>
        </motion.div>

        {/* trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="text-mono mt-20 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border/60 sm:grid-cols-4"
        >
          {[
            ["₹17.5 Cr", "Average fraud blocked per incident"],
            ["< 30s", "Risk score updates in real time"],
            ["0.4%", "False alarm rate"],
            ["4", "AI detection layers running in parallel"],
          ].map(([v, l]) => (
            <div key={l} className="bg-background px-5 py-5 text-left">
              <div className="text-[22px] font-semibold tracking-tight text-foreground">{v}</div>
              <div className="mt-1 text-[10.5px] uppercase tracking-widest text-muted-foreground">{l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* capabilities */}
      <section id="capabilities" className="relative z-10 border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div>
              <div className="text-mono mb-3 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                Four Detection Layers
              </div>
              <h2 className="max-w-xl text-[34px] font-semibold leading-tight tracking-tight">
                Four AI models. One clear risk score.
              </h2>
            </div>
            <p className="hidden max-w-sm text-sm text-muted-foreground md:block">
              Each layer looks at a different signal — access patterns, behavior sequences, team connections, and language. They combine into one live trust score from 0 to 100.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border/60 md:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Behavior Sequence Tracker", s: "Pattern-matching AI", d: "Watches the order of actions to spot someone scouting sensitive accounts before a theft." },
              { t: "Audit Avoidance Detector", s: "Anomaly detection AI", d: "Flags when an employee starts skipping monitored workflows that would normally leave a trail." },
              { t: "Team Collusion Mapper", s: "Relationship AI", d: "Maps who is accessing what together to uncover coordinated fraud rings inside the bank." },
              { t: "Language Risk Scanner", s: "Natural language AI", d: "Reads internal notes and tickets for urgency tricks, copy-paste excuses, and policy-bypass language." },
            ].map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group relative bg-background p-6"
              >
                <div className="text-mono mb-4 text-[10.5px] uppercase tracking-widest text-muted-foreground">
                  0{i + 1} / 04
                </div>
                <div className="text-base font-semibold text-foreground">{c.t}</div>
                <div className="text-mono mt-1 text-[11px] tracking-wider text-muted-foreground">{c.s}</div>
                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                <div className="mt-8 h-px w-8 bg-foreground/40 transition-all duration-500 group-hover:w-full group-hover:bg-foreground" />
              </motion.div>
            ))}
          </div>

          {/* pipeline */}
          <div className="mt-12 rounded-xl border border-border bg-background p-8">
            <div className="text-mono mb-6 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
              How It Works
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
              {[
                { i: <Activity className="h-4 w-4" />, t: "Collect Signals", d: "Access logs, session data, internal tickets, and keystroke patterns." },
                { i: <Network className="h-4 w-4" />, t: "AI Analysis", d: "Four AI layers score risk every 30 seconds in real time." },
                { i: <ShieldCheck className="h-4 w-4" />, t: "Trust Score", d: "One live 0–100 score shows how risky each employee looks right now." },
                { i: <ArrowRight className="h-4 w-4" />, t: "Auto Response", d: "Escalates from quiet logging to session freeze when the score drops too low." },
              ].map((s, i) => (
                <div key={s.t} className="relative">
                  <div className="mb-4 inline-flex items-center gap-2 text-mono text-[10.5px] uppercase tracking-widest text-muted-foreground">
                    <span className="grid h-6 w-6 place-items-center rounded-sm border border-border bg-surface-2 text-foreground">
                      {s.i}
                    </span>
                    Layer {i + 1}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{s.t}</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
                  {i < 3 && (
                    <div className="pointer-events-none absolute right-0 top-1 hidden h-px w-6 bg-border sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 px-8 py-6 text-mono text-[11px] text-muted-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>PHANTOM · Enterprise Trust Platform</span>
          <span className="tracking-widest">CONFIDENTIAL · PROTOTYPE</span>
        </div>
      </footer>
    </main>
  );
}
