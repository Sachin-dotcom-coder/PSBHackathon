/**
 * PHANTOM — MarkdownViewer Component
 * Renders Markdown investigation reports cleanly with headers, tables, bullet lists,
 * bold text, and code blocks matching PHANTOM's dark theme design system.
 */

import React from "react";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  if (!content) return null;

  // Simple, robust line & block markdown parser for reports
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  
  let keyIdx = 0;
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (inTable && tableHeader.length > 0) {
      elements.push(
        <div key={`table-${keyIdx++}`} className="my-4 overflow-x-auto rounded-lg border border-border bg-background/50">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-2/70 text-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {tableHeader.map((th, i) => (
                  <th key={i} className="px-4 py-2.5 font-semibold">
                    {parseInline(th)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surface/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2 text-foreground/90 font-medium">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check table line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if divider line
      if (cells.every((c) => c.replace(/:/g, "").replace(/-/g, "").length === 0)) {
        i++;
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${keyIdx++}`} className="mt-6 mb-3 text-[18px] font-bold tracking-tight text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
          {parseInline(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${keyIdx++}`} className="mt-5 mb-2.5 text-[16px] font-bold text-foreground flex items-center gap-2">
          {parseInline(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${keyIdx++}`} className="mt-4 mb-2 text-[14px] font-semibold text-foreground">
          {parseInline(trimmed.substring(4))}
        </h3>
      );
    } else if (trimmed === "---" || trimmed === "***") {
      elements.push(<hr key={`hr-${keyIdx++}`} className="my-5 border-t border-border/60" />);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={`li-${keyIdx++}`} className="my-1.5 flex items-start gap-2.5 text-[13px] text-foreground/90 leading-relaxed pl-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--cyan)]" />
          <div>{parseInline(trimmed.substring(2))}</div>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        elements.push(
          <div key={`ol-${keyIdx++}`} className="my-1.5 flex items-start gap-2.5 text-[13px] text-foreground/90 leading-relaxed pl-1">
            <span className="text-mono text-[11px] font-bold text-[color:var(--cyan)] mt-0.5">{match[1]}.</span>
            <div>{parseInline(match[2])}</div>
          </div>
        );
      }
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote key={`bq-${keyIdx++}`} className="my-3 border-l-2 border-[color:var(--cyan)] bg-surface/40 px-4 py-2.5 text-[13px] italic text-muted-foreground rounded-r-lg">
          {parseInline(trimmed.substring(2))}
        </blockquote>
      );
    } else {
      elements.push(
        <p key={`p-${keyIdx++}`} className="my-2.5 text-[13px] leading-relaxed text-foreground/90 font-normal">
          {parseInline(trimmed)}
        </p>
      );
    }

    i++;
  }

  if (inTable) {
    flushTable();
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

function parseInline(text: string): React.ReactNode {
  if (typeof text !== "string") return text;

  // Split bold **text**
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={idx} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="text-mono rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-[color:var(--cyan)] border border-border">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
