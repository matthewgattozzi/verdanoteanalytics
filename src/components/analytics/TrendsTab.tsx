import { useState, useMemo } from "react";
import { Loader2, LineChart, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

function SummaryCard({ label, value, change, invertColor }: { label: string; value: string; change: number | null; invertColor: boolean }) {
  const isPositive = change !== null && change > 0;
  const isNeutral = change === null || Math.abs(change) < 0.5;
  const isGood = change !== null ? (invertColor ? change < 0 : change > 0) : false;

  return (
    <div className="glass-panel p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-xl font-bold">{value}</span>
        {change !== null && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isNeutral ? "text-muted-foreground" : isGood ? "text-emerald-500" : "text-red-500"}`}>
            {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">vs previous period</p>
    </div>
  );
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

  const summary = useMemo(() => {
    if (chartData.length < 1) return null;
    const mid = Math.floor(chartData.length / 2);
    const curr = chartData.slice(mid);
    const prev = chartData.slice(0, mid);

    const sumSpend = (arr: typeof chartData) => arr.reduce((s, d) => s + d.spend, 0);
    const avgMetric = (arr: typeof chartData, key: "cpa" | "cpm") => {
      const vals = arr.filter(d => d[key] > 0);
      return vals.length > 0 ? vals.reduce((s, d) => s + d[key], 0) / vals.length : 0;
    };
    const pctChange = (curr: number, prev: number) => prev === 0 ? null : ((curr - prev) / prev) * 100;

    return {
      totalSpend: sumSpend(chartData),
      avgCpa: avgMetric(chartData, "cpa"),
      avgCpm: avgMetric(chartData, "cpm"),
      spendChange: pctChange(sumSpend(curr), sumSpend(prev)),
      cpaChange: pctChange(avgMetric(curr, "cpa"), avgMetric(prev, "cpa")),
      cpmChange: pctChange(avgMetric(curr, "cpm"), avgMetric(prev, "cpm")),
    };
  }, [chartData]);

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

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          <SummaryCard label="Total Spend" value={`$${summary.totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} change={summary.spendChange} invertColor={false} />
          <SummaryCard label="Avg CPA" value={`$${summary.avgCpa.toFixed(2)}`} change={summary.cpaChange} invertColor />
          <SummaryCard label="Avg CPM" value={`$${summary.avgCpm.toFixed(2)}`} change={summary.cpmChange} invertColor />
        </div>
      )}
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
