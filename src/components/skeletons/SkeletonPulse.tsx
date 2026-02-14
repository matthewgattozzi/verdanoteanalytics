import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

export function SkeletonPulse({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted relative overflow-hidden",
        className
      )}
      style={style}
    >
      <div className="absolute inset-0 shimmer-slide" />
    </div>
  );
}
