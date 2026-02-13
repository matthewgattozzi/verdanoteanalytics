import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Info, TrendingUp, MousePointerClick, Eye, ChevronDown, ChevronUp, Trophy, Repeat } from "lucide-react";
import {
  calculateBenchmarks,
  diagnoseCreatives,
  DIAGNOSTIC_META,
  type Benchmarks,
  type DiagnosedCreative,
  type DiagnosticType,
} from "@/lib/iterationDiagnostics";

interface IterationsTabProps {
  creatives: any[];
  spendThreshold: number;
  onCreativeClick?: (creative: any) => void;
}

type SortKey = "priority" | "spend" | "hookRate" | "holdRate" | "ctr";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "priority", label: "Priority Score" },
  { value: "spend", label: "Spend" },
  { value: "hookRate", label: "Hook Rate" },
  { value: "holdRate", label: "Hold Rate" },
  { value: "ctr", label: "CTR" },
];

const DIAGNOSTIC_FILTERS: { value: DiagnosticType | "all"; label: string }[] = [
  { value: "all", label: "All Diagnostics" },
  { value: "weak_hook", label: "Weak Hook" },
  { value: "weak_body", label: "Weak Body" },
  { value: "weak_cta", label: "Weak CTA" },
  { value: "weak_hook_body", label: "Weak Hook + Body" },
  { value: "landing_page_issue", label: "Landing Page Issue?" },
  { value: "all_weak", label: "Full Rebuild" },
  { value: "weak_cta_image", label: "Weak CTR (Image)" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
];

function MetricDot({ level }: { level: "strong" | "average" | "weak" }) {
  const cls =
    level === "strong"
      ? "bg-success"
      : level === "weak"
      ? "bg-destructive"
      : "bg-warning";
  return <span className={`status-dot ${cls} mr-1.5`} />;
}

function BenchmarkBar({ benchmarks }: { benchmarks: Benchmarks }) {
  const [open, setOpen] = useState(true);
  const metrics = [
    { label: "Hook Rate", data: benchmarks.hookRate, icon: Eye },
    { label: "Hold Rate", data: benchmarks.holdRate, icon: TrendingUp },
    { label: "CTR", data: benchmarks.ctr, icon: MousePointerClick },
  ];

  return (
    <div className="glass-panel p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full md:pointer-events-none"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Account Benchmarks</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Benchmarks are calculated from all active ads in this account, weighted by spend. Updated each time you sync.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="md:hidden">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 ${open ? "" : "hidden md:grid"}`}>
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <m.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">{m.label}: <span className="font-mono">{m.data.median.toFixed(2)}%</span></p>
              <p className="text-[10px] text-muted-foreground font-mono">
                25th: {m.data.p25.toFixed(2)}% &nbsp;|&nbsp; 75th: {m.data.p75.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TopPerformersProps {
  creatives: any[];
  benchmarks: Benchmarks;
  minSpend: number;
  onCreativeClick?: (creative: any) => void;
}

function TopPerformers({ creatives, benchmarks, minSpend, onCreativeClick }: TopPerformersProps) {
  const tops = useMemo(() => {
    const qualified = creatives.filter((c: any) => (Number(c.spend) || 0) >= minSpend);

    const isImageAd = (c: any) => {
      const adType = (c.ad_type || "").toLowerCase();
      const adName = (c.ad_name || "").toLowerCase();
      return adType === "image" || adType === "carousel" || adType === "static" ||
        adName.includes("static") ||
        (adType !== "video" && (Number(c.thumb_stop_rate) || 0) === 0 && (Number(c.hold_rate) || 0) === 0);
    };

    const videoOnly = qualified.filter((c) => !isImageAd(c));

    const byHook = [...videoOnly]
      .filter((c) => (Number(c.thumb_stop_rate) || 0) > 0)
      .sort((a, b) => (Number(b.thumb_stop_rate) || 0) - (Number(a.thumb_stop_rate) || 0))
      .slice(0, 5);

    const byHold = [...videoOnly]
      .filter((c) => (Number(c.hold_rate) || 0) > 0)
      .sort((a, b) => (Number(b.hold_rate) || 0) - (Number(a.hold_rate) || 0))
      .slice(0, 5);

    const byCtr = [...qualified]
      .filter((c) => (Number(c.ctr) || 0) > 0)
      .sort((a, b) => (Number(b.ctr) || 0) - (Number(a.ctr) || 0))
      .slice(0, 5);

    return { byHook, byHold, byCtr };
  }, [creatives, minSpend]);

  const sections = [
    { title: "Best Hook Rates", subtitle: "These hooks stop the scroll — duplicate the opening approach", icon: Eye, items: tops.byHook, metric: "thumb_stop_rate", label: "Hook Rate" },
    { title: "Best Hold Rates", subtitle: "These keep viewers watching — replicate the pacing and structure", icon: TrendingUp, items: tops.byHold, metric: "hold_rate", label: "Hold Rate" },
    { title: "Best CTRs", subtitle: "These drive clicks — reuse the CTA approach and end card style", icon: MousePointerClick, items: tops.byCtr, metric: "ctr", label: "CTR" },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-1">
            <section.icon className="h-4 w-4 text-success" />
            <h3 className="text-sm font-semibold">{section.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{section.subtitle}</p>

          {section.items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No qualifying ads with this metric.</p>
          ) : (
            <div className="space-y-2">
              {section.items.map((c: any, i: number) => {
                const val = Number(c[section.metric]) || 0;
                return (
                  <div
                    key={c.ad_id}
                    className="glass-panel p-3 border-l-2 border-l-success cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => onCreativeClick?.(c)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">#{i + 1}</Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs font-medium truncate">{c.ad_name}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm text-xs">{c.ad_name}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.hook && <Badge variant="outline" className="text-[10px]">{c.hook}</Badge>}
                        {c.style && <Badge variant="outline" className="text-[10px]">{c.style}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{section.label}: <span className="font-mono text-success font-medium">{val.toFixed(2)}%</span></span>
                      <span>Spend: <span className="font-mono text-foreground">${(Number(c.spend) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                      <span>ROAS: <span className="font-mono text-foreground">{(Number(c.roas) || 0).toFixed(2)}x</span></span>
                      {c.person && <span>Person: <span className="text-foreground">{c.person}</span></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IterationCard({ item, onClick }: { item: DiagnosedCreative; onClick?: () => void }) {
  const meta = DIAGNOSTIC_META[item.diagnostic];

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-medium truncate">{item.ad_name}</p>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-xs">{item.ad_name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              item.priorityLabel === "High"
                ? "border-destructive text-destructive"
                : item.priorityLabel === "Medium"
                ? "border-warning text-warning"
                : "border-muted-foreground text-muted-foreground"
            }`}
          >
            {item.priorityLabel}
          </Badge>
        </div>
      </div>

      {/* Metrics row */}
      <div className={`grid grid-cols-1 ${item.isImage ? "sm:grid-cols-1 max-w-[200px]" : "sm:grid-cols-3"} gap-2`}>
        {item.isImage ? (
          <div className="bg-muted/40 rounded-md px-3 py-2 flex items-center gap-2">
            <MetricDot level={item.ctrLevel} />
            <div>
              <p className="metric-label">CTR</p>
              <p className="text-sm font-mono font-medium">{item.ctr.toFixed(2)}%</p>
            </div>
          </div>
        ) : (
          ([
            { label: "Hook Rate", value: item.hookRate, level: item.hookLevel },
            { label: "Hold Rate", value: item.holdRate, level: item.holdLevel },
            { label: "CTR", value: item.ctr, level: item.ctrLevel },
          ] as const).map((m) => (
            <div key={m.label} className="bg-muted/40 rounded-md px-3 py-2 flex items-center gap-2">
              <MetricDot level={m.level} />
              <div>
                <p className="metric-label">{m.label}</p>
                <p className="text-sm font-mono font-medium">{m.value.toFixed(2)}%</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Context row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Spend: <span className="font-mono text-foreground">${item.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
        <span>ROAS: <span className="font-mono text-foreground">{item.roas.toFixed(2)}</span></span>
        <span>CPA: <span className="font-mono text-foreground">${item.cpa.toFixed(2)}</span></span>
        <span>Frequency: <span className="font-mono text-foreground">{item.frequency.toFixed(1)}</span></span>
      </div>

      {/* Recommendation */}
      <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
        {item.recommendation}
      </p>
    </div>
  );
}

export function IterationsTab({ creatives, spendThreshold, onCreativeClick }: IterationsTabProps) {
  const [diagnosticFilter, setDiagnosticFilter] = useState<DiagnosticType | "all">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [minSpendOverride, setMinSpendOverride] = useState<string>("");

  const effectiveMinSpend = minSpendOverride !== "" ? Number(minSpendOverride) || 0 : spendThreshold;

  const benchmarks = useMemo(() => calculateBenchmarks(creatives), [creatives]);

  const diagnosed = useMemo(
    () => diagnoseCreatives(creatives, benchmarks, effectiveMinSpend),
    [creatives, benchmarks, effectiveMinSpend]
  );

  const filtered = useMemo(() => {
    let list = diagnosed;
    if (diagnosticFilter !== "all") {
      list = list.filter((d) => d.diagnostic === diagnosticFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((d) => d.ad_status?.toUpperCase() === statusFilter);
    }

    const sorted = [...list];
    switch (sortBy) {
      case "spend":
        sorted.sort((a, b) => b.spend - a.spend);
        break;
      case "hookRate":
        sorted.sort((a, b) => a.hookRate - b.hookRate);
        break;
      case "holdRate":
        sorted.sort((a, b) => a.holdRate - b.holdRate);
        break;
      case "ctr":
        sorted.sort((a, b) => a.ctr - b.ctr);
        break;
      default:
        sorted.sort((a, b) => b.priorityScore - a.priorityScore);
    }
    return sorted;
  }, [diagnosed, diagnosticFilter, statusFilter, sortBy]);

  if (creatives.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
        <Target className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">No iteration priorities yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Sync tagged creatives with enough spend data to surface opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Benchmarks */}
      <BenchmarkBar benchmarks={benchmarks} />

      {/* Sub-tabs: Duplicate what works vs Fix what's broken */}
      <Tabs defaultValue="fix" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="duplicate" className="gap-1.5 text-xs">
            <Trophy className="h-3.5 w-3.5" />
            Duplicate What Works
          </TabsTrigger>
          <TabsTrigger value="fix" className="gap-1.5 text-xs">
            <Repeat className="h-3.5 w-3.5" />
            Fix What's Broken
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicate" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Top 5 ads by Hook Rate, Hold Rate, and CTR — ads worth duplicating and remixing. Min spend: ${effectiveMinSpend}.
          </p>
          <TopPerformers
            creatives={creatives}
            benchmarks={benchmarks}
            minSpend={effectiveMinSpend}
            onCreativeClick={onCreativeClick}
          />
        </TabsContent>

        <TabsContent value="fix" className="space-y-4">
          {/* Filter controls */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="metric-label">Diagnostic</label>
              <Select value={diagnosticFilter} onValueChange={(v) => setDiagnosticFilter(v as any)}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAGNOSTIC_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="metric-label">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="metric-label">Sort By</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="metric-label">Min Spend ($)</label>
              <Input
                type="number"
                placeholder={String(spendThreshold)}
                value={minSpendOverride}
                onChange={(e) => setMinSpendOverride(e.target.value)}
                className="w-[100px] h-8 text-xs"
              />
            </div>

            <p className="text-[10px] text-muted-foreground self-end pb-1">
              {filtered.length} ad{filtered.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">No iteration opportunities found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                All ads with sufficient spend are performing at or above account benchmarks. Nice work.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((item) => (
                <IterationCard
                  key={item.ad_id}
                  item={item}
                  onClick={() => {
                    const original = creatives.find((c: any) => c.ad_id === item.ad_id);
                    if (original && onCreativeClick) onCreativeClick(original);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
