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
import { RefreshCw, LayoutGrid, List, Loader2, AlertTriangle, Sparkles, Download, Layers, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ColumnPicker, type ColumnDef } from "@/components/ColumnPicker";

const TABLE_COLUMNS: ColumnDef[] = [
  // Core
  { key: "creative", label: "Creative", defaultVisible: true, group: "Core" },
  { key: "ad_status", label: "Delivery Status", defaultVisible: false, group: "Core" },
  { key: "result_type", label: "Result Type", defaultVisible: false, group: "Core" },
  // Tags
  { key: "type", label: "Type", defaultVisible: false, group: "Tags" },
  { key: "person", label: "Person", defaultVisible: false, group: "Tags" },
  { key: "style", label: "Style", defaultVisible: false, group: "Tags" },
  { key: "hook", label: "Hook", defaultVisible: false, group: "Tags" },
  { key: "product", label: "Product", defaultVisible: false, group: "Tags" },
  { key: "theme", label: "Theme", defaultVisible: false, group: "Tags" },
  { key: "tags", label: "Tag Source", defaultVisible: false, group: "Tags" },
  // Performance
  { key: "spend", label: "Spent", defaultVisible: true, group: "Performance" },
  { key: "cpa", label: "Cost/Result", defaultVisible: true, group: "Performance" },
  { key: "cpm", label: "CPM", defaultVisible: true, group: "Performance" },
  { key: "cpc", label: "CPC", defaultVisible: true, group: "Performance" },
  { key: "frequency", label: "Frequency", defaultVisible: true, group: "Performance" },
  { key: "cpmr", label: "CPMr", defaultVisible: true, group: "Performance" },
  { key: "roas", label: "Purchase ROAS", defaultVisible: false, group: "Performance" },
  // Engagement
  { key: "ctr", label: "Unique CTR", defaultVisible: true, group: "Engagement" },
  { key: "hook_rate", label: "Hook Rate", defaultVisible: true, group: "Engagement" },
  { key: "hold_rate", label: "Hold Rate", defaultVisible: true, group: "Engagement" },
  { key: "impressions", label: "Impressions", defaultVisible: false, group: "Engagement" },
  { key: "clicks", label: "Clicks", defaultVisible: false, group: "Engagement" },
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

import { useCreatives, useCreativeFilters, useBulkAnalyze, CREATIVES_PAGE_SIZE } from "@/hooks/useCreatives";
import { useSync } from "@/hooks/useApi";
import { exportCreativesCSV } from "@/lib/csv";
import { useAccountContext } from "@/contexts/AccountContext";

const CreativesPage = () => {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("creatives_visible_columns");
    if (saved) {
      try {
        return new Set(JSON.parse(saved) as string[]);
      } catch { /* fall through */ }
    }
    return new Set(TABLE_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.key));
  });
  const toggleCol = useCallback((key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem("creatives_visible_columns", JSON.stringify([...next]));
      return next;
    });
  }, []);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("creatives_column_order");
    if (saved) {
      try { return JSON.parse(saved) as string[]; } catch { /* fall through */ }
    }
    return TABLE_COLUMNS.map(c => c.key);
  });
  const handleReorder = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
    localStorage.setItem("creatives_column_order", JSON.stringify(newOrder));
  }, []);
  const [delivery, setDelivery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [selectedCreative, setSelectedCreative] = useState<any>(null);
  const [groupBy, setGroupBy] = useState("__none__");
  const [sort, setSort] = useState<SortConfig>({ key: "", direction: null });
  const [dragSourceKey, setDragSourceKey] = useState<string | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { selectedAccountId } = useAccountContext();

  // Debounce search input
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchInput]);

  const accountFilter = selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {};
  const allFilters = { ...accountFilter, ...filters, delivery, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), ...(search ? { search } : {}) };
  const { data: creativesResult, isLoading } = useCreatives(allFilters, page);
  const creatives = creativesResult?.data || [];
  const totalCreatives = creativesResult?.total || 0;
  const totalPages = Math.ceil(totalCreatives / CREATIVES_PAGE_SIZE);
  const { data: filterOptions } = useCreativeFilters();
  const syncMut = useSync();
  const bulkAnalyze = useBulkAnalyze();

  const unanalyzedCount = useMemo(() =>
    creatives.filter((c: any) => c.analysis_status !== "analyzed" && (c.spend || 0) > 0).length,
    [creatives]
  );

  const untaggedCount = useMemo(() =>
    creatives.filter((c: any) => c.tag_source === "untagged").length,
    [creatives]
  );

  const avgMetrics = useMemo(() => {
    const list = creatives;
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
    const list = [...creatives].map((c: any) => ({
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

  const fmt = (v: number | null | undefined, prefix = "", suffix = "", decimals = 2) => {
    if (v === null || v === undefined) return "—";
    const n = Number(v);
    if (isNaN(n)) return "—";
    return `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  };

  const updateFilter = (key: string, val: string) => {
    setPage(0);
    setFilters((prev) => {
      const next = { ...prev };
      if (val === "__all__") { delete next[key]; } else { next[key] = val; }
      return next;
    });
  };

  const handleColumnDragStart = useCallback((key: string) => {
    setDragSourceKey(key);
  }, []);

  const handleColumnDragOver = useCallback((_e: React.DragEvent, key: string) => {
    setDragTargetKey(key);
  }, []);

  const handleColumnDrop = useCallback((targetKey: string) => {
    if (dragSourceKey && dragSourceKey !== targetKey) {
      const newOrder = [...columnOrder];
      const fromIdx = newOrder.indexOf(dragSourceKey);
      const toIdx = newOrder.indexOf(targetKey);
      if (fromIdx !== -1 && toIdx !== -1) {
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, dragSourceKey);
        handleReorder(newOrder);
      }
    }
    setDragSourceKey(null);
    setDragTargetKey(null);
  }, [dragSourceKey, columnOrder, handleReorder]);

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
        draggable
        onDragStart={handleColumnDragStart}
        onDragOver={handleColumnDragOver}
        onDrop={handleColumnDrop}
        isDragTarget={dragTargetKey === key && dragSourceKey !== key}
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
            <ColumnPicker columns={TABLE_COLUMNS} visibleColumns={visibleCols} onToggle={toggleCol} columnOrder={columnOrder} onReorder={handleReorder} />
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
            {creatives.length > 0 && (
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
        <MetricCard label="Total Creatives" value={totalCreatives} />
        <MetricCard label="Avg ROAS" value={avgMetrics.roas} />
        <MetricCard label="Avg CPA" value={avgMetrics.cpa} />
        <MetricCard label="Avg CTR" value={avgMetrics.ctr} />
      </div>

      {/* Search */}
      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by ad name, code, or campaign…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 text-xs pl-8 pr-8"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
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
      {untaggedCount > 0 && untaggedCount / (creatives.length || 1) > 0.2 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-tag-untagged/10 border border-tag-untagged/20 mb-4 text-xs">
          <AlertTriangle className="h-4 w-4 text-tag-untagged flex-shrink-0" />
          <span>{untaggedCount} creatives are untagged ({Math.round((untaggedCount / (creatives.length || 1)) * 100)}%). Upload CSV mappings in Accounts or edit tags manually.</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : creatives.length === 0 ? (
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
                  <TableCell className="text-xs text-right">{g.count}</TableCell>
                  <TableCell className="text-xs text-right">${g.totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-xs text-right">{g.avgRoas.toFixed(2)}x</TableCell>
                  <TableCell className="text-xs text-right">${g.avgCpa.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-right">{g.avgCtr.toFixed(2)}%</TableCell>
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
                {columnOrder.filter(k => visibleCols.has(k)).map(key => {
                  const headLabels: Record<string, string> = {
                    creative: "Creative", ad_status: "Status", result_type: "Result Type",
                    type: "Type", person: "Person", style: "Style", hook: "Hook",
                    product: "Product", theme: "Theme", tags: "Tags",
                    spend: "Spent", roas: "ROAS", cpa: "Cost/Result", cpm: "CPM",
                    cpc: "CPC", frequency: "Frequency", cpmr: "CPMr",
                    ctr: "Unique CTR", impressions: "Impressions", clicks: "Clicks",
                    hook_rate: "Hook Rate", hold_rate: "Hold Rate",
                    video_views: "Video Views", video_avg_play_time: "Avg Play Time",
                    purchases: "Purchases", purchase_value: "Purchase Value",
                    adds_to_cart: "Adds to Cart", cost_per_atc: "Cost/ATC",
                    campaign: "Campaign", adset: "Ad Set",
                  };
                  if (key === "tags") return <TableHead key={key} className="text-xs">Tags</TableHead>;
                  return renderSortableHead(key, headLabels[key] || key);
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCreatives.map((c: any) => (
                <TableRow key={c.ad_id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedCreative(c)}>
                  {columnOrder.filter(k => visibleCols.has(k)).map(key => {
                    const cellRenderers: Record<string, () => React.ReactNode> = {
                      creative: () => (
                        <TableCell key={key}>
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
                      ),
                      ad_status: () => <TableCell key={key} className="text-xs">{c.ad_status || "—"}</TableCell>,
                      result_type: () => <TableCell key={key} className="text-xs">{c.result_type || "—"}</TableCell>,
                      type: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="ad_type" currentValue={c.ad_type} /></TableCell>,
                      person: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="person" currentValue={c.person} /></TableCell>,
                      style: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="style" currentValue={c.style} /></TableCell>,
                      hook: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="hook" currentValue={c.hook} /></TableCell>,
                      product: () => <TableCell key={key} className="text-xs truncate max-w-[120px]">{c.product || "—"}</TableCell>,
                      theme: () => <TableCell key={key} className="text-xs truncate max-w-[120px]">{c.theme || "—"}</TableCell>,
                      spend: () => <TableCell key={key} className="text-xs text-right">{fmt(c.spend, "$")}</TableCell>,
                      roas: () => <TableCell key={key} className="text-xs text-right">{fmt(c.roas, "", "x")}</TableCell>,
                      cpa: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cpa, "$")}</TableCell>,
                      cpm: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cpm, "$")}</TableCell>,
                      cpc: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cpc, "$")}</TableCell>,
                      frequency: () => <TableCell key={key} className="text-xs text-right">{fmt(c.frequency, "", "", 1)}</TableCell>,
                      cpmr: () => <TableCell key={key} className="text-xs text-right">{fmt(c._cpmr, "$")}</TableCell>,
                      ctr: () => <TableCell key={key} className="text-xs text-right">{fmt(c.ctr, "", "%")}</TableCell>,
                      impressions: () => <TableCell key={key} className="text-xs text-right">{fmt(c.impressions, "", "", 0)}</TableCell>,
                      clicks: () => <TableCell key={key} className="text-xs text-right">{fmt(c.clicks, "", "", 0)}</TableCell>,
                      hook_rate: () => <TableCell key={key} className="text-xs text-right">{fmt(c.thumb_stop_rate, "", "%")}</TableCell>,
                      hold_rate: () => <TableCell key={key} className="text-xs text-right">{fmt(c.hold_rate, "", "%")}</TableCell>,
                      video_views: () => <TableCell key={key} className="text-xs text-right">{fmt(c.video_views, "", "", 0)}</TableCell>,
                      video_avg_play_time: () => <TableCell key={key} className="text-xs text-right">{fmt(c.video_avg_play_time, "", "s", 1)}</TableCell>,
                      purchases: () => <TableCell key={key} className="text-xs text-right">{fmt(c.purchases, "", "", 0)}</TableCell>,
                      purchase_value: () => <TableCell key={key} className="text-xs text-right">{fmt(c.purchase_value, "$")}</TableCell>,
                      adds_to_cart: () => <TableCell key={key} className="text-xs text-right">{fmt(c.adds_to_cart, "", "", 0)}</TableCell>,
                      cost_per_atc: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cost_per_add_to_cart, "$")}</TableCell>,
                      campaign: () => <TableCell key={key} className="text-xs truncate max-w-[150px]">{c.campaign_name || "—"}</TableCell>,
                      adset: () => <TableCell key={key} className="text-xs truncate max-w-[150px]">{c.adset_name || "—"}</TableCell>,
                      tags: () => <TableCell key={key}><TagSourceBadge source={c.tag_source} /></TableCell>,
                    };
                    const renderer = cellRenderers[key];
                    return renderer ? renderer() : null;
                  })}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Showing {page * CREATIVES_PAGE_SIZE + 1}–{Math.min((page + 1) * CREATIVES_PAGE_SIZE, totalCreatives)} of {totalCreatives.toLocaleString()}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />Prev
            </Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
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
