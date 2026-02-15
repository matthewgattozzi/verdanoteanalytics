import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
  index?: number;
}

export function MetricCard({ label, value, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn("glass-panel p-4 space-y-2 hover:-translate-y-0.5 transition-transform duration-150", className)}>
      <div className="flex items-center justify-between">
        <span className="metric-label">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="metric-value">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium mb-1",
              trend.positive ? "text-success" : "text-destructive"
            )}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
