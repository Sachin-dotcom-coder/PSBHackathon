/**
 * PHANTOM — TimelineChart
 * 90-day Recharts line chart showing primary activity, audit,
 * compliance, and override counts with AVS as a secondary track.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TimelineDay, TimelineEvent } from "@/hooks/usePhantomApi";

interface TimelineChartProps {
  data: TimelineDay[];
  events?: TimelineEvent[];
  /** Which lines to show. Defaults to audit + compliance + override */
  showPrimary?: boolean;
  showAVS?: boolean;
  height?: number;
}

const EVENT_COLORS: Record<string, string> = {
  decline_start:  "#60a5fa",  // blue
  audit_zero:     "var(--color-critical)",
  compliance_zero:"#f97316",  // orange
  risk_escalation:"var(--color-critical)",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3 text-[11px] shadow-lg">
      <div className="text-mono mb-2 text-[9.5px] uppercase tracking-widest text-muted-foreground">
        Day {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="text-mono uppercase tracking-wide">
            {p.name}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {typeof p.value === "number" ? p.value.toFixed(p.dataKey === "access_void_score" ? 1 : 0) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimelineChart({
  data,
  events = [],
  showPrimary = true,
  showAVS = false,
  height = 260,
}: TimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[12px] text-muted-foreground">
        No timeline data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#737373", fontSize: 10, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={{ stroke: "#262626" }}
        />
        <YAxis
          tick={{ fill: "#737373", fontSize: 10, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={{ stroke: "#262626" }}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Event markers */}
        {events.map((ev) => (
          <ReferenceLine
            key={`${ev.type}-${ev.day}`}
            x={ev.day}
            stroke={EVENT_COLORS[ev.type] ?? "#ffffff"}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: "", position: "top" }}
          />
        ))}

        {/* 60-threshold line for AVS */}
        {showAVS && (
          <ReferenceLine
            y={60}
            stroke="var(--color-critical)"
            strokeDasharray="6 3"
            strokeWidth={1}
          />
        )}

        {showPrimary && (
          <Line
            type="monotone"
            dataKey="primary_activity"
            name="Primary"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="audit"
          name="Audit"
          stroke="#60a5fa"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="compliance"
          name="Compliance"
          stroke="#a78bfa"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="override"
          name="Override"
          stroke="#f97316"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        {showAVS && (
          <Line
            type="monotone"
            dataKey="access_void_score"
            name="AVS"
            stroke="var(--color-critical)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
