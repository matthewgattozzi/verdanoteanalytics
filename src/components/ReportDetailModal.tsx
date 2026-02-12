import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ReportDetailModalProps {
  report: any;
  open: boolean;
  onClose: () => void;
}

export function ReportDetailModal({ report, open, onClose }: ReportDetailModalProps) {
  if (!report) return null;

  const fmt = (v: number | null, prefix = "", suffix = "") => {
    if (v === null || v === undefined) return "—";
    return `${prefix}${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  };

  const topPerformers = (() => { try { return JSON.parse(report.top_performers || "[]"); } catch { return []; } })();
  const bottomPerformers = (() => { try { return JSON.parse(report.bottom_performers || "[]"); } catch { return []; } })();

  const metrics = [
    { label: "Creatives", value: report.creative_count },
    { label: "Total Spend", value: fmt(report.total_spend, "$") },
    { label: "Blended ROAS", value: fmt(report.blended_roas, "", "x") },
    { label: "Avg CPA", value: fmt(report.average_cpa, "$") },
    { label: "Avg CTR", value: fmt(report.average_ctr, "", "%") },
    { label: "Win Rate", value: fmt(report.win_rate, "", "%") },
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
          <p className="text-xs text-muted-foreground">Generated {new Date(report.created_at).toLocaleString()}</p>
        </DialogHeader>

        {/* Metrics Grid */}
        <div className="grid grid-cols-6 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="glass-panel p-2.5 text-center">
              <div className="metric-label text-[10px]">{m.label}</div>
              <div className="text-sm font-semibold font-mono mt-0.5">{m.value}</div>
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
