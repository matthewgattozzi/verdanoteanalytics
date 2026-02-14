import { SkeletonPulse } from "./SkeletonPulse";

export function ChartSkeleton() {
  return (
    <div className="glass-panel p-6 space-y-4">
      {/* Legend area */}
      <div className="flex gap-4">
        <SkeletonPulse className="h-3 w-16" />
        <SkeletonPulse className="h-3 w-16" />
        <SkeletonPulse className="h-3 w-16" />
      </div>
      {/* Chart area */}
      <div className="flex items-end gap-1 h-48 pt-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <SkeletonPulse
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${30 + Math.sin(i * 0.7) * 40 + Math.random() * 30}%` } as any}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-2.5 w-12" />
        ))}
      </div>
    </div>
  );
}
