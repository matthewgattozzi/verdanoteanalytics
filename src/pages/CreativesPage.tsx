import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { CreativeDetailModal } from "@/components/CreativeDetailModal";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { InlineTagSelect } from "@/components/InlineTagSelect";
import { SortableTableHead, type SortConfig } from "@/components/SortableTableHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, LayoutGrid, List, Loader2, AlertTriangle, Sparkles, Download, Layers } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { ColumnPicker, type ColumnDef } from "@/components/ColumnPicker";

const TABLE_COLUMNS: ColumnDef[] = [
  // Core
  { key: "creative", label: "Creative", defaultVisible: true, group: "Core" },
  { key: "ad_status", label: "Delivery Status", defaultVisible: false, group: "Core" },
  { key: "result_type", label: "Result Type", defaultVisible: false, group: "Core" },
  // Tags
  { key: "type", label: "Type", defaultVisible: true, group: "Tags" },
  { key: "person", label: "Person", defaultVisible: true, group: "Tags" },
  { key: "style", label: "Style", defaultVisible: true, group: "Tags" },
  { key: "hook", label: "Hook", defaultVisible: true, group: "Tags" },
  { key: "product", label: "Product", defaultVisible: false, group: "Tags" },
  { key: "theme", label: "Theme", defaultVisible: false, group: "Tags" },
  { key: "tags", label: "Tag Source", defaultVisible: true, group: "Tags" },
  // Performance
  { key: "spend", label: "Amount Spent", defaultVisible: true, group: "Performance" },
  { key: "roas", label: "Purchase ROAS", defaultVisible: true, group: "Performance" },
  { key: "cpa", label: "Cost per Result", defaultVisible: true, group: "Performance" },
  { key: "cpm", label: "CPM", defaultVisible: false, group: "Performance" },
  { key: "cpc", label: "CPC (Link Click)", defaultVisible: false, group: "Performance" },
  { key: "frequency", label: "Frequency", defaultVisible: false, group: "Performance" },
  { key: "cpmr", label: "CPMr (CPM × Freq)", defaultVisible: false, group: "Performance" },
  // Engagement
  { key: "ctr", label: "Unique CTR", defaultVisible: true, group: "Engagement" },
  { key: "impressions", label: "Impressions", defaultVisible: false, group: "Engagement" },
  { key: "clicks", label: "Clicks", defaultVisible: false, group: "Engagement" },
  { key: "hook_rate", label: "Hook Rate", defaultVisible: false, group: "Engagement" },
  { key: "hold_rate", label: "Hold Rate", defaultVisible: false, group: "Engagement" },
  { key: "video_views", label: "Video Views", defaultVisible: false, group: "Engagement" },
  { key: "video_avg_play_time", label: "Video Avg Play Time", defaultVisible: false, group: "Engagement" },
  // Commerce
  { key: "purchases", label: "Results (Purchases)", defaultVisible: false, group: "Commerce" },
  { key: "purchase_value", label: "Purchase Value", defaultVisible: false, group: "Commerce" },
  { key: "adds_to_cart", label: "Adds to Cart", defaultVisible: false, group: "Commerce" },
  { key: "cost_per_atc", label: "Cost per Add to Cart", defaultVisible: false, group: "Commerce" },
  // Context
  { key: "campaign", label: "Campaign", defaultVisible: false, group: "Context" },
  { key: "adset", label: "Ad Set", defaultVisible: false, group: "Context" },
];

const GROUP_BY_OPTIONS = [
  { value: "__none__", label: "No grouping" },
  { value: "ad_type", label: "Type" },
  { value: "person", label: "Person" },
  { value: "style", label: "Style" },
  { value: "hook", label: "Hook" },
  { value: "product", label: "Product" },
  { value: "theme", label: "Theme" },
];

// Map column keys to creative data fields for sorting
const SORT_FIELD_MAP: Record<string, string> = {
  creative: "ad_name", type: "ad_type", person: "person", style: "style", hook: "hook",
  product: "product", theme: "theme",
  spend: "spend", roas: "roas", cpa: "cpa", ctr: "ctr", impressions: "impressions",
  clicks: "clicks", purchases: "purchases", purchase_value: "purchase_value",
  cpm: "cpm", cpc: "cpc", frequency: "frequency",
  hook_rate: "thumb_stop_rate", hold_rate: "hold_rate",
  video_views: "video_views", video_avg_play_time: "video_avg_play_time",
  adds_to_cart: "adds_to_cart", cost_per_atc: "cost_per_add_to_cart",
  result_type: "result_type", cpmr: "_cpmr",
  campaign: "campaign_name", adset: "adset_name", ad_status: "ad_status",
};

import { useCreatives, useCreativeFilters, useBulkAnalyze } from "@/hooks/useCreatives";
import { useSync } from "@/hooks/useApi";
import { exportCreativesCSV } from "@/lib/csv";
import { useAccountContext } from "@/contexts/AccountContext";

const CreativesPage = () => {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(TABLE_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.key))
  );
  const toggleCol = useCallback((key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);
  const [delivery, setDelivery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [selectedCreative, setSelectedCreative] = useState<any>(null);
  const [groupBy, setGroupBy] = useState("__none__");
  const [sort, setSort] = useState<SortConfig>({ key: "", direction: null });
  const { selectedAccountId } = useAccountContext();

  const accountFilter = selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {};
  const allFilters = { ...accountFilter, ...filters, delivery, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) };
  const { data: creatives, isLoading } = useCreatives(allFilters);
  const { data: filterOptions } = useCreativeFilters();
  const syncMut = useSync();
  const bulkAnalyze = useBulkAnalyze();

  const unanalyzedCount = useMemo(() =>
    (creatives || []).filter((c: any) => c.analysis_status !== "analyzed" && (c.spend || 0) > 0).length,
    [creatives]
  );

  const untaggedCount = useMemo(() =>
    (creatives || []).filter((c: any) => c.tag_source === "untagged").length,
    [creatives]
  );

  const avgMetrics = useMemo(() => {
    const list = creatives || [];
    if (list.length === 0) return { roas: "—", cpa: "—", ctr: "—" };
    const withSpend = list.filter((c: any) => c.spend > 0);
    if (withSpend.length === 0) return { roas: "—", cpa: "—", ctr: "—" };
    const avg = (field: string) => {
      const vals = withSpend.map((c: any) => Number(c[field]) || 0);
      return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2);
    };
    return { roas: `${avg("roas")}x`, cpa: `$${avg("cpa")}`, ctr: `${avg("ctr")}%` };
  }, [creatives]);

  // Sorting
  const handleSort = useCallback((key: string) => {
    setSort(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  }, []);

  const sortedCreatives = useMemo(() => {
    const list = [...(creatives || [])].map((c: any) => ({
      ...c,
      _cpmr: (Number(c.cpm) || 0) * (Number(c.frequency) || 0),
    }));
    if (!sort.key || !sort.direction) return list;
    const field = SORT_FIELD_MAP[sort.key] || sort.key;
    const dir = sort.direction === "asc" ? 1 : -1;
    return list.sort((a: any, b: any) => {
      const va = a[field], vb = b[field];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" || !isNaN(Number(va))) return (Number(va) - Number(vb)) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [creatives, sort]);

  // Group-by aggregation
  const groupedData = useMemo(() => {
    if (groupBy === "__none__" || !sortedCreatives?.length) return null;
    const groups: Record<string, any[]> = {};
    sortedCreatives.forEach((c: any) => {
      const key = c[groupBy] || "(none)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).map(([name, items]) => {
      const withSpend = items.filter(c => (Number(c.spend) || 0) > 0);
      const totalSpend = items.reduce((s, c) => s + (Number(c.spend) || 0), 0);
      const avgField = (field: string) => withSpend.length > 0
        ? withSpend.reduce((s, c) => s + (Number(c[field]) || 0), 0) / withSpend.length : 0;
      return {
        name,
        count: items.length,
        totalSpend,
        avgRoas: avgField("roas"),
        avgCpa: avgField("cpa"),
        avgCtr: avgField("ctr"),
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [sortedCreatives, groupBy]);

  const fmt = (v: number | null, prefix = "", suffix = "") => {
    if (v === null || v === undefined || v === 0) return "—";
    return `${prefix}${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  };

  const updateFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val === "__all__") { delete next[key]; } else { next[key] = val; }
      return next;
    });
  };

  const renderSortableHead = (key: string, label: string, extraClass = "") => {
    if (!visibleCols.has(key)) return null;
    const numericCols = ["spend", "roas", "cpa", "ctr", "impressions", "clicks", "purchases", "purchase_value", "cpm", "cpc", "frequency", "cpmr", "video_views", "hook_rate", "hold_rate", "video_avg_play_time", "adds_to_cart", "cost_per_atc"];
    const isRight = numericCols.includes(key);
    return (
      <SortableTableHead
        key={key}
        label={label}
        sortKey={key}
        currentSort={sort}
        onSort={handleSort}
        className={isRight ? "text-right" : extraClass}
      />
    );
  };

  return (
    <AppLayout>
      <OnboardingBanner />
      <PageHeader
        title="Creatives"
        description="View and manage your ad creatives with performance data and tags."
        badge={
          untaggedCount > 0 ? (
            <Badge variant="outline" className="bg-tag-untagged/10 text-tag-untagged border-tag-untagged/30 text-xs">
              {untaggedCount} untagged
            </Badge>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md">
              <Button variant={viewMode === "card" ? "secondary" : "ghost"} size="sm" className="rounded-r-none px-2.5" onClick={() => setViewMode("card")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="rounded-l-none px-2.5" onClick={() => setViewMode("table")}>
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ColumnPicker columns={TABLE_COLUMNS} visibleColumns={visibleCols} onToggle={toggleCol} />
            <Button size="sm" onClick={() => syncMut.mutate({ account_id: "all" })} disabled={syncMut.isPending}>
              {syncMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Sync
            </Button>
            {unanalyzedCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => bulkAnalyze.mutate(20)} disabled={bulkAnalyze.isPending}>
                {bulkAnalyze.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Analyze ({unanalyzedCount})
              </Button>
            )}
            {creatives?.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => exportCreativesCSV(creatives)}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            )}
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Creatives" value={creatives?.length ?? 0} />
        <MetricCard label="Avg ROAS" value={avgMetrics.roas} />
        <MetricCard label="Avg CPA" value={avgMetrics.cpa} />
        <MetricCard label="Avg CTR" value={avgMetrics.ctr} />
      </div>

      {/* Delivery + Filters */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Delivery:</span>
        <Button variant={!delivery ? "outline" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDelivery("")}>All Ads</Button>
        <Button variant={delivery === "had_delivery" ? "outline" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDelivery("had_delivery")}>Had Delivery</Button>
        <Button variant={delivery === "active" ? "outline" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDelivery("active")}>Active Ads</Button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground mr-1">Date:</span>
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
        />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {filterOptions && (
          <>
            {(["ad_type", "person", "style", "hook"] as const).map((field) => (
              <Select key={field} value={filters[field] || "__all__"} onValueChange={(v) => updateFilter(field, v)}>
                <SelectTrigger className="w-32 h-8 text-xs bg-background">
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
              <SelectTrigger className="w-32 h-8 text-xs bg-background"><SelectValue placeholder="Tag source" /></SelectTrigger>
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

        {/* Group By */}
        {viewMode === "table" && (
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background">
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

      {/* Untagged warning */}
      {untaggedCount > 0 && untaggedCount / (creatives?.length || 1) > 0.2 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-tag-untagged/10 border border-tag-untagged/20 mb-4 text-xs">
          <AlertTriangle className="h-4 w-4 text-tag-untagged flex-shrink-0" />
          <span>{untaggedCount} creatives are untagged ({Math.round((untaggedCount / (creatives?.length || 1)) * 100)}%). Upload CSV mappings in Accounts or edit tags manually.</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !creatives?.length ? (
        <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4"><LayoutGrid className="h-6 w-6 text-muted-foreground" /></div>
          <h3 className="text-lg font-medium mb-1">No creatives yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">Add a Meta ad account in the Accounts tab and sync to pull in your creatives.</p>
        </div>
      ) : groupBy !== "__none__" && groupedData ? (
        /* Group-by aggregation view */
        <div className="glass-panel overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label}</TableHead>
                <TableHead className="text-xs text-right">Count</TableHead>
                <TableHead className="text-xs text-right">Total Spend</TableHead>
                <TableHead className="text-xs text-right">Avg ROAS</TableHead>
                <TableHead className="text-xs text-right">Avg CPA</TableHead>
                <TableHead className="text-xs text-right">Avg CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.map((g) => (
                <TableRow key={g.name}>
                  <TableCell className="text-xs font-medium">{g.name}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{g.count}</TableCell>
                  <TableCell className="text-xs text-right font-mono">${g.totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{g.avgRoas.toFixed(2)}x</TableCell>
                  <TableCell className="text-xs text-right font-mono">${g.avgCpa.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{g.avgCtr.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : viewMode === "table" ? (
        <div className="glass-panel overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                {renderSortableHead("creative", "Creative")}
                {renderSortableHead("ad_status", "Status")}
                {renderSortableHead("result_type", "Result Type")}
                {renderSortableHead("type", "Type")}
                {renderSortableHead("person", "Person")}
                {renderSortableHead("style", "Style")}
                {renderSortableHead("hook", "Hook")}
                {renderSortableHead("product", "Product")}
                {renderSortableHead("theme", "Theme")}
                {renderSortableHead("spend", "Spent")}
                {renderSortableHead("roas", "ROAS")}
                {renderSortableHead("cpa", "Cost/Result")}
                {renderSortableHead("cpm", "CPM")}
                {renderSortableHead("cpc", "CPC")}
                {renderSortableHead("frequency", "Frequency")}
                {renderSortableHead("cpmr", "CPMr")}
                {renderSortableHead("ctr", "Unique CTR")}
                {renderSortableHead("impressions", "Impressions")}
                {renderSortableHead("clicks", "Clicks")}
                {renderSortableHead("hook_rate", "Hook Rate")}
                {renderSortableHead("hold_rate", "Hold Rate")}
                {renderSortableHead("video_views", "Video Views")}
                {renderSortableHead("video_avg_play_time", "Avg Play Time")}
                {renderSortableHead("purchases", "Purchases")}
                {renderSortableHead("purchase_value", "Purchase Value")}
                {renderSortableHead("adds_to_cart", "Adds to Cart")}
                {renderSortableHead("cost_per_atc", "Cost/ATC")}
                {renderSortableHead("campaign", "Campaign")}
                {renderSortableHead("adset", "Ad Set")}
                {visibleCols.has("tags") && <TableHead className="text-xs">Tags</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCreatives.map((c: any) => (
                <TableRow key={c.ad_id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedCreative(c)}>
                  {visibleCols.has("creative") && (
                    <TableCell>
                      <div className="flex items-center gap-2.5 max-w-[280px]">
                        <div className="h-10 w-10 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {c.thumbnail_url ? (
                            <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{c.ad_name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{c.unique_code}</div>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleCols.has("ad_status") && <TableCell className="text-xs">{c.ad_status || "—"}</TableCell>}
                  {visibleCols.has("result_type") && <TableCell className="text-xs">{c.result_type || "—"}</TableCell>}
                  {visibleCols.has("type") && (
                    <TableCell>
                      <InlineTagSelect adId={c.ad_id} field="ad_type" currentValue={c.ad_type} />
                    </TableCell>
                  )}
                  {visibleCols.has("person") && (
                    <TableCell>
                      <InlineTagSelect adId={c.ad_id} field="person" currentValue={c.person} />
                    </TableCell>
                  )}
                  {visibleCols.has("style") && (
                    <TableCell>
                      <InlineTagSelect adId={c.ad_id} field="style" currentValue={c.style} />
                    </TableCell>
                  )}
                  {visibleCols.has("hook") && (
                    <TableCell>
                      <InlineTagSelect adId={c.ad_id} field="hook" currentValue={c.hook} />
                    </TableCell>
                  )}
                  {visibleCols.has("product") && <TableCell className="text-xs truncate max-w-[120px]">{c.product || "—"}</TableCell>}
                  {visibleCols.has("theme") && <TableCell className="text-xs truncate max-w-[120px]">{c.theme || "—"}</TableCell>}
                  {visibleCols.has("spend") && <TableCell className="text-xs text-right font-mono">{fmt(c.spend, "$")}</TableCell>}
                  {visibleCols.has("roas") && <TableCell className="text-xs text-right font-mono">{fmt(c.roas, "", "x")}</TableCell>}
                  {visibleCols.has("cpa") && <TableCell className="text-xs text-right font-mono">{fmt(c.cpa, "$")}</TableCell>}
                  {visibleCols.has("cpm") && <TableCell className="text-xs text-right font-mono">{fmt(c.cpm, "$")}</TableCell>}
                  {visibleCols.has("cpc") && <TableCell className="text-xs text-right font-mono">{fmt(c.cpc, "$")}</TableCell>}
                  {visibleCols.has("frequency") && <TableCell className="text-xs text-right font-mono">{fmt(c.frequency)}</TableCell>}
                  {visibleCols.has("cpmr") && <TableCell className="text-xs text-right font-mono">{fmt(c._cpmr, "$")}</TableCell>}
                  {visibleCols.has("ctr") && <TableCell className="text-xs text-right font-mono">{fmt(c.ctr, "", "%")}</TableCell>}
                  {visibleCols.has("impressions") && <TableCell className="text-xs text-right font-mono">{fmt(c.impressions)}</TableCell>}
                  {visibleCols.has("clicks") && <TableCell className="text-xs text-right font-mono">{fmt(c.clicks)}</TableCell>}
                  {visibleCols.has("hook_rate") && <TableCell className="text-xs text-right font-mono">{fmt(c.thumb_stop_rate, "", "%")}</TableCell>}
                  {visibleCols.has("hold_rate") && <TableCell className="text-xs text-right font-mono">{fmt(c.hold_rate, "", "%")}</TableCell>}
                  {visibleCols.has("video_views") && <TableCell className="text-xs text-right font-mono">{fmt(c.video_views)}</TableCell>}
                  {visibleCols.has("video_avg_play_time") && <TableCell className="text-xs text-right font-mono">{fmt(c.video_avg_play_time, "", "s")}</TableCell>}
                  {visibleCols.has("purchases") && <TableCell className="text-xs text-right font-mono">{fmt(c.purchases)}</TableCell>}
                  {visibleCols.has("purchase_value") && <TableCell className="text-xs text-right font-mono">{fmt(c.purchase_value, "$")}</TableCell>}
                  {visibleCols.has("adds_to_cart") && <TableCell className="text-xs text-right font-mono">{fmt(c.adds_to_cart)}</TableCell>}
                  {visibleCols.has("cost_per_atc") && <TableCell className="text-xs text-right font-mono">{fmt(c.cost_per_add_to_cart, "$")}</TableCell>}
                  {visibleCols.has("campaign") && <TableCell className="text-xs truncate max-w-[150px]">{c.campaign_name || "—"}</TableCell>}
                  {visibleCols.has("adset") && <TableCell className="text-xs truncate max-w-[150px]">{c.adset_name || "—"}</TableCell>}
                  {visibleCols.has("tags") && <TableCell><TagSourceBadge source={c.tag_source} /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          {sortedCreatives.map((c: any) => (
            <div key={c.ad_id} className="glass-panel p-3 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedCreative(c)}>
              <div className="bg-muted rounded h-28 mb-2 flex items-center justify-center overflow-hidden">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">{c.unique_code}</span>
                <TagSourceBadge source={c.tag_source} />
              </div>
              <p className="text-xs font-medium truncate mb-2">{c.ad_name}</p>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div><div className="text-[9px] text-muted-foreground">ROAS</div><div className="text-xs font-mono font-medium">{fmt(c.roas, "", "x")}</div></div>
                <div><div className="text-[9px] text-muted-foreground">CPA</div><div className="text-xs font-mono font-medium">{fmt(c.cpa, "$")}</div></div>
                <div><div className="text-[9px] text-muted-foreground">Spend</div><div className="text-xs font-mono font-medium">{fmt(c.spend, "$")}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreativeDetailModal
        creative={selectedCreative}
        open={!!selectedCreative}
        onClose={() => setSelectedCreative(null)}
      />
    </AppLayout>
  );
};

export default CreativesPage;
