/**
 * PHANTOM — AIInvestigationPanel Component
 * Interactive SOC Investigation Report component powered by Google Gemini.
 * Converts structured Engine 1-4 telemetry into an executive analyst report.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Printer,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  AlertCircle,
} from "lucide-react";
import {
  useInvestigationReport,
  useGenerateReport,
  type InvestigationReport,
  type EmployeeDetail,
  type EmployeeTimeline,
} from "@/hooks/usePhantomApi";
import { RiskBadge } from "@/components/phantom/RiskBadge";
import { MarkdownViewer } from "@/components/phantom/MarkdownViewer";

interface AIInvestigationPanelProps {
  employee: EmployeeDetail;
  timeline?: EmployeeTimeline | null;
}

const LOADING_STEPS = [
  "Loading employee profile & metadata...",
  "Reading Engine 1 (Sequence Risk) & Engine 2 (Access Void)...",
  "Summarising Engine 3 (Collusion) & Engine 4 (Language) signals...",
  "Synthesising 90-day forensic timeline trends...",
  "Generating executive investigation report with Gemini...",
];

export function AIInvestigationPanel({ employee, timeline }: AIInvestigationPanelProps) {
  const { data: existingReport, isLoading: fetchingReport } = useInvestigationReport(employee.employee_id);
  const generateMutation = useGenerateReport();

  const [activeReport, setActiveReport] = useState<InvestigationReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Sync existing report when loaded
  useEffect(() => {
    if (existingReport && !activeReport && !isGenerating) {
      setActiveReport(existingReport);
    }
  }, [existingReport, activeReport, isGenerating]);

  // Loading animation sequence handler
  const handleGenerate = (forceRefresh = false) => {
    setIsGenerating(true);
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 500);

    generateMutation.mutate(
      { employee_id: employee.employee_id, force_refresh: forceRefresh },
      {
        onSuccess: (data) => {
          setTimeout(() => {
            clearInterval(stepInterval);
            setActiveReport(data);
            setIsGenerating(false);
          }, 600);
        },
        onError: () => {
          clearInterval(stepInterval);
          setIsGenerating(false);
        },
      }
    );
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleCopy = () => {
    if (!activeReport?.report) return;
    navigator.clipboard.writeText(activeReport.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    if (!activeReport?.report) return;
    const blob = new Blob([activeReport.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PHANTOM_Investigation_${employee.employee_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Extract key evidence bullet points
  const keyEvidence = activeReport?.key_evidence?.length
    ? activeReport.key_evidence
    : employee.reasons?.length
    ? employee.reasons
    : ["Selective reduction in compliance oversight access recorded."];

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-xl transition-all">
      {/* HEADER SECTION */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/10 text-[color:var(--cyan)]">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold text-foreground">AI Investigation Report</h2>
              <RiskBadge risk={employee.risk} />
            </div>
            <div className="flex items-center gap-2 text-mono text-[11px] text-muted-foreground mt-0.5">
              <span>Powered by Google Gemini</span>
              <span>·</span>
              <span>Confidential SOC Output</span>
            </div>
          </div>
        </div>

        {/* Top metadata tags if report ready */}
        {activeReport && !isGenerating && (
          <div className="flex items-center gap-3 text-mono text-[11px]">
            <div className="rounded-md border border-border bg-background px-2.5 py-1 text-muted-foreground">
              Generated: <span className="font-semibold text-foreground">{activeReport.generated_at}</span>
            </div>
            <div className="rounded-md border border-border bg-background px-2.5 py-1 text-muted-foreground">
              Confidence: <span className="font-semibold text-[color:var(--emerald)]">{activeReport.confidence}%</span>
            </div>
            <div className="rounded-md border border-border bg-background px-2.5 py-1 text-muted-foreground">
              {activeReport.version}
            </div>
          </div>
        )}
      </div>

      {/* STATE 1: INITIAL STATE (NO REPORT GENERATED YET) */}
      {!activeReport && !isGenerating && !fetchingReport && (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/10 text-[color:var(--cyan)]">
            <Cpu className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] font-bold text-foreground mb-1">Synthesise AI Investigation Report</h3>
          <p className="mx-auto max-w-md text-[13px] leading-relaxed text-muted-foreground mb-6">
            Convert raw multi-engine telemetry (Engines 1–4) and 90-day forensic timeline trends into an executive cyber risk investigation report for SOC analysts.
          </p>
          <button
            onClick={() => handleGenerate(false)}
            className="inline-flex items-center gap-2.5 rounded-lg border border-[color:var(--cyan)]/40 bg-[color:var(--cyan)]/15 px-6 py-3 text-[14px] font-semibold text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/25 hover:border-[color:var(--cyan)] shadow-lg shadow-[color:var(--cyan)]/10"
          >
            <Sparkles className="h-4 w-4" />
            Generate AI Investigation Report
          </button>
        </div>
      )}

      {/* STATE 2: ANIMATED LOADING STATE */}
      {isGenerating && (
        <div className="rounded-xl border border-border bg-background/60 p-8 text-center space-y-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[color:var(--cyan)]/40 bg-[color:var(--cyan)]/10 text-[color:var(--cyan)]">
            <RotateCw className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-foreground">Generating Investigation Report</h3>
            <p className="text-[12px] text-muted-foreground mt-1">Analyzing cross-engine indicators with Gemini LLM</p>
          </div>

          <div className="mx-auto max-w-md space-y-2 text-left">
            {LOADING_STEPS.map((stepText, idx) => {
              const isDone = idx < stepIndex;
              const isCurrent = idx === stepIndex;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-2 text-[12px] transition-all ${
                    isDone
                      ? "border-[color:var(--emerald)]/30 bg-[color:var(--emerald)]/5 text-[color:var(--emerald)] font-medium"
                      : isCurrent
                      ? "border-[color:var(--cyan)]/40 bg-[color:var(--cyan)]/10 text-foreground font-semibold"
                      : "border-border/40 text-muted-foreground/50"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--emerald)]" />
                  ) : isCurrent ? (
                    <RotateCw className="h-3.5 w-3.5 shrink-0 animate-spin text-[color:var(--cyan)]" />
                  ) : (
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-border/60" />
                  )}
                  <span>{stepText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATE 3: REPORT DISPLAY STATE */}
      {activeReport && !isGenerating && (
        <div className="space-y-6">
          {/* KEY EVIDENCE SUMMARY PANEL */}
          <div className="rounded-xl border border-[color:var(--cyan)]/25 bg-[color:var(--cyan)]/5 p-4">
            <div className="text-mono mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--cyan)] flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Key Findings & Evidence Summary
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {keyEvidence.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-foreground font-medium bg-background/40 rounded-lg p-2 border border-border/40">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--emerald)] mt-0.5" />
                  <span>{ev}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MAIN MARKDOWN REPORT DISPLAY */}
          <div className="rounded-xl border border-border bg-background p-6">
            <MarkdownViewer content={activeReport.report} />
          </div>

          {/* REPORT ACTION & EXPORT FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-surface-2 hover:border-foreground/30"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[color:var(--emerald)]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>

              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-surface-2 hover:border-foreground/30"
              >
                <Download className="h-3.5 w-3.5" />
                Markdown
              </button>

              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-surface-2 hover:border-foreground/30"
              >
                <Printer className="h-3.5 w-3.5" />
                Print PDF
              </button>
            </div>

            <button
              onClick={() => handleGenerate(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/10 px-3.5 py-1.5 text-[12px] font-medium text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/20"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Regenerate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
