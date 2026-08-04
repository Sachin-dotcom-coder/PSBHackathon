/**
 * PHANTOM — NLPScorer (Engine 4 Placeholder)
 * Shows a "Coming Soon" state — Engine 4 is deferred to next sprint.
 * Tracked in todo.md P1.
 */

import { Terminal } from "lucide-react";

export function NLPScorer() {
  return (
    <div className="space-y-4">
      <div className="text-[13px] text-foreground">
        Language Risk Scanner — Engine 4
      </div>

      <div className="rounded-lg border border-dashed border-border bg-surface/40 p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-border bg-surface-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Coming Soon
        </div>
        <p className="mt-3 max-w-xs mx-auto text-[12px] leading-relaxed text-muted-foreground">
          The Language Risk Scanner analyses override justification notes for
          urgency tricks, vague policy language, and evasion patterns.
        </p>
        <div className="mt-4 text-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
          Engine 4 · Deferred · See todo.md
        </div>
      </div>
    </div>
  );
}
