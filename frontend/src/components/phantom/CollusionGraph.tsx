/**
 * PHANTOM — CollusionGraph
 * SVG force-directed bipartite graph for Engine 3 collusion data.
 * No external graph library needed — uses simple radial layout.
 */

import { useMemo } from "react";
import { motion } from "motion/react";

interface Node {
  id: string;
  type: "employee" | "record";
  group: number;
}

interface Link {
  source: string;
  target: string;
  weight: number;
}

interface CollusionGraphProps {
  nodes: Node[];
  links: Link[];
  focusEmployeeId?: string;
}

function layoutNodes(nodes: Node[], focusId?: string) {
  const employees = nodes.filter((n) => n.type === "employee");
  const records   = nodes.filter((n) => n.type === "record");

  const positions: Record<string, { x: number; y: number }> = {};

  // Focus employee at center
  const focusNode = employees.find((n) => n.id === focusId) ?? employees[0];
  if (focusNode) positions[focusNode.id] = { x: 50, y: 45 };

  // Other employees — ring around center-left
  const otherEmps = employees.filter((n) => n.id !== focusNode?.id);
  otherEmps.forEach((n, i) => {
    const angle = (Math.PI / 2) + (i * Math.PI) / Math.max(otherEmps.length, 1);
    positions[n.id] = {
      x: 22 + 15 * Math.cos(angle),
      y: 45 + 30 * Math.sin(angle),
    };
  });

  // Records — right side arc
  const maxR = Math.min(records.length, 8);
  records.slice(0, maxR).forEach((n, i) => {
    const angle = -Math.PI / 3 + (i * ((2 * Math.PI) / 3)) / Math.max(maxR - 1, 1);
    positions[n.id] = {
      x: 75 + 18 * Math.cos(angle),
      y: 45 + 35 * Math.sin(angle),
    };
  });

  return positions;
}

export function CollusionGraph({
  nodes,
  links,
  focusEmployeeId,
}: CollusionGraphProps) {
  const positions = useMemo(
    () => layoutNodes(nodes, focusEmployeeId),
    [nodes, focusEmployeeId],
  );

  if (!nodes.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[12px] text-muted-foreground">
        No collusion graph data
      </div>
    );
  }

  const maxWeight = Math.max(...links.map((l) => l.weight), 1);

  return (
    <div className="relative h-[220px] overflow-hidden rounded-md border border-border bg-background">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {links.map((link, i) => {
          const src = positions[link.source];
          const tgt = positions[link.target];
          if (!src || !tgt) return null;
          const isHot = nodes.find((n) => n.id === link.source)?.type === "employee" &&
                        nodes.find((n) => n.id === link.target)?.type === "employee";
          return (
            <motion.line
              key={i}
              x1={src.x} y1={src.y}
              x2={tgt.x} y2={tgt.y}
              stroke={isHot ? "#FFFFFF" : "#404040"}
              strokeWidth={isHot ? Math.max(0.3, (link.weight / maxWeight) * 0.8) : 0.25}
              strokeDasharray={isHot ? "0" : "1 1"}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.05 }}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const isPrimary = node.id === focusEmployeeId;
        const isEmployee = node.type === "employee";
        const initials = node.id
          .split(/[\s-_]/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const label = node.id.replace("MOD-", "").replace(/_/g, " ").slice(0, 12);

        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              className={`grid place-items-center rounded-full border text-[9px] font-semibold ${
                isEmployee
                  ? isPrimary
                    ? "h-9 w-9 border-foreground bg-foreground text-background"
                    : "h-8 w-8 border-border bg-surface-2 text-foreground"
                  : "h-7 w-7 border-border/60 bg-surface text-muted-foreground"
              }`}
            >
              {isEmployee ? initials : "●"}
            </div>
            <div className="text-mono mt-1 whitespace-nowrap text-center text-[8px] uppercase tracking-wider text-muted-foreground">
              {isEmployee ? node.id : label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
