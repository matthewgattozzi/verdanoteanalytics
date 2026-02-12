import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface ColumnPickerProps {
  columns: ColumnDef[];
  visibleColumns: Set<string>;
  onToggle: (key: string) => void;
}

export const ColumnPicker = ({ columns, visibleColumns, onToggle }: ColumnPickerProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          {columns.map((col) => (
            <label key={col.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-xs">
              <Checkbox
                checked={visibleColumns.has(col.key)}
                onCheckedChange={() => onToggle(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
