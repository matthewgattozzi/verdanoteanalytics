import { useState } from "react";
import { format, subDays, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESETS = [
  { label: "Today", from: () => new Date(), to: () => new Date() },
  { label: "Yesterday", from: () => subDays(new Date(), 1), to: () => subDays(new Date(), 1) },
  { label: "Last 7d", from: () => subDays(new Date(), 6), to: () => new Date() },
  { label: "Last 14d", from: () => subDays(new Date(), 13), to: () => new Date() },
  { label: "Last 30d", from: () => subDays(new Date(), 29), to: () => new Date() },
  { label: "This Week", from: () => startOfWeek(new Date(), { weekStartsOn: 1 }), to: () => new Date() },
  { label: "This Month", from: () => startOfMonth(new Date()), to: () => new Date() },
  { label: "Last Month", from: () => startOfMonth(subMonths(new Date(), 1)), to: () => subDays(startOfMonth(new Date()), 1) },
];

interface DateRangeFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onChange: (dateFrom?: string, dateTo?: string) => void;
}

export function DateRangeFilter({ dateFrom, dateTo, onChange }: DateRangeFilterProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fromDate = dateFrom ? new Date(dateFrom) : undefined;
  const toDate = dateTo ? new Date(dateTo) : undefined;

  const handleFromSelect = (date?: Date) => {
    onChange(date ? format(date, "yyyy-MM-dd") : undefined, dateTo);
    setFromOpen(false);
  };

  const handleToSelect = (date?: Date) => {
    onChange(dateFrom, date ? format(date, "yyyy-MM-dd") : undefined);
    setToOpen(false);
  };

  const handlePreset = (preset: typeof PRESETS[number]) => {
    onChange(format(preset.from(), "yyyy-MM-dd"), format(preset.to(), "yyyy-MM-dd"));
  };

  // Determine active preset
  const activePreset = PRESETS.find(p => {
    if (!dateFrom || !dateTo) return false;
    return format(p.from(), "yyyy-MM-dd") === dateFrom && format(p.to(), "yyyy-MM-dd") === dateTo;
  });

  const hasRange = dateFrom || dateTo;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESETS.map((p) => (
        <Button
          key={p.label}
          variant={activePreset?.label === p.label ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => handlePreset(p)}
        >
          {p.label}
        </Button>
      ))}

      <span className="text-xs text-muted-foreground mx-0.5">|</span>

      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 text-xs justify-start min-w-[110px]", !dateFrom && "text-muted-foreground")}
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            {dateFrom ? format(new Date(dateFrom), "MMM d, yyyy") : "From"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={handleFromSelect}
            disabled={(date) => (toDate ? date > toDate : false) || date > new Date()}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <span className="text-xs text-muted-foreground">–</span>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 text-xs justify-start min-w-[110px]", !dateTo && "text-muted-foreground")}
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            {dateTo ? format(new Date(dateTo), "MMM d, yyyy") : "To"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={handleToSelect}
            disabled={(date) => (fromDate ? date < fromDate : false) || date > new Date()}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {hasRange && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onChange(undefined, undefined)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
