import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Shield, Cpu, Lock } from "lucide-react";
import { NetworkBackground } from "./NetworkBackground";

interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  { p: 0, text: "INITIALIZING PHANTOM SENTINEL CORE V1.0.4..." },
  { p: 8, text: "ESTABLISHING ENCRYPTED TUNNEL SECURE LINK... SUCCESS" },
  { p: 18, text: "SYNCHRONIZING ACTIVE LEDGER DATABASE... 84,209 RECORDS LOADED" },
  { p: 30, text: "MOUNTING CORE ENGINE: BEHAVIOR SEQUENCE TRACKER... ONLINE" },
  { p: 48, text: "MOUNTING CORE ENGINE: AUDIT AVOIDANCE DETECTOR... ONLINE" },
  { p: 65, text: "MOUNTING CORE ENGINE: TEAM COLLUSION MAPPER... ONLINE" },
  { p: 78, text: "MOUNTING CORE ENGINE: LANGUAGE RISK SCANNER... ONLINE" },
  { p: 88, text: "VALIDATING OPERATOR CONSOLE SECURITY SIGNATURES... GRANTED" },
  { p: 95, text: "DECRYPTING LIVE DASHBOARD ROUTER..." },
  { p: 100, text: "PHANTOM SENTINEL SYSTEM INITIALIZATION COMPLETE." },
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Organic progress bar increment logic (exactly 5.0 seconds overall boot time)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 4600; // 4.6 seconds of active progress loading

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawRatio = Math.min(elapsed / duration, 1);
      
      // Interpolate with custom steps to preserve the simulated heavy computational load feel
      let ratio = rawRatio;
      
      if (rawRatio > 0.2 && rawRatio < 0.35) {
        // Slow down for database ledger sync
        ratio = 0.2 + (rawRatio - 0.2) * 0.4;
      } else if (rawRatio >= 0.35 && rawRatio < 0.75) {
        // Accelerate through AI pipeline mounting
        ratio = 0.26 + (rawRatio - 0.35) * 1.35;
      } else if (rawRatio >= 0.75 && rawRatio < 0.9) {
        // Slow down for weight validation
        ratio = 0.8 + (rawRatio - 0.75) * 0.5;
      } else if (rawRatio >= 0.9) {
        // Final authentication check
        ratio = 0.875 + (rawRatio - 0.9) * 1.25;
      }
      
      const percent = Math.min(Math.round(ratio * 100), 100);
      setProgress(percent);

      if (elapsed >= duration) {
        clearInterval(timer);
        setTimeout(onComplete, 400); // Triggers exit transition at exactly 5.0 seconds
      }
    }, 40);

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

  // Auto-scroll logs terminal
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // State checks for showing the 4 AI engines
  const engine1Online = progress >= 30;
  const engine2Online = progress >= 48;
  const engine3Online = progress >= 65;
  const engine4Online = progress >= 78;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] text-foreground select-none"
    >
      {/* Network backdrop with scanline gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <NetworkBackground density={45} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0A0A0A_80%)]" />
        {/* Futuristic grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex w-full max-w-[620px] flex-col items-center px-6 text-center">
        
        {/* Top Header - System Classification */}
        <div className="text-mono mb-8 flex items-center justify-between w-full border-b border-border/40 pb-3 text-[10px] tracking-widest text-muted-foreground uppercase">
          <span>SECURE SYSTEM LINK</span>
          <span>POSTURE: MONITORING</span>
          <span>LEVEL: SECRET</span>
        </div>

        {/* Central Glowing Reticle & Logo */}
        <div className="relative mb-10 grid h-32 w-32 place-items-center">
          {/* Pulsing glow background */}
          <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse" />
          
          {/* Rotating outer compass rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute h-full w-full rounded-full border border-dashed border-border/60"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute h-[85%] w-[85%] rounded-full border border-dotted border-muted-foreground/30"
          />

          {/* Central Sentinel Core */}
          <div className="relative grid h-16 w-16 place-items-center rounded-lg border border-foreground/30 bg-surface-2 shadow-2xl">
            <div className="h-4 w-4 rounded bg-foreground animate-pulse" />
            {/* Horizontal scan line */}
            <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden pointer-events-none rounded-lg">
              <div 
                className="h-[2px] w-full bg-white/40 shadow-glow" 
                style={{
                  animation: "phantom-scan 2s linear infinite"
                }}
              />
            </div>
          </div>
        </div>

        {/* Brand Typography */}
        <h1 className="text-mono text-[16px] font-bold tracking-[0.4em] uppercase text-foreground">
          PHANTOM
        </h1>
        <p className="text-mono mt-1 text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Insider Threat Detection Core
        </p>

        {/* Sub-system Monitor Statuses */}
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 w-full text-left text-mono text-[10.5px] border-y border-border/40 py-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">01/ BST ENGINE</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${engine1Online ? "bg-foreground animate-pulse" : "bg-neutral-800"}`} />
              {engine1Online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">02/ AAD ENGINE</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${engine2Online ? "bg-foreground animate-pulse" : "bg-neutral-800"}`} />
              {engine2Online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">03/ TCM ENGINE</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${engine3Online ? "bg-foreground animate-pulse" : "bg-neutral-800"}`} />
              {engine3Online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">04/ LRS ENGINE</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${engine4Online ? "bg-foreground animate-pulse" : "bg-neutral-800"}`} />
              {engine4Online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Progress Display */}
        <div className="w-full">
          <div className="flex justify-between items-end text-mono text-[11px] mb-2 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} /> Loading Modules
            </span>
            <span className="font-semibold tabular-nums text-foreground">{progress}%</span>
          </div>
          
          {/* Progress Bar Container */}
          <div className="relative h-1.5 w-full bg-muted overflow-hidden rounded-full border border-border/30">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-foreground transition-all duration-75 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Real-time Diagnostics Terminal */}
        <div className="mt-6 w-full rounded-md border border-border bg-black/60 p-4 text-left font-mono text-[10px] leading-relaxed text-muted-foreground backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-foreground border-b border-border/40 pb-2 mb-2">
            <Terminal className="h-3.5 w-3.5" />
            <span>DIAGNOSTICS INTERFACE</span>
          </div>
          
          <div className="h-28 overflow-y-auto space-y-1 scrollbar-none pr-1 select-text">
            {logs.map((log, index) => (
              <div 
                key={index}
                className={index === logs.length - 1 ? "text-foreground font-medium" : ""}
              >
                {log}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* Action Skip Button / Confidential Notice */}
        <div className="mt-8 flex justify-between items-center w-full text-mono text-[9px] text-muted-foreground uppercase">
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            <span>AES-256 ENCRYPTED CONSOLE</span>
          </div>
          
          <button 
            onClick={onComplete}
            className="group relative px-3 py-1 border border-border/60 rounded hover:border-foreground hover:text-foreground bg-surface/30 backdrop-blur transition-all duration-200"
          >
            Skip Diagnostics
          </button>
        </div>
      </div>
    </motion.div>
  );
}
