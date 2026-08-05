import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Network,
  CalendarDays,
  Users,
  Activity,
} from "lucide-react";
import {
  useGraphTimeline,
  useGraphDay,
  useEmployeeDayActions,
} from "@/hooks/usePhantomApi";
import { GraphTimeline } from "@/components/phantom/GraphTimeline";
import { NetworkGraph } from "@/components/phantom/NetworkGraph";
import { ActionChain } from "@/components/phantom/ActionChain";
import { SkeletonCard } from "@/components/phantom/LoadingSkeleton";

export const Route = createFileRoute("/investigation")({
  head: () => ({
    meta: [
      { title: "Graph Visualizer — PHANTOM" },
      { name: "description", content: "Multi-level interactive insider threat graph visualizer." },
    ],
  }),
  component: InvestigationGraph,
});

type Level = 1 | 2 | 3;

function Breadcrumb({
  level,
  selectedDate,
  selectedEmployee,
  onReset,
  onGoToLevel1,
  onGoToLevel2,
}: {
  level: Level;
  selectedDate: string | null;
  selectedEmployee: string | null;
  onReset: () => void;
  onGoToLevel1: () => void;
  onGoToLevel2: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <button
        onClick={onReset}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition ${
          level === 1 ? "text-foreground font-semibold bg-surface" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Timeline
      </button>

      {level >= 2 && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={onGoToLevel2}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition ${
              level === 2 ? "text-foreground font-semibold bg-surface" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {selectedDate ?? "Network"}
          </button>
        </>
      )}

      {level >= 3 && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 font-semibold text-foreground">
            <Activity className="h-3.5 w-3.5 text-[color:var(--cyan)]" />
            {selectedEmployee}
          </span>
        </>
      )}
    </div>
  );
}

function LevelIndicator({ current }: { current: Level }) {
  const levels: { n: Level; label: string }[] = [
    { n: 1, label: "Timeline" },
    { n: 2, label: "Network" },
    { n: 3, label: "Actions" },
  ];
  return (
    <div className="flex items-center gap-2">
      {levels.map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all"
            style={
              n === current
                ? { background: "rgba(0,242,254,0.12)", color: "var(--cyan)", border: "1px solid rgba(0,242,254,0.3)" }
                : n < current
                ? { background: "var(--surface-2)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                : { color: "#404040", border: "1px solid #262626" }
            }
          >
            <span
              className="h-4 w-4 shrink-0 grid place-items-center rounded-full text-[10px] font-bold"
              style={
                n === current
                  ? { background: "var(--cyan)", color: "#0A0A0A" }
                  : n < current
                  ? { background: "var(--surface)", color: "var(--muted-foreground)" }
                  : { background: "#1a1a1a", color: "#404040" }
              }
            >
              {n}
            </span>
            {label}
          </div>
          {i < levels.length - 1 && (
            <div
              className="h-px w-6"
              style={{ background: n < current ? "var(--border)" : "#1a1a1a" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function InvestigationGraph() {
  const [level, setLevel] = useState<Level>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Data hooks
  const { data: timelineGraph, isLoading: tlLoading } = useGraphTimeline(15);
  const { data: dayNetwork, isLoading: dayLoading } = useGraphDay(selectedDate);
  const { data: empActions, isLoading: actLoading } = useEmployeeDayActions(selectedDate, selectedEmployeeId);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedEmployeeId(null);
    setLevel(2);
  };

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setLevel(3);
  };

  return (
    <main className="min-h-[calc(100vh-53px)] bg-background text-foreground">
      {/* Page Header */}
      <div className="border-b border-white/[0.08] bg-[#10131e]/90 px-8 py-6 backdrop-blur-md">
        <div className="w-full px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-mono mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                PHANTOM · Interactive Investigation Graph
              </div>
              <h1 className="flex items-center gap-3 text-[28px] font-bold tracking-tight text-white">
                <Network className="h-6 w-6 text-[color:var(--cyan)]" />
                Multi-Level Graph Visualizer
              </h1>
            </div>
            <LevelIndicator current={level} />
          </div>

          {/* Breadcrumb */}
          <div className="mt-4">
            <Breadcrumb
              level={level}
              selectedDate={selectedDate}
              selectedEmployee={selectedEmployeeId}
              onReset={() => { setLevel(1); setSelectedDate(null); setSelectedEmployeeId(null); }}
              onGoToLevel1={() => { setLevel(1); }}
              onGoToLevel2={() => { if (selectedDate) setLevel(2); setSelectedEmployeeId(null); }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-10 py-8">
        {/* Level guide */}
        <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#10131e]/90 shadow-xl backdrop-blur-md px-6 py-4">
          <div className="flex flex-wrap items-center gap-8 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--cyan)] shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <strong className="text-white font-semibold">Level 1:</strong> Click a day node to see daily activity
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              <strong className="text-white font-semibold">Level 2:</strong> Click an employee node to view action logs
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--emerald)] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <strong className="text-white font-semibold">Level 3:</strong> Engine 1 sequence risk + timestamped actions
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── LEVEL 1: Timeline ─── */}
          {level === 1 && (
            <motion.div
              key="level1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {tlLoading ? (
                <div className="space-y-4">
                  <SkeletonCard className="h-16" />
                  <div className="flex gap-3 overflow-x-auto">
                    {[...Array(8)].map((_, i) => <SkeletonCard key={i} className="h-[180px] w-[110px] shrink-0" />)}
                  </div>
                </div>
              ) : timelineGraph ? (
                <GraphTimeline
                  nodes={timelineGraph.nodes}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-border text-muted-foreground">
                  Could not load timeline data — ensure the backend is running.
                </div>
              )}
            </motion.div>
          )}

          {/* ─── LEVEL 2: Network Graph ─── */}
          {level === 2 && (
            <motion.div
              key="level2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {dayLoading ? (
                <SkeletonCard className="h-[500px]" />
              ) : dayNetwork ? (
                <NetworkGraph
                  nodes={dayNetwork.nodes}
                  links={dayNetwork.links}
                  date={dayNetwork.date}
                  onSelectEmployee={handleSelectEmployee}
                  selectedEmployeeId={selectedEmployeeId}
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-border text-muted-foreground">
                  No employee data available for {selectedDate}.
                </div>
              )}
            </motion.div>
          )}

          {/* ─── LEVEL 3: Action Chain ─── */}
          {level === 3 && (
            <motion.div
              key="level3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {actLoading ? (
                <div className="space-y-4">
                  <SkeletonCard className="h-24" />
                  <SkeletonCard className="h-64" />
                </div>
              ) : empActions ? (
                <div className="space-y-6">
                  <ActionChain data={empActions} />
                  {/* Quick link to full profile */}
                  <div className="flex justify-center">
                    <Link
                      to="/employee/$id"
                      params={{ id: selectedEmployeeId ?? "" }}
                      className="flex items-center gap-2 rounded-lg border border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/8 px-5 py-2.5 text-[14px] font-medium text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/12"
                    >
                      View Full 360° Profile →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-border text-muted-foreground">
                  No action data for {selectedEmployeeId} on {selectedDate}.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
