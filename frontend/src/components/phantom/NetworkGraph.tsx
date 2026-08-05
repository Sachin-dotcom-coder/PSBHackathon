/**
 * NetworkGraph — Level 2: Interactive SVG employee co-access network
 * Clean threat visualizer:
 * - Default view: ONLY Suspected Collusion Pairs (Red Lines) + Top High-Risk ties
 * - Dynamic Hover: Hovering a node reveals its specific co-access ties
 * - Maximize Mode: Fullscreen view renders ONLY the graph map & toolbar (no extra bottom lists)
 * - Wide layout spacing across full canvas
 * - Solid lines for Collusion/Strong ties, Dotted for weak ties
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { NetworkNode, NetworkLink } from "@/hooks/usePhantomApi";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

const RISK_NODE_COLORS: Record<string, string> = {
  Critical: "#E5484D",
  High:     "#f97316",
  Medium:   "#facc15",
  Low:      "#737373",
  Normal:   "var(--cyan)",
};

interface Props {
  nodes: NetworkNode[];
  links: NetworkLink[];
  date: string;
  onSelectEmployee: (id: string) => void;
  selectedEmployeeId: string | null;
}

type EdgeFilterMode = "collusion" | "strong" | "all";

// Compute well-spaced departmental cluster positions with zero overlapping nodes
function computeClusterPositions(nodes: NetworkNode[], width: number, height: number) {
  if (nodes.length === 0) return [];

  const groups: Record<string, NetworkNode[]> = {};
  nodes.forEach(node => {
    const key = node.branch || node.department || "Default";
    if (!groups[key]) groups[key] = [];
    groups[key].push(node);
  });

  const groupKeys = Object.keys(groups);
  const numGroups = groupKeys.length;
  const cx = width / 2;
  const cy = height / 2;
  
  const mainRadius = Math.min(width * 0.38, height * 0.38);

  const positions: Array<{ id: string; x: number; y: number; group: string }> = [];

  groupKeys.forEach((gKey, gIdx) => {
    const gAngle = (gIdx / numGroups) * 2 * Math.PI - Math.PI / 2;
    const gCx = cx + Math.cos(gAngle) * mainRadius;
    const gCy = cy + Math.sin(gAngle) * mainRadius;

    const gNodes = groups[gKey];
    const subRadius = Math.min(85 + gNodes.length * 12, 160);

    gNodes.forEach((node, nIdx) => {
      const nAngle = (nIdx / gNodes.length) * 2 * Math.PI;
      const rVar = subRadius * (0.7 + 0.3 * Math.sin(nIdx * 3.5));
      const x = Math.max(60, Math.min(width - 60, gCx + Math.cos(nAngle) * rVar));
      const y = Math.max(60, Math.min(height - 60, gCy + Math.sin(nAngle) * rVar));

      positions.push({ id: node.id, x, y, group: gKey });
    });
  });

  // Iterative collision resolution pass to eliminate node overlap
  const minDistance = 54;
  for (let iter = 0; iter < 40; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < minDistance) {
          const overlap = (minDistance - dist) / 2;
          const nx = (dx / dist) * overlap;
          const ny = (dy / dist) * overlap;

          positions[i].x = Math.max(50, Math.min(width - 50, positions[i].x - nx));
          positions[i].y = Math.max(50, Math.min(height - 50, positions[i].y - ny));
          positions[j].x = Math.max(50, Math.min(width - 50, positions[j].x + nx));
          positions[j].y = Math.max(50, Math.min(height - 50, positions[j].y + ny));
        }
      }
    }
  }

  return positions;
}

export function NetworkGraph({ nodes, links, date, onSelectEmployee, selectedEmployeeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [dimensions, setDimensions] = useState({ width: 950, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filtering states
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilterMode>("collusion");
  const [searchQuery, setSearchQuery] = useState("");

  // Zoom & Pan states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hovered node details for spotlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: NetworkNode } | null>(null);

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 400),
          height: isFullscreen ? Math.max(height, 600) : 600,
        });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [isFullscreen]);

  // Layout Positions
  const positions = useMemo(
    () => computeClusterPositions(nodes, dimensions.width, dimensions.height),
    [nodes, dimensions]
  );
  const posMap = useMemo(
    () => Object.fromEntries(positions.map(p => [p.id, p])),
    [positions]
  );

  const collusionCount = useMemo(() => links.filter(l => l.is_suspected_collusion).length, [links]);

  // Set of connected node IDs for the active/hovered spotlight
  const activeFocusId = hoveredNodeId || selectedEmployeeId;
  const spotlightNeighborIds = useMemo(() => {
    if (!activeFocusId) return null;
    const neighborIds = new Set<string>([activeFocusId]);
    links.forEach(l => {
      if (l.source === activeFocusId) neighborIds.add(l.target);
      if (l.target === activeFocusId) neighborIds.add(l.source);
    });
    return neighborIds;
  }, [activeFocusId, links]);

  // Filter Edges
  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      if (activeFocusId && (l.source === activeFocusId || l.target === activeFocusId)) {
        return true;
      }
      if (edgeFilter === "collusion") {
        return l.is_suspected_collusion;
      }
      if (edgeFilter === "strong") {
        return l.is_suspected_collusion || l.co_access_count >= 6;
      }
      return true;
    });
  }, [links, edgeFilter, activeFocusId]);

  // Matching search node IDs
  const searchMatchedIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return new Set(
      nodes
        .filter(n => n.label.toLowerCase().includes(q) || n.employee_id.toLowerCase().includes(q) || n.role.toLowerCase().includes(q))
        .map(n => n.id)
    );
  }, [nodes, searchQuery]);

  // Zoom Controls
  const handleZoomIn = () => setScale(s => Math.min(s * 1.25, 3.5));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.25, 0.4));
  const handleResetZoom = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(s => Math.max(0.4, Math.min(3.5, s * zoomFactor)));
  };

  // Dragging Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).tagName === "rect") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className={`space-y-3 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6 flex flex-col" : ""}`}>
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="text-[20px] font-bold flex items-center gap-2">
            Employee Co-Access Graph
            <span className="text-mono text-[12px] font-normal text-muted-foreground">({date})</span>
          </div>
          <div className="text-[13px] text-muted-foreground">
            {nodes.length} active employees · Showing {filteredLinks.length} key links ·{" "}
            <span className="text-[color:var(--critical)] font-semibold">
              {collusionCount} collusion pairs
            </span>
          </div>
        </div>

        {/* Toolbar: Legend + Search + Filter + Fullscreen */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-r border-border pr-3">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-[#E5484D] shadow-[0_0_6px_#E5484D]" />
              <span className="text-[color:var(--critical)] font-medium">Collusion Tie</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-[color:var(--cyan)]" />
              <span className="text-[color:var(--cyan)] font-medium">Strong Tie (≥6x)</span>
            </span>
          </div>

          {/* Employee Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-40 rounded-lg border border-border bg-surface-2 pl-8 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-[color:var(--cyan)] focus:outline-none"
            />
          </div>

          {/* Threshold Mode Selector */}
          <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5">
            {[
              { mode: "collusion" as const, label: "Collusion Only (Clean)" },
              { mode: "strong" as const, label: "Top Strong Ties (≥6x)" },
              { mode: "all" as const, label: "Show All Raw" },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setEdgeFilter(mode)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  edgeFilter === mode
                    ? "bg-surface text-[color:var(--cyan)] font-semibold shadow-sm border border-[color:var(--cyan)]/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:border-[color:var(--cyan)] hover:bg-surface"
            title={isFullscreen ? "Minimize View" : "Maximize View"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-[color:var(--cyan)]" /> : <Maximize2 className="h-4 w-4 text-[color:var(--cyan)]" />}
            <span className="hidden sm:inline">{isFullscreen ? "Minimize" : "Maximize"}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container — In Maximize mode, takes up 100% remaining space */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl border border-border bg-surface-2 transition-all ${
          isFullscreen ? "flex-1 w-full" : ""
        }`}
        style={{ height: isFullscreen ? "calc(100vh - 100px)" : "600px" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Floating Zoom Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-lg border border-border bg-background/85 p-1 backdrop-blur shadow-lg">
          <button
            onClick={handleZoomIn}
            className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="px-2 text-mono text-[11px] text-muted-foreground border-l border-border">
            {Math.round(scale * 100)}%
          </div>
        </div>

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="block cursor-grab active:cursor-grabbing"
        >
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="rgba(0,242,254,0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#bgGrad)" />
          <rect width="100%" height="100%" fill="url(#gridPattern)" />

          {/* Tactical Radar Grid Backdrop */}
          <g opacity={0.12} pointerEvents="none">
            <circle cx={dimensions.width / 2} cy={dimensions.height / 2} r={dimensions.height * 0.22} fill="none" stroke="var(--cyan)" strokeDasharray="3 3" />
            <circle cx={dimensions.width / 2} cy={dimensions.height / 2} r={dimensions.height * 0.42} fill="none" stroke="var(--cyan)" strokeDasharray="4 4" />
            <line x1={dimensions.width / 2} y1={0} x2={dimensions.width / 2} y2={dimensions.height} stroke="var(--cyan)" strokeDasharray="2 4" />
            <line x1={0} y1={dimensions.height / 2} x2={dimensions.width} y2={dimensions.height / 2} stroke="var(--cyan)" strokeDasharray="2 4" />
          </g>

          {/* Scalable Group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            
            {/* 1. Connection Edges */}
            {filteredLinks.map((link, i) => {
              const s = posMap[link.source];
              const t = posMap[link.target];
              if (!s || !t) return null;

              const isCollusion = link.is_suspected_collusion;
              const isStrongTie = isCollusion || link.co_access_count >= 6;

              const isHighlight =
                !spotlightNeighborIds ||
                (spotlightNeighborIds.has(link.source) && spotlightNeighborIds.has(link.target));

              const opacity = isHighlight ? (isCollusion ? 1 : isStrongTie ? 0.85 : 0.4) : 0.04;

              const dx = t.x - s.x;
              const dy = t.y - s.y;
              const dist = Math.hypot(dx, dy);
              
              const px = dist > 0 ? -dy / dist : 0;
              const py = dist > 0 ? dx / dist : 0;
              const offsetDist = 12;

              const midX = (s.x + t.x) / 2 + px * offsetDist;
              const midY = (s.y + t.y) / 2 + py * offsetDist;

              return (
                <g key={`l-${i}`} style={{ transition: "opacity 0.3s ease" }} opacity={opacity}>
                  {isCollusion ? (
                    // Solid Glowing Red Line for Collusion
                    <>
                      <line
                        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                        stroke="#E5484D"
                        strokeWidth={6}
                        strokeOpacity={0.3}
                      />
                      <line
                        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                        stroke="#E5484D"
                        strokeWidth={2.8}
                      />
                      {dist > 70 && (
                        <text
                          x={midX}
                          y={midY}
                          fill="#E5484D"
                          fontSize={9.5}
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                        >
                          ⚠ {link.co_access_count}× Collusion
                        </text>
                      )}
                    </>
                  ) : isStrongTie ? (
                    // Solid Cyan Line for Strong Ties (>=6x co-access)
                    <>
                      <line
                        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                        stroke="rgba(0, 242, 254, 0.75)"
                        strokeWidth={2.2}
                      />
                      {dist > 70 && (
                        <text
                          x={midX}
                          y={midY}
                          fill="rgba(0, 242, 254, 0.85)"
                          fontSize={8.5}
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                        >
                          {link.co_access_count}×
                        </text>
                      )}
                    </>
                  ) : (
                    // Dotted Line for Weak Ties (<6x co-access)
                    <line
                      x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke="rgba(0, 242, 254, 0.4)"
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                    />
                  )}
                </g>
              );
            })}

            {/* 2. Employee Nodes */}
            {nodes.map((node) => {
              const pos = posMap[node.id];
              if (!pos) return null;

              const color = RISK_NODE_COLORS[node.risk_level] ?? "#737373";
              const isSelected = selectedEmployeeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isHot = node.risk_level === "Critical" || node.risk_level === "High";

              const isSpotlighted = !spotlightNeighborIds || spotlightNeighborIds.has(node.id);
              const isSearchMatched = !searchMatchedIds || searchMatchedIds.has(node.id);
              const nodeOpacity = isSpotlighted && isSearchMatched ? 1 : 0.15;

              const showLabel = isHot || isSelected || isHovered || (searchMatchedIds && searchMatchedIds.has(node.id));

              // Dynamic risk-based node radius
              const baseR = node.risk_level === "Critical" ? 22 : node.risk_level === "High" ? 20 : node.risk_level === "Medium" ? 18 : 16;
              const r = isSelected || isHovered ? baseR + 5 : baseR;

              return (
                <g
                  key={node.id}
                  style={{ cursor: "pointer", transition: "opacity 0.3s ease" }}
                  opacity={nodeOpacity}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEmployee(node.id);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredNodeId(node.id);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        node,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredNodeId(null);
                    setTooltip(null);
                  }}
                >
                  {/* Outer pulse for critical/high risk */}
                  {isHot && (
                    <circle cx={pos.x} cy={pos.y} r={r + 8} fill={color} opacity={0.15}>
                      <animate attributeName="opacity" values="0.15;0.35;0.15" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Selection indicator ring */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={pos.x} cy={pos.y} r={r + 5}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    >
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${pos.x} ${pos.y}`} to={`360 ${pos.x} ${pos.y}`} dur="6s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={pos.x} cy={pos.y} r={r}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                  />

                  {/* Employee Initials */}
                  <text
                    x={pos.x} y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={color}
                    fontSize={11}
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                  >
                    {node.label.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </text>

                  {/* Smart Label */}
                  {showLabel && (
                    <g>
                      <text
                        x={pos.x} y={pos.y + r + 13}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.9)"
                        fontSize={10}
                        fontWeight="600"
                        fontFamily="Inter"
                      >
                        {node.label}
                      </text>
                      <text
                        x={pos.x} y={pos.y + r + 24}
                        textAnchor="middle"
                        fill={color}
                        fontSize={9}
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        DITS: {node.access_void_score.toFixed(0)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip Popover */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-none absolute z-30 rounded-xl border border-border bg-surface-2/95 p-4 text-[13px] backdrop-blur shadow-2xl min-w-[230px]"
              style={{
                left: Math.min(tooltip.x + 15, (containerRef.current?.clientWidth ?? 800) - 250),
                top: Math.min(tooltip.y + 15, (containerRef.current?.clientHeight ?? 500) - 180),
              }}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                <div>
                  <div className="font-bold text-foreground text-[15px]">{tooltip.node.label}</div>
                  <div className="text-mono text-[11px] text-muted-foreground">{tooltip.node.employee_id}</div>
                </div>
                <div
                  className="rounded-full px-2 py-0.5 text-mono text-[10px] uppercase font-bold border"
                  style={{
                    color: RISK_NODE_COLORS[tooltip.node.risk_level] ?? "#fff",
                    borderColor: `${RISK_NODE_COLORS[tooltip.node.risk_level]}40`,
                    background: `${RISK_NODE_COLORS[tooltip.node.risk_level]}15`,
                  }}
                >
                  {tooltip.node.risk_level}
                </div>
              </div>

              <div className="space-y-1 text-muted-foreground text-[12px]">
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-medium text-foreground">{tooltip.node.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Branch:</span>
                  <span className="font-medium text-foreground">{tooltip.node.branch}</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-1.5 mt-1">
                  <span>Dynamic Threat Score:</span>
                  <span className="font-mono font-bold text-[14px]" style={{ color: RISK_NODE_COLORS[tooltip.node.risk_level] }}>
                    {tooltip.node.access_void_score.toFixed(0)} / 100
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[color:var(--cyan)] font-medium border-t border-border/60 pt-2">
                <span>Click node for action logs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Render Banner & Employee Grid ONLY when NOT in Maximize Mode */}
      {!isFullscreen && (
        <>
          {collusionCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 shrink-0 text-[color:var(--critical)]" />
                <div>
                  <span className="text-[14px] font-semibold text-[color:var(--critical)]">
                    {collusionCount} Co-Access Collusion {collusionCount === 1 ? "Pair" : "Pairs"} Flagged
                  </span>
                  <span className="ml-2 text-[13px] text-muted-foreground">
                    on {date} — solid red lines represent anomalous co-access patterns.
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Employee List Grid — Sleek borderless glass cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {nodes.map(node => {
              const color = RISK_NODE_COLORS[node.risk_level] ?? "#737373";
              const isSelected = selectedEmployeeId === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectEmployee(node.id)}
                  className={`group relative flex flex-col justify-between rounded-xl p-4.5 text-left transition-all backdrop-blur-md shadow-md ${
                    isSelected
                      ? "bg-white/[0.08] ring-2 ring-[color:var(--cyan)] shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-[color:var(--cyan)]/40"
                      : "bg-[#10131e]/90 border border-white/[0.05] hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-0.5"
                  }`}
                >
                  <div>
                    <div className="text-[15px] font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {node.label}
                    </div>
                    <div className="text-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                      {node.employee_id} · {node.role}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                    <span className="text-mono text-[13px] font-extrabold tabular-nums" style={{ color }}>
                      DITS: {node.access_void_score.toFixed(0)}
                    </span>
                    <span
                      className="text-mono rounded-md px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                    >
                      {node.risk_level}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
