import { SkeletonPulse } from "./SkeletonPulse";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 10, cols = 8 }: TableSkeletonProps) {
  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div
        className="flex gap-4 px-4 py-3 border-b border-border"
        style={{
          background: "hsl(40 20% 93%)",
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse
            key={i}
            className="h-3"
            style={{ width: `${i === 0 ? 140 : 60 + Math.random() * 40}px` } as any}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 px-4 py-3.5 border-b border-border/40"
          style={{ animationDelay: `${row * 40}ms` }}
        >
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonPulse
              key={col}
              className="h-3.5"
              style={{ width: `${col === 0 ? 140 : 50 + Math.random() * 30}px` } as any}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
