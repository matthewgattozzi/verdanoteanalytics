import { cn } from "@/lib/utils";

interface TagSourceBadgeProps {
  source: string;
  className?: string;
}

const sourceConfig: Record<string, { label: string; className: string }> = {
  parsed: { label: "Parsed", className: "bg-tag-parsed/15 text-tag-parsed border-tag-parsed/30" },
  csv_match: { label: "CSV Match", className: "bg-tag-csv/15 text-tag-csv border-tag-csv/30" },
  manual: { label: "Manual", className: "bg-tag-manual/15 text-tag-manual border-tag-manual/30" },
  untagged: { label: "Untagged", className: "bg-tag-untagged/15 text-tag-untagged border-tag-untagged/30" },
};

export function TagSourceBadge({ source, className }: TagSourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.untagged;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span className="status-dot" style={{ backgroundColor: "currentColor" }} />
      {config.label}
    </span>
  );
}
