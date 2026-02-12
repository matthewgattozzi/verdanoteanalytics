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
  { label: "Last 7 days", from: () => subDays(new Date(), 6), to: () => new Date() },
  { label: "Last 14 days", from: () => subDays(new Date(), 13), to: () => new Date() },
  { label: "Last 30 days", from: () => subDays(new Date(), 29), to: () => new Date() },
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
  const [open, setOpen] = useState(false);
  const [pickingFrom, setPickingFrom] = useState(true);

  const fromDate = dateFrom ? new Date(dateFrom) : undefined;
  const toDate = dateTo ? new Date(dateTo) : undefined;

  const handlePreset = (preset: typeof PRESETS[number]) => {
    onChange(format(preset.from(), "yyyy-MM-dd"), format(preset.to(), "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleCalendarSelect = (date?: Date) => {
    if (!date) return;
    const formatted = format(date, "yyyy-MM-dd");
    if (pickingFrom) {
      onChange(formatted, dateTo && formatted > dateTo ? formatted : dateTo);
      setPickingFrom(false);
    } else {
      onChange(dateFrom && formatted < dateFrom ? formatted : dateFrom, formatted);
      setPickingFrom(true);
    }
  };

  const activePreset = PRESETS.find(p => {
    if (!dateFrom || !dateTo) return false;
    return format(p.from(), "yyyy-MM-dd") === dateFrom && format(p.to(), "yyyy-MM-dd") === dateTo;
  });

  const hasRange = dateFrom || dateTo;

  const displayLabel = activePreset
    ? activePreset.label
    : hasRange
      ? `${dateFrom ? format(new Date(dateFrom), "MMM d") : "…"} – ${dateTo ? format(new Date(dateTo), "MMM d") : "…"}`
      : "Date Range";

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 text-xs justify-start", !hasRange && "text-muted-foreground")}
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-lg" align="start">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="border-r border-border p-2 min-w-[140px] space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 pb-1">Presets</p>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors",
                    activePreset?.label === p.label
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 pb-2 border-b border-border mb-2">
                <button
                  onClick={() => setPickingFrom(true)}
                  className={cn(
                    "text-xs px-2 py-1 rounded transition-colors",
                    pickingFrom ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {dateFrom ? format(new Date(dateFrom), "MMM d, yyyy") : "Start date"}
                </button>
                <span className="text-xs text-muted-foreground">–</span>
                <button
                  onClick={() => setPickingFrom(false)}
                  className={cn(
                    "text-xs px-2 py-1 rounded transition-colors",
                    !pickingFrom ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {dateTo ? format(new Date(dateTo), "MMM d, yyyy") : "End date"}
                </button>
              </div>
              <Calendar
                mode="single"
                selected={pickingFrom ? fromDate : toDate}
                onSelect={handleCalendarSelect}
                disabled={(date) => date > new Date()}
                initialFocus
                className="p-0 pointer-events-auto"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasRange && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => { onChange(undefined, undefined); setPickingFrom(true); }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
