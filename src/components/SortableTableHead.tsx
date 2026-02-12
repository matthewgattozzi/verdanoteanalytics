import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;
export type SortConfig = { key: string; direction: SortDirection };

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ label, sortKey, currentSort, onSort, className = "" }: SortableTableHeadProps) {
  const isActive = currentSort.key === sortKey;

  return (
    <TableHead
      className={`text-xs cursor-pointer select-none hover:text-foreground ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${className.includes("text-right") ? "justify-end" : ""}`}>
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
