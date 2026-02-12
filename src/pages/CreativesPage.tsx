import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { CreativeDetailModal } from "@/components/CreativeDetailModal";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { DateRangeFilter } from "@/components/DateRangeFilter";
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
import { RefreshCw, LayoutGrid, List, Loader2, AlertTriangle, Sparkles, Download } from "lucide-react";
import { useState, useMemo } from "react";
import { useCreatives, useCreativeFilters, useBulkAnalyze } from "@/hooks/useCreatives";
import { useSync } from "@/hooks/useApi";
import { exportCreativesCSV } from "@/lib/csv";

const CreativesPage = () => {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [delivery, setDelivery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [selectedCreative, setSelectedCreative] = useState<any>(null);

  const allFilters = { ...filters, delivery, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) };
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
      ) : viewMode === "table" ? (
        <div className="glass-panel overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Creative</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Person</TableHead>
                <TableHead className="text-xs">Style</TableHead>
                <TableHead className="text-xs">Hook</TableHead>
                <TableHead className="text-xs text-right">Spend</TableHead>
                <TableHead className="text-xs text-right">ROAS</TableHead>
                <TableHead className="text-xs text-right">CPA</TableHead>
                <TableHead className="text-xs text-right">CTR</TableHead>
                <TableHead className="text-xs">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatives.map((c: any) => (
                <TableRow key={c.ad_id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedCreative(c)}>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="text-xs font-medium truncate">{c.ad_name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{c.unique_code}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{c.ad_type || "—"}</TableCell>
                  <TableCell className="text-xs">{c.person || "—"}</TableCell>
                  <TableCell className="text-xs">{c.style || "—"}</TableCell>
                  <TableCell className="text-xs">{c.hook || "—"}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(c.spend, "$")}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(c.roas, "", "x")}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(c.cpa, "$")}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(c.ctr, "", "%")}</TableCell>
                  <TableCell><TagSourceBadge source={c.tag_source} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          {creatives.map((c: any) => (
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
