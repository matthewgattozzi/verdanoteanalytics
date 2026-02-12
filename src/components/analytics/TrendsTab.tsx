import { Loader2, LineChart } from "lucide-react";
import { TrendChart } from "@/components/TrendChart";
import type { DailyTrendPoint } from "@/hooks/useDailyTrends";

interface TrendsTabProps {
  trendData: DailyTrendPoint[] | undefined;
  isLoading: boolean;
}

export function TrendsTab({ trendData, isLoading }: TrendsTabProps) {
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

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={trendData.map(d => ({ date: d.date, value: d.spend }))} label="Daily Spend" prefix="$" decimals={0} color="hsl(var(--primary))" />
        <TrendChart data={trendData.map(d => ({ date: d.date, value: d.roas }))} label="ROAS" suffix="x" decimals={2} color="hsl(142, 71%, 45%)" />
        <TrendChart data={trendData.map(d => ({ date: d.date, value: d.cpa }))} label="Cost per Result (CPA)" prefix="$" decimals={2} color="hsl(0, 84%, 60%)" />
        <TrendChart data={trendData.map(d => ({ date: d.date, value: d.ctr }))} label="CTR" suffix="%" decimals={2} color="hsl(217, 91%, 60%)" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={trendData.map(d => ({ date: d.date, value: d.impressions }))} label="Impressions" decimals={0} color="hsl(262, 83%, 58%)" />
        <TrendChart data={trendData.map(d => ({ date: d.date, value: d.purchases }))} label="Purchases" decimals={0} color="hsl(142, 71%, 45%)" />
      </div>
    </>
  );
}
