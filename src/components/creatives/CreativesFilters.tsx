import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Layers } from "lucide-react";
import { GROUP_BY_OPTIONS } from "./constants";

interface CreativesFiltersProps {
  dateFrom?: string;
  dateTo?: string;
  onDateChange: (from?: string, to?: string) => void;
  filters: Record<string, string>;
  updateFilter: (key: string, val: string) => void;
  filterOptions: any;
  groupBy: string;
  setGroupBy: (v: string) => void;
  viewMode: "table" | "card";
}

export function CreativesFilters({
  dateFrom, dateTo, onDateChange,
  filters, updateFilter, filterOptions, groupBy, setGroupBy, viewMode,
}: CreativesFiltersProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground mr-1">Date:</span>
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onDateChange} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {filterOptions && (
          <>
            {(["ad_type", "person", "style", "hook"] as const).map((field) => (
              <Select key={field} value={filters[field] || "__all__"} onValueChange={(v) => updateFilter(field, v)}>
                <SelectTrigger className="w-32 h-8 font-body text-[12px] text-slate bg-background">
                  <SelectValue placeholder={field.replace("ad_", "").replace("_", " ")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {field.replace("ad_", "").replace("_", " ")}</SelectItem>
                  {(filterOptions[field] || []).map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            <Select value={filters.tag_source || "__all__"} onValueChange={(v) => updateFilter("tag_source", v)}>
              <SelectTrigger className="w-32 h-8 font-body text-[12px] text-slate bg-background"><SelectValue placeholder="Tag source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sources</SelectItem>
                <SelectItem value="parsed">Parsed</SelectItem>
                <SelectItem value="csv_match">CSV Match</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="untagged">Untagged</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        {viewMode === "table" && (
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36 h-8 font-body text-[12px] text-slate bg-background">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                <SelectValue placeholder="Group by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </>
  );
}
