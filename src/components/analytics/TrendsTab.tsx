import { useState, useMemo } from "react";
import { Loader2, LineChart } from "lucide-react";
import { startOfWeek, startOfMonth, format } from "date-fns";
import { TrendChart } from "@/components/TrendChart";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { Button } from "@/components/ui/button";
import type { DailyTrendPoint } from "@/hooks/useDailyTrends";

type Granularity = "daily" | "weekly" | "monthly";

interface TrendsTabProps {
  trendData: DailyTrendPoint[] | undefined;
  isLoading: boolean;
}

function bucketKey(date: string, granularity: Granularity): string {
  if (granularity === "daily") return date;
  const d = new Date(date);
  if (granularity === "weekly") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(startOfMonth(d), "yyyy-MM-dd");
}

function aggregateBuckets(data: DailyTrendPoint[], granularity: Granularity) {
  if (granularity === "daily") return data;

  const buckets: Record<string, { spend: number; impressions: number; clicks: number; purchases: number; purchase_value: number; adds_to_cart: number; video_views: number }> = {};

  for (const d of data) {
    const key = bucketKey(d.date, granularity);
    if (!buckets[key]) buckets[key] = { spend: 0, impressions: 0, clicks: 0, purchases: 0, purchase_value: 0, adds_to_cart: 0, video_views: 0 };
    const b = buckets[key];
    b.spend += d.spend;
    b.impressions += d.impressions;
    b.clicks += d.clicks;
    b.purchases += d.purchases;
    b.purchase_value += d.purchase_value;
    b.adds_to_cart += d.adds_to_cart;
    b.video_views += d.video_views;
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      ...b,
      ctr: b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0,
      cpm: b.impressions > 0 ? (b.spend / b.impressions) * 1000 : 0,
      cpc: b.clicks > 0 ? b.spend / b.clicks : 0,
      cpa: b.purchases > 0 ? b.spend / b.purchases : 0,
      roas: b.spend > 0 ? b.purchase_value / b.spend : 0,
      cost_per_atc: b.adds_to_cart > 0 ? b.spend / b.adds_to_cart : 0,
    }));
}

export function TrendsTab({ trendData, isLoading }: TrendsTabProps) {
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const filteredData = useMemo(() => {
    if (!trendData) return undefined;
    return trendData.filter(d => {
      if (dateFrom && d.date < dateFrom) return false;
      if (dateTo && d.date > dateTo) return false;
      return true;
    });
  }, [trendData, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    if (!filteredData) return [];
    return aggregateBuckets(filteredData, granularity);
  }, [filteredData, granularity]);

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

  const granLabel = granularity === "daily" ? "days" : granularity === "weekly" ? "weeks" : "months";

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          <div className="flex border border-border rounded-md">
            {(["daily", "weekly", "monthly"] as Granularity[]).map(g => (
              <Button
                key={g}
                variant={granularity === g ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs px-3 first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none"
                onClick={() => setGranularity(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{chartData.length} {granLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={chartData.map(d => ({ date: d.date, value: d.spend }))} label={`${granularity === "daily" ? "Daily" : granularity === "weekly" ? "Weekly" : "Monthly"} Spend`} prefix="$" decimals={0} color="hsl(var(--primary))" />
        <TrendChart data={chartData.map(d => ({ date: d.date, value: d.cpa }))} label="Cost per Result (CPA)" prefix="$" decimals={2} color="hsl(0, 84%, 60%)" invertColor />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={chartData.map(d => ({ date: d.date, value: d.cpm }))} label="CPM" prefix="$" decimals={2} color="hsl(262, 83%, 58%)" invertColor />
      </div>
    </>
  );
}
