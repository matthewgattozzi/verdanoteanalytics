import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Download, ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";
import { exportReportCSV } from "@/lib/csv";

interface ReportDetailModalProps {
  report: any;
  previousReport?: any;
  open: boolean;
  onClose: () => void;
}

function DeltaBadge({ current, previous, prefix = "", suffix = "", inverse = false }: {
  current: number | null;
  previous: number | null;
  prefix?: string;
  suffix?: string;
  inverse?: boolean;
}) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const diff = Number(current) - Number(previous);
  if (Math.abs(diff) < 0.01) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="h-2.5 w-2.5" />—</span>;
  const isPositive = diff > 0;
  const isGood = inverse ? !isPositive : isPositive;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isGood ? "text-success" : "text-destructive"}`}>
      {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {prefix}{Math.abs(diff).toLocaleString("en-US", { maximumFractionDigits: 2 })}{suffix}
    </span>
  );
}

export function ReportDetailModal({ report, previousReport, open, onClose }: ReportDetailModalProps) {
  if (!report) return null;

  const fmt = (v: number | null, prefix = "", suffix = "") => {
    if (v === null || v === undefined) return "—";
    return `${prefix}${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  };

  const topPerformers = (() => { try { return JSON.parse(report.top_performers || "[]"); } catch { return []; } })();
  const bottomPerformers = (() => { try { return JSON.parse(report.bottom_performers || "[]"); } catch { return []; } })();
  const iterationSuggestions = (() => { try { return JSON.parse(report.iteration_suggestions || "[]"); } catch { return []; } })();

  const prev = previousReport;

  const metrics = [
    { label: "Creatives", value: report.creative_count, prevValue: prev?.creative_count, suffix: "" },
    { label: "Total Spend", value: fmt(report.total_spend, "$"), prevValue: prev?.total_spend, current: report.total_spend, prefix: "$" },
    { label: "Blended ROAS", value: fmt(report.blended_roas, "", "x"), prevValue: prev?.blended_roas, current: report.blended_roas, suffix: "x" },
    { label: "Avg CPA", value: fmt(report.average_cpa, "$"), prevValue: prev?.average_cpa, current: report.average_cpa, prefix: "$", inverse: true },
    { label: "Avg CTR", value: fmt(report.average_ctr, "", "%"), prevValue: prev?.average_ctr, current: report.average_ctr, suffix: "%" },
    { label: "Win Rate", value: fmt(report.win_rate, "", "%"), prevValue: prev?.win_rate, current: report.win_rate, suffix: "%" },
  ];

  const tagBreakdown = [
    { label: "Parsed", count: report.tags_parsed_count, color: "text-tag-parsed" },
    { label: "CSV Match", count: report.tags_csv_count, color: "text-tag-csv" },
    { label: "Manual", count: report.tags_manual_count, color: "text-tag-manual" },
    { label: "Untagged", count: report.tags_untagged_count, color: "text-tag-untagged" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {report.report_name}
            {report.date_range_days && (
              <Badge variant="outline" className="text-xs">{report.date_range_days} days</Badge>
            )}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Generated {new Date(report.created_at).toLocaleString()}</p>
            <Button size="sm" variant="outline" onClick={() => exportReportCSV(report)}>
              <Download className="h-3 w-3 mr-1" />Export CSV
            </Button>
          </div>
        </DialogHeader>

        {/* Comparison notice */}
        {prev ? (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Comparing to <span className="font-medium">{prev.report_name}</span> ({new Date(prev.created_at).toLocaleDateString()})
          </p>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            This is the first report{report.account_id ? " for this account" : ""}. Generate another after your next sync to see comparisons.
          </p>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="glass-panel p-2.5 text-center">
              <div className="metric-label text-[10px]">{m.label}</div>
              <div className="text-sm font-semibold font-mono mt-0.5">{m.value}</div>
              {prev && m.current !== undefined && (
                <DeltaBadge
                  current={m.current ?? null}
                  previous={m.prevValue ?? null}
                  prefix={m.prefix || ""}
                  suffix={m.suffix || ""}
                  inverse={m.inverse || false}
                />
              )}
              {prev && m.label === "Creatives" && (
                <DeltaBadge current={report.creative_count} previous={prev.creative_count} />
              )}
            </div>
          ))}
        </div>

        {/* Tag Breakdown */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground font-medium">Tags:</span>
          {tagBreakdown.map((t) => (
            <span key={t.label} className={t.color}>
              {t.label}: <span className="font-mono font-medium">{t.count}</span>
            </span>
          ))}
        </div>

        {/* Iteration Suggestions */}
        {iterationSuggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Iteration Suggestions</h3>
              <Badge variant="outline" className="text-[10px]">{iterationSuggestions.length} ads need work</Badge>
            </div>
            <div className="space-y-1.5">
              {iterationSuggestions.map((s: any) => (
                <div key={s.ad_id} className="glass-panel p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-medium">{s.label}</Badge>
                      <span className="font-medium truncate max-w-[200px]">{s.ad_name}</span>
                      {s.unique_code && <span className="text-[10px] font-mono text-muted-foreground">{s.unique_code}</span>}
                    </div>
                    <span className="font-mono text-muted-foreground">{fmt(s.spend, "$")} spent</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{s.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-scale" />
              <h3 className="text-sm font-semibold">Top Performers</h3>
            </div>
            <div className="space-y-1.5">
              {topPerformers.map((p: any, i: number) => (
                <div key={p.ad_id} className="flex items-center justify-between glass-panel p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground w-4">{i + 1}.</span>
                    <div>
                      <span className="font-medium truncate max-w-[200px] block">{p.ad_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{p.unique_code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span>{fmt(p.roas, "", "x")} ROAS</span>
                    <span>{fmt(p.cpa, "$")} CPA</span>
                    <span>{fmt(p.spend, "$")} spent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Performers */}
        {bottomPerformers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-kill" />
              <h3 className="text-sm font-semibold">Bottom Performers</h3>
            </div>
            <div className="space-y-1.5">
              {bottomPerformers.map((p: any, i: number) => (
                <div key={p.ad_id} className="flex items-center justify-between glass-panel p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground w-4">{i + 1}.</span>
                    <div>
                      <span className="font-medium truncate max-w-[200px] block">{p.ad_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{p.unique_code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span>{fmt(p.roas, "", "x")} ROAS</span>
                    <span>{fmt(p.cpa, "$")} CPA</span>
                    <span>{fmt(p.spend, "$")} spent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
