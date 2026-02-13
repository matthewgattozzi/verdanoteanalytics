import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";

const KPI_LABELS: Record<string, string> = {
  roas: "ROAS",
  cpa: "CPA",
  ctr: "CTR",
  thumb_stop_rate: "Hook Rate",
};

interface KillScaleTabProps {
  creatives: any[];
  roasThreshold: number;
  spendThreshold: number;
  winnerKpi?: string;
  winnerKpiDirection?: string;
  winnerKpiThreshold?: number;
  scaleThreshold?: number;
  killThreshold?: number;
  onCreativeClick?: (creative: any) => void;
}

export function KillScaleTab({
  creatives, roasThreshold, spendThreshold,
  winnerKpi = "roas", winnerKpiDirection = "gte", winnerKpiThreshold,
  scaleThreshold: scaleThresholdProp, killThreshold: killThresholdProp,
  onCreativeClick,
}: KillScaleTabProps) {
  const threshold = winnerKpiThreshold ?? roasThreshold;
  const scaleAt = scaleThresholdProp ?? threshold;
  const killAt = killThresholdProp ?? threshold * 0.5;
  const kpiLabel = KPI_LABELS[winnerKpi] || winnerKpi;
  const isGte = winnerKpiDirection !== "lte";

  const recommendations = useMemo(() => {
    if (creatives.length === 0) return { scale: [], watch: [], kill: [] };

    const scale: any[] = [];
    const watch: any[] = [];
    const kill: any[] = [];

    creatives.forEach((c: any) => {
      const kpiValue = Number(c[winnerKpi]) || 0;
      const spend = Number(c.spend) || 0;

      if (spend < spendThreshold) {
        watch.push({ ...c, reason: "Insufficient spend data" });
        return;
      }

      if (isGte) {
        if (kpiValue >= scaleAt) {
          scale.push({ ...c, reason: `${kpiLabel} ${kpiValue.toFixed(2)} ≥ ${scaleAt} scale threshold` });
        } else if (kpiValue < killAt) {
          kill.push({ ...c, reason: `${kpiLabel} ${kpiValue.toFixed(2)} < ${killAt} kill threshold with $${spend.toFixed(0)} spent` });
        } else {
          watch.push({ ...c, reason: `${kpiLabel} ${kpiValue.toFixed(2)} — between kill and scale zones` });
        }
      } else {
        if (kpiValue > 0 && kpiValue <= scaleAt) {
          scale.push({ ...c, reason: `${kpiLabel} $${kpiValue.toFixed(2)} ≤ $${scaleAt} scale threshold` });
        } else if (kpiValue > killAt) {
          kill.push({ ...c, reason: `${kpiLabel} $${kpiValue.toFixed(2)} > $${killAt} kill threshold with $${spend.toFixed(0)} spent` });
        } else {
          watch.push({ ...c, reason: `${kpiLabel} $${kpiValue.toFixed(2)} — between scale and kill zones` });
        }
      }
    });

    const sortScale = isGte
      ? (a: any, b: any) => (Number(b[winnerKpi]) || 0) - (Number(a[winnerKpi]) || 0)
      : (a: any, b: any) => (Number(a[winnerKpi]) || 0) - (Number(b[winnerKpi]) || 0);
    const sortKill = isGte
      ? (a: any, b: any) => (Number(a[winnerKpi]) || 0) - (Number(b[winnerKpi]) || 0)
      : (a: any, b: any) => (Number(b[winnerKpi]) || 0) - (Number(a[winnerKpi]) || 0);

    return {
      scale: scale.sort(sortScale).slice(0, 10),
      watch: watch.slice(0, 10),
      kill: kill.sort(sortKill).slice(0, 10),
    };
  }, [creatives, winnerKpi, winnerKpiDirection, scaleAt, killAt, spendThreshold, isGte, kpiLabel]);

  const dirLabel = isGte
    ? `Scale: ${kpiLabel} ≥ ${scaleAt} · Kill: ${kpiLabel} < ${killAt} · Watch: in between`
    : `Scale: ${kpiLabel} ≤ ${scaleAt} · Kill: ${kpiLabel} > ${killAt} · Watch: in between`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-4 border-l-2 border-l-scale">
          <div className="metric-label text-scale mb-2">Scale</div>
          <div className="metric-value">{recommendations.scale.length}</div>
          <p className="text-xs text-muted-foreground mt-1">High performers to increase spend on</p>
        </div>
        <div className="glass-panel p-4 border-l-2 border-l-watch">
          <div className="metric-label text-watch mb-2">Watch</div>
          <div className="metric-value">{recommendations.watch.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Mixed signals or insufficient data</p>
        </div>
        <div className="glass-panel p-4 border-l-2 border-l-kill">
          <div className="metric-label text-kill mb-2">Kill</div>
          <div className="metric-value">{recommendations.kill.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Underperformers to turn off</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{dirLabel} · Spend &gt; ${spendThreshold}</p>

      {[
        { label: "Scale", items: recommendations.scale, color: "border-l-scale" },
        { label: "Kill", items: recommendations.kill, color: "border-l-kill" },
      ].map(({ label, items, color }) =>
        items.length > 0 && (
          <div key={label}>
            <h3 className="text-sm font-semibold mb-2">{label} ({items.length})</h3>
            <div className="space-y-2">
              {items.map((c: any) => (
                <div key={c.ad_id} className={`glass-panel p-3 border-l-2 ${color} cursor-pointer hover:bg-muted/40 transition-colors`} onClick={() => onCreativeClick?.(c)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{c.unique_code}</span>
                      <span className="text-xs font-medium">{c.ad_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.ad_type && <Badge variant="outline" className="text-[10px]">{c.ad_type}</Badge>}
                      {c.hook && <Badge variant="outline" className="text-[10px]">{c.hook}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{kpiLabel}: <span className="font-mono text-foreground">{(Number(c[winnerKpi]) || 0).toFixed(2)}{winnerKpi === "ctr" || winnerKpi === "thumb_stop_rate" ? "%" : winnerKpi === "roas" ? "x" : ""}</span></span>
                    <span>Spend: <span className="font-mono text-foreground">${(Number(c.spend) || 0).toFixed(0)}</span></span>
                    <span>ROAS: <span className="font-mono text-foreground">{(Number(c.roas) || 0).toFixed(2)}x</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {recommendations.scale.length === 0 && recommendations.kill.length === 0 && (
        <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
          <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground">Sync creatives with enough spend data to generate recommendations.</p>
        </div>
      )}
    </div>
  );
}
