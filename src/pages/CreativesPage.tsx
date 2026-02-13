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
import { Input } from "@/components/ui/input";
import { RefreshCw, LayoutGrid, List, Loader2, Download, Search, X } from "lucide-react";
import { useMemo } from "react";
import { useCreatives, CREATIVES_PAGE_SIZE, useCreativeFilters } from "@/hooks/useCreatives";
import { useSync } from "@/hooks/useApi";
import { exportCreativesCSV } from "@/lib/csv";
import { useCreativesPageState } from "@/hooks/useCreativesPageState";

const CreativesPage = () => {
  const state = useCreativesPageState();
  const {
    viewMode, setViewMode, visibleCols, toggleCol, columnOrder, handleReorder,
    filters, updateFilter, dateFrom, dateTo, setDateFrom, setDateTo,
    selectedCreativeId, setSelectedCreativeId, groupBy, setGroupBy,
    sort, handleSort, page, setPage, searchInput, setSearchInput, search,
    selectedAccountId, allFilters,
  } = state;

  const { data: creativesResult, isLoading } = useCreatives(allFilters, page);
  const creatives = creativesResult?.data || [];
  const totalCreatives = creativesResult?.total || 0;
  const totalPages = Math.ceil(totalCreatives / CREATIVES_PAGE_SIZE);
  const { data: filterOptions } = useCreativeFilters();
  const syncMut = useSync();

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
            {creatives.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => exportCreativesCSV(creatives)}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
            )}
            <SaveViewButton getConfig={() => ({
              page: "/",
              ...(selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
              ...(groupBy !== "__none__" ? { group_by: groupBy } : {}),
              ...(search ? { search } : {}),
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
