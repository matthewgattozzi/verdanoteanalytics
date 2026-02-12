import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { SlidersHorizontal, GripVertical } from "lucide-react";
import { useState, useRef, useCallback } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
  group?: string;
}

interface ColumnPickerProps {
  columns: ColumnDef[];
  visibleColumns: Set<string>;
  onToggle: (key: string) => void;
  columnOrder: string[];
  onReorder: (newOrder: string[]) => void;
}

export const ColumnPicker = ({ columns, visibleColumns, onToggle, columnOrder, onReorder }: ColumnPickerProps) => {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  // Build ordered list from columnOrder, falling back to columns array order
  const colMap = new Map(columns.map(c => [c.key, c]));
  const orderedKeys = columnOrder.length > 0
    ? columnOrder.filter(k => colMap.has(k))
    : columns.map(c => c.key);
  // Add any missing columns at end
  const allKeys = new Set(orderedKeys);
  columns.forEach(c => { if (!allKeys.has(c.key)) orderedKeys.push(c.key); });

  const orderedCols = orderedKeys.map(k => colMap.get(k)!).filter(Boolean);

  const groups = orderedCols.reduce<Record<string, ColumnDef[]>>((acc, col) => {
    const g = col.group || "Other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(col);
    return acc;
  }, {});

  const groupOrder = ["Core", "Tags", "Performance", "Engagement", "Commerce", "Context"];

  const handleDragStart = useCallback((key: string) => {
    dragRef.current = key;
    setDragKey(key);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverKey(key);
  }, []);

  const handleDrop = useCallback((targetKey: string) => {
    const sourceKey = dragRef.current;
    if (!sourceKey || sourceKey === targetKey) {
      setDragKey(null);
      setDragOverKey(null);
      return;
    }
    const newOrder = [...orderedKeys];
    const fromIdx = newOrder.indexOf(sourceKey);
    const toIdx = newOrder.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, sourceKey);
    onReorder(newOrder);
    setDragKey(null);
    setDragOverKey(null);
  }, [orderedKeys, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragKey(null);
    setDragOverKey(null);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Columns
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose & Order Columns</DialogTitle>
          <DialogDescription>Select data points and drag to reorder them.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {groupOrder.filter(g => groups[g]).map((groupName) => (
            <div key={groupName}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{groupName}</h4>
              <div className="space-y-0.5">
                {groups[groupName].map((col) => (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={() => handleDragStart(col.key)}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDrop={() => handleDrop(col.key)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      dragOverKey === col.key && dragKey !== col.key ? "bg-primary/10 border border-primary/30" : "hover:bg-accent"
                    } ${dragKey === col.key ? "opacity-40" : ""}`}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab flex-shrink-0" />
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <Checkbox
                        checked={visibleColumns.has(col.key)}
                        onCheckedChange={() => onToggle(col.key)}
                      />
                      <span className="truncate">{col.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
