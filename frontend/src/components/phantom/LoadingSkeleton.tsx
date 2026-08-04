/**
 * PHANTOM — LoadingSkeleton components
 * Skeleton placeholders using the design system surface colors.
 */

export function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-2 ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface-2 p-5 ${className}`}>
      <SkeletonBlock className="mb-4 h-2 w-24" />
      <SkeletonBlock className="mb-2 h-10 w-20" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-4 py-2 text-[12px] text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      <span className="text-mono uppercase tracking-wider">
        Backend offline — showing cached data
      </span>
    </div>
  );
}
