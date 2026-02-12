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
import { SlidersHorizontal } from "lucide-react";

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
}

export const ColumnPicker = ({ columns, visibleColumns, onToggle }: ColumnPickerProps) => {
  const groups = columns.reduce<Record<string, ColumnDef[]>>((acc, col) => {
    const g = col.group || "Other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(col);
    return acc;
  }, {});

  const groupOrder = ["Core", "Tags", "Performance", "Engagement", "Commerce", "Context"];

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
          <DialogTitle>Choose Columns</DialogTitle>
          <DialogDescription>Select which data points to display in the table.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {groupOrder.filter(g => groups[g]).map((groupName) => (
            <div key={groupName}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{groupName}</h4>
              <div className="grid grid-cols-2 gap-1">
                {groups[groupName].map((col) => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs">
                    <Checkbox
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => onToggle(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
