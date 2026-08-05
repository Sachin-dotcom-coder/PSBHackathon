import { motion } from "motion/react";
import { ShieldCheck, Activity, Network, Terminal, ArrowRight, Cpu } from "lucide-react";
import { PhantomLogo } from "./PhantomLogo";
import { NetworkBackground } from "./NetworkBackground";

interface IntroPageProps {
  onEnterDashboard: () => void;
}

export function IntroPage({ onEnterDashboard }: IntroPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.35, ease: "easeInOut" } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090a0f] text-foreground select-none overflow-y-auto py-10 px-4"
    >
      {/* Dynamic network canvas background */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
        <NetworkBackground density={40} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#090a0f_85%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "32px 32px"
          }}
        />
      </div>

      {/* Main Glass Shell Container */}
      <div className="relative z-10 flex w-full max-w-[860px] flex-col items-center rounded-3xl border border-white/[0.08] bg-[#10131e]/90 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl">

        {/* Top Classification Header */}
        <div className="text-mono mb-8 flex items-center justify-between w-full border-b border-white/[0.08] pb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          <span className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-white" /> PHANTOM SENTINEL CORE
          </span>
          <span className="hidden sm:inline">POSTURE: ACTIVE MONITORING</span>
          <span className="text-white flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            SYSTEMS NOMINAL
          </span>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center max-w-[680px]">
          <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.04] p-4 shadow-xl backdrop-blur-md">
            <PhantomLogo className="h-12 w-12 text-white" />
            <div className="absolute -inset-1 rounded-2xl bg-white/10 blur-xl -z-10 animate-pulse" />
          </div>

          <h1 className="text-mono text-[28px] sm:text-[34px] font-extrabold tracking-[0.2em] text-white uppercase leading-tight">
            PHANTOM
          </h1>
          <p className="text-mono mt-2 text-[12px] sm:text-[13px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Autonomous Insider Threat Detection Engine
          </p>

          <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-muted-foreground max-w-[620px]">
            Comprehensive real-time security monitoring powered by four multi-layered AI detection engines. Tracking 9,77,705 high-volume banking event logs to preemptively identify unauthorized access, anomalous behavior, and employee collusion.
          </p>
        </div>

        {/* 4 AI Engine Cards Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
          {[
            {
              id: "01",
              name: "Temporal Chain (LSTM)",
              desc: "Scores access sequence timing against known pre-exfiltration fraud patterns.",
              icon: Activity,
            },
            {
              id: "02",
              name: "Access Void (Isolation Forest)",
              desc: "Computes Dynamic Individual Threat Scores (DITS) for out-of-role resource access.",
              icon: Cpu,
            },
            {
              id: "03",
              name: "Collusion Graph",
              desc: "Bipartite co-access graph mapping shared customer record overlapping across teams.",
              icon: Network,
            },
            {
              id: "04",
              name: "Language Risk Scanner (IndicBERT)",
              desc: "NLP justification note analyzer flagging authority injection, urgency & policy bypass.",
              icon: Terminal,
            },
          ].map((eng) => {
            const Icon = eng.icon;
            return (
              <div
                key={eng.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4.5 transition-all hover:bg-white/[0.05] hover:border-white/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 font-mono text-[13px] font-semibold text-white">
                    <Icon className="h-4 w-4 text-white/80" />
                    <span>E-{eng.id} {eng.name}</span>
                  </div>
                  <span className="text-mono text-[10px] text-white/90 font-semibold bg-white/[0.06] px-2 py-0.5 rounded border border-white/20">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {eng.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Live Metrics Summary Bar */}
        <div className="mt-6 grid grid-cols-3 gap-4 w-full rounded-xl border border-white/[0.08] bg-[#090a0f]/90 p-4 text-center">
          <div>
            <div className="text-mono text-[22px] font-extrabold text-white">50</div>
            <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Monitored Roster</div>
          </div>
          <div className="border-x border-white/[0.08]">
            <div className="text-mono text-[22px] font-extrabold text-white">9.77L+</div>
            <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Log Events Scanned</div>
          </div>
          <div>
            <div className="text-mono text-[22px] font-extrabold text-white">4</div>
            <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">AI Engines Online</div>
          </div>
        </div>

        {/* Primary Call to Action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <button
            onClick={onEnterDashboard}
            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-10 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-[14px] tracking-wide shadow-lg hover:bg-neutral-200 hover:scale-[1.02] transition-all"
          >
            <span>ENTER SOC DASHBOARD</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
