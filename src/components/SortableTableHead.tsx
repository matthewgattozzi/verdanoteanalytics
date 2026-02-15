import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown, GripVertical } from "lucide-react";
import { useState } from "react";

export type SortDirection = "asc" | "desc" | null;
export type SortConfig = { key: string; direction: SortDirection };

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (key: string) => void;
  onDragOver?: (e: React.DragEvent, key: string) => void;
  onDrop?: (key: string) => void;
  isDragTarget?: boolean;
}

export function SortableTableHead({
  label,
  sortKey,
  currentSort,
  onSort,
  className = "",
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget = false,
}: SortableTableHeadProps) {
  const isActive = currentSort.key === sortKey;
  const [isDragging, setIsDragging] = useState(false);

  return (
    <TableHead
      className={`font-label text-[11px] uppercase tracking-[0.04em] text-slate font-semibold cursor-pointer select-none hover:text-foreground transition-colors ${isDragTarget ? "bg-accent/60 border-l-2 border-primary" : ""} ${isDragging ? "opacity-40" : ""} ${className}`}
      onClick={() => onSort(sortKey)}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", sortKey);
        setIsDragging(true);
        onDragStart?.(sortKey);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(e, sortKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        onDrop?.(sortKey);
      }}
    >
      <div className={`flex items-center gap-1 ${className.includes("text-right") ? "justify-end" : ""}`}>
        {draggable && (
          <GripVertical
            className="h-3 w-3 opacity-30 hover:opacity-70 cursor-grab flex-shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
        {label}
        {isActive ? (
          currentSort.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}
