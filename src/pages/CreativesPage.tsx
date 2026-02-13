import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { CreativeDetailModal } from "@/components/CreativeDetailModal";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { CreativesTable } from "@/components/creatives/CreativesTable";
import { CreativesCardGrid } from "@/components/creatives/CreativesCardGrid";
import { CreativesGroupTable } from "@/components/creatives/CreativesGroupTable";
import { CreativesFilters } from "@/components/creatives/CreativesFilters";
import { CreativesPagination } from "@/components/creatives/CreativesPagination";
import { TABLE_COLUMNS, SORT_FIELD_MAP } from "@/components/creatives/constants";
import { ColumnPicker } from "@/components/ColumnPicker";
import { SaveViewButton } from "@/components/SaveViewButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, LayoutGrid, List, Loader2, AlertTriangle, Sparkles, Download, Search, X } from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { type SortConfig } from "@/components/SortableTableHead";
import { useCreatives, useCreativeFilters, useBulkAnalyze, CREATIVES_PAGE_SIZE } from "@/hooks/useCreatives";
import { useSync } from "@/hooks/useApi";
import { exportCreativesCSV } from "@/lib/csv";
import { useAccountContext } from "@/contexts/AccountContext";
import { useSearchParams } from "react-router-dom";

const CreativesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("creatives_visible_columns");
    if (saved) { try { return new Set(JSON.parse(saved) as string[]); } catch { /* fall through */ } }
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
    if (saved) { try { return JSON.parse(saved) as string[]; } catch { /* fall through */ } }
    return TABLE_COLUMNS.map(c => c.key);
  });
  const handleReorder = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
    localStorage.setItem("creatives_column_order", JSON.stringify(newOrder));
  }, []);
  const [delivery, setDelivery] = useState(() => searchParams.get("delivery") || "had_delivery");
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const raw = searchParams.get("filters");
    if (raw) { try { return JSON.parse(raw); } catch { /* fall through */ } }
    return {};
  });
  const [dateFrom, setDateFrom] = useState<string | undefined>(() => searchParams.get("from") || undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(() => searchParams.get("to") || undefined);
  const [selectedCreativeId, setSelectedCreativeId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState(() => searchParams.get("group") || "__none__");
  const [sort, setSort] = useState<SortConfig>({ key: "", direction: null });
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { selectedAccountId } = useAccountContext();

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (delivery) params.set("delivery", delivery);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (groupBy !== "__none__") params.set("group", groupBy);
    if (Object.keys(filters).length > 0) params.set("filters", JSON.stringify(filters));
    setSearchParams(params, { replace: true });
  }, [search, delivery, dateFrom, dateTo, groupBy, filters, setSearchParams]);

  const accountFilter = selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {};
  const allFilters = { ...accountFilter, ...filters, delivery, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), ...(search ? { search } : {}) };
  const { data: creativesResult, isLoading } = useCreatives(allFilters, page);
  const creatives = creativesResult?.data || [];
  const totalCreatives = creativesResult?.total || 0;
  const totalPages = Math.ceil(totalCreatives / CREATIVES_PAGE_SIZE);
  const { data: filterOptions } = useCreativeFilters();
  const syncMut = useSync();
  const bulkAnalyze = useBulkAnalyze();

  const unanalyzedCount = useMemo(() => creatives.filter((c: any) => c.analysis_status !== "analyzed" && (c.spend || 0) > 0).length, [creatives]);
  const untaggedCount = useMemo(() => creatives.filter((c: any) => c.tag_source === "untagged").length, [creatives]);

  const avgMetrics = useMemo(() => {
    if (creatives.length === 0) return { roas: "—", cpa: "—", totalSpend: "—" };
    const withSpend = creatives.filter((c: any) => c.spend > 0);
    if (withSpend.length === 0) return { roas: "—", cpa: "—", totalSpend: "—" };
    const avg = (field: string) => {
      const vals = withSpend.map((c: any) => Number(c[field]) || 0);
      return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2);
    };
    const total = withSpend.reduce((s: number, c: any) => s + (Number(c.spend) || 0), 0);
    return { roas: `${avg("roas")}x`, cpa: `$${avg("cpa")}`, totalSpend: `$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` };
  }, [creatives]);

  const handleSort = useCallback((key: string) => {
    setSort(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  }, []);

  const sortedCreatives = useMemo(() => {
    const list = [...creatives].map((c: any) => ({ ...c, _cpmr: (Number(c.cpm) || 0) * (Number(c.frequency) || 0) }));
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

  const groupedData = useMemo(() => {
    if (groupBy === "__none__" || !sortedCreatives?.length) return null;
    const groups: Record<string, any[]> = {};
    sortedCreatives.forEach((c: any) => { const key = c[groupBy] || "(none)"; if (!groups[key]) groups[key] = []; groups[key].push(c); });
    return Object.entries(groups).map(([name, items]) => {
      const withSpend = items.filter(c => (Number(c.spend) || 0) > 0);
      const totalSpend = items.reduce((s, c) => s + (Number(c.spend) || 0), 0);
      const avgField = (field: string) => withSpend.length > 0 ? withSpend.reduce((s, c) => s + (Number(c[field]) || 0), 0) / withSpend.length : 0;
      return { name, count: items.length, totalSpend, avgRoas: avgField("roas"), avgCpa: avgField("cpa"), avgSpend: withSpend.length > 0 ? totalSpend / withSpend.length : 0 };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [sortedCreatives, groupBy]);

  const updateFilter = (key: string, val: string) => {
    setPage(0);
    setFilters(prev => { const next = { ...prev }; if (val === "__all__") delete next[key]; else next[key] = val; return next; });
  };

  return (
    <AppLayout>
      <OnboardingBanner />
      <PageHeader
        title="Creatives"
        description="View and manage your ad creatives with performance data and tags."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md">
              <Button variant={viewMode === "card" ? "secondary" : "ghost"} size="sm" className="rounded-r-none px-2.5" onClick={() => setViewMode("card")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="rounded-l-none px-2.5" onClick={() => setViewMode("table")}><List className="h-3.5 w-3.5" /></Button>
            </div>
            <ColumnPicker columns={TABLE_COLUMNS} visibleColumns={visibleCols} onToggle={toggleCol} columnOrder={columnOrder} onReorder={handleReorder} />
            <Button size="sm" onClick={() => syncMut.mutate({ account_id: "all" })} disabled={syncMut.isPending}>
              {syncMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}Sync
            </Button>
            {unanalyzedCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => bulkAnalyze.mutate(20)} disabled={bulkAnalyze.isPending}>
                {bulkAnalyze.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}Analyze ({unanalyzedCount})
              </Button>
            )}
            {creatives.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => exportCreativesCSV(creatives)}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
            )}
            <SaveViewButton getConfig={() => ({
              page: "/",
              ...(selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
              ...(groupBy !== "__none__" ? { group_by: groupBy } : {}),
              ...(search ? { search } : {}),
              ...(delivery ? { delivery } : {}),
              ...(dateFrom ? { date_from: dateFrom } : {}),
              ...(dateTo ? { date_to: dateTo } : {}),
              ...(Object.keys(filters).length > 0 ? { filters } : {}),
            })} />
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Ad Spend" value={avgMetrics.totalSpend} />
        <MetricCard label="Total Creatives" value={totalCreatives} />
        <MetricCard label="Avg CPA" value={avgMetrics.cpa} />
        <MetricCard label="Avg ROAS" value={avgMetrics.roas} />
      </div>

      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search by ad name, code, or campaign…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="h-8 text-xs pl-8 pr-8" />
        {searchInput && (
          <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <CreativesFilters
        delivery={delivery} setDelivery={setDelivery}
        dateFrom={dateFrom} dateTo={dateTo} onDateChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
        filters={filters} updateFilter={updateFilter} filterOptions={filterOptions}
        groupBy={groupBy} setGroupBy={setGroupBy} viewMode={viewMode}
      />


      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : creatives.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4"><LayoutGrid className="h-6 w-6 text-muted-foreground" /></div>
          <h3 className="text-lg font-medium mb-1">No creatives yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">Add a Meta ad account in the Accounts tab and sync to pull in your creatives.</p>
        </div>
      ) : groupBy !== "__none__" && groupedData ? (
        <CreativesGroupTable groupBy={groupBy} data={groupedData} />
      ) : viewMode === "table" ? (
        <CreativesTable
          creatives={sortedCreatives} visibleCols={visibleCols} columnOrder={columnOrder}
          sort={sort} onSort={handleSort} onReorder={handleReorder} onSelect={(c: any) => setSelectedCreativeId(c.ad_id)}
        />
      ) : (
        <CreativesCardGrid creatives={sortedCreatives} onSelect={(c: any) => setSelectedCreativeId(c.ad_id)} />
      )}

      <CreativesPagination page={page} totalPages={totalPages} totalItems={totalCreatives} pageSize={CREATIVES_PAGE_SIZE} onPageChange={setPage} />

      <CreativeDetailModal creative={creatives.find((c: any) => c.ad_id === selectedCreativeId) || null} open={!!selectedCreativeId} onClose={() => setSelectedCreativeId(null)} />
    </AppLayout>
  );
};

export default CreativesPage;
