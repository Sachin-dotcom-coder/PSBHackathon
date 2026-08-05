import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { Terminal, Cpu, Lock, ShieldCheck } from "lucide-react";
import { NetworkBackground } from "./NetworkBackground";
import { PhantomLogo } from "./PhantomLogo";

interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  { p: 0, text: "INITIALIZING PHANTOM TRUST ENGINE..." },
  { p: 10, text: "ESTABLISHING ENCRYPTED DATALINK... SECURE" },
  { p: 25, text: "LOADING ACCESS LOG DATASET (9,77,705 EVENTS)... READY" },
  { p: 40, text: "MOUNTING E-01: TEMPORAL CHAIN ANALYSER (LSTM)... ONLINE" },
  { p: 58, text: "MOUNTING E-02: ACCESS VOID PROFILER (ISOLATION FOREST)... ONLINE" },
  { p: 72, text: "MOUNTING E-03: COLLUSION GRAPH ENGINE... ONLINE" },
  { p: 85, text: "MOUNTING E-04: NLP JUSTIFICATION SCANNER (IndicBERT)... ONLINE" },
  { p: 95, text: "VALIDATING SOC CONSOLE SECURITY CREDENTIALS... GRANTED" },
  { p: 100, text: "PHANTOM SYSTEM INITIALIZATION COMPLETE." },
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Fast, smooth boot time (~2.8 seconds)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2600;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawRatio = Math.min(elapsed / duration, 1);
      
      const percent = Math.min(Math.round(rawRatio * 100), 100);
      setProgress(percent);

      if (elapsed >= duration) {
        clearInterval(timer);
        setTimeout(onComplete, 250);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Log updater based on progress
  useEffect(() => {
    const triggered = BOOT_LOGS.filter((log) => progress >= log.p);
    const logTexts = triggered.map(
      (log) => `[${log.p.toString().padStart(3, "0")}%] ${log.text}`
    );
    setLogs(logTexts);
  }, [progress]);

  // Auto-scroll terminal
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const engine1Online = progress >= 40;
  const engine2Online = progress >= 58;
  const engine3Online = progress >= 72;
  const engine4Online = progress >= 85;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.4, ease: "easeInOut" } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090a0f] text-foreground select-none overflow-hidden"
    >
      {/* Network background backdrop */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-30">
        <NetworkBackground density={40} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,#090a0f_90%)]" />
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }}
        />
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 flex w-full max-w-[640px] flex-col items-center rounded-3xl border border-white/[0.08] bg-[#10131e]/90 p-8 shadow-2xl backdrop-blur-2xl">
        
        {/* Top Header */}
        <div className="text-mono mb-6 flex items-center justify-between w-full border-b border-white/[0.08] pb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <ShieldCheck className="h-3.5 w-3.5" /> AUTONOMOUS TRUST ENGINE
          </span>
          <span>ENTERPRISE SOC v2026</span>
        </div>

        {/* Brand Icon & Logo */}
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative grid h-20 w-20 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-xl backdrop-blur-md mb-4">
            <PhantomLogo className="h-12 w-12 text-white" />
            {/* Soft ambient glow */}
            <div className="absolute -inset-1 rounded-2xl bg-cyan-500/10 blur-md -z-10 animate-pulse" />
          </div>

          <h1 className="text-mono text-[22px] font-extrabold tracking-[0.25em] text-white">
            PHANTOM
          </h1>
          <p className="text-mono mt-1 text-[11px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
            Insider Threat Detection Engine
          </p>
        </div>

        {/* Engine Status Grid */}
        <div className="grid grid-cols-2 gap-3 w-full border-y border-white/[0.08] py-4 my-4 text-mono text-[11px]">
          {[
            { id: "E-01", name: "Temporal Chain", online: engine1Online },
            { id: "E-02", name: "Access Void ML", online: engine2Online },
            { id: "E-03", name: "Collusion Graph", online: engine3Online },
            { id: "E-04", name: "Language Scanner", online: engine4Online },
          ].map((eng) => (
            <div key={eng.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3.5 py-2">
              <span className="text-muted-foreground font-medium">{eng.id} {eng.name}</span>
              <span className={`inline-flex items-center gap-1.5 font-bold ${eng.online ? "text-emerald-400" : "text-neutral-600"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${eng.online ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-neutral-700"}`} />
                {eng.online ? "ONLINE" : "WAIT"}
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full mt-2">
          <div className="flex justify-between items-center text-mono text-[11px] mb-2 text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="h-3.5 w-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} /> Initializing Neural Pipeline
            </span>
            <span className="font-bold tabular-nums text-white text-[13px]">{progress}%</span>
          </div>
          
          <div className="relative h-2 w-full bg-white/[0.06] overflow-hidden rounded-full border border-white/[0.08]">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75 ease-out shadow-[0_0_12px_rgba(6,182,212,0.6)] rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Diagnostics Terminal */}
        <div className="mt-5 w-full rounded-xl border border-white/[0.08] bg-[#090a0f]/90 p-3.5 text-left font-mono text-[11px] leading-relaxed text-muted-foreground/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white border-b border-white/[0.06] pb-2 mb-2 font-semibold text-[10px] tracking-wider uppercase">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span>DIAGNOSTICS CONSOLE</span>
          </div>
          
          <div className="h-24 overflow-y-auto space-y-1 scrollbar-none pr-1 select-text">
            {logs.map((log, index) => (
              <div 
                key={index}
                className={index === logs.length - 1 ? "text-cyan-300 font-semibold" : "text-muted-foreground/90"}
              >
                {log}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-between items-center w-full text-mono text-[10px] text-muted-foreground uppercase font-medium">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>ENCRYPTED HARDWARE CONSOLE</span>
          </div>
          
          <button 
            onClick={onComplete}
            className="px-3.5 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all font-semibold"
          >
            Skip Intro
          </button>
        </div>
      </div>
    </motion.div>
  );
}
