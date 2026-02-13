import { useState, useMemo } from "react";
import { Loader2, LineChart } from "lucide-react";
import { TrendChart } from "@/components/TrendChart";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import type { DailyTrendPoint } from "@/hooks/useDailyTrends";

interface TrendsTabProps {
  trendData: DailyTrendPoint[] | undefined;
  isLoading: boolean;
}

export function TrendsTab({ trendData, isLoading }: TrendsTabProps) {
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    if (!trendData) return undefined;
    return trendData.filter(d => {
      if (dateFrom && d.date < dateFrom) return false;
      if (dateTo && d.date > dateTo) return false;
      return true;
    });
  }, [trendData, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
        <LineChart className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">No trend data yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">Sync creatives to populate daily performance metrics for trend analysis.</p>
      </div>
    );
  }

  const data = filteredData || [];

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <span className="text-xs text-muted-foreground">{data.length} days</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={data.map(d => ({ date: d.date, value: d.spend }))} label="Daily Spend" prefix="$" decimals={0} color="hsl(var(--primary))" />
        <TrendChart data={data.map(d => ({ date: d.date, value: d.cpa }))} label="Cost per Result (CPA)" prefix="$" decimals={2} color="hsl(0, 84%, 60%)" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={data.map(d => ({ date: d.date, value: d.cpm }))} label="CPM" prefix="$" decimals={2} color="hsl(262, 83%, 58%)" />
      </div>
    </>
  );
}
