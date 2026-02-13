import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import { useKillScaleLogic, type KillScaleConfig } from "@/lib/killScaleLogic";

interface KillTabProps {
  creatives: any[];
  config: KillScaleConfig;
  onCreativeClick?: (creative: any) => void;
}

export function KillTab({ creatives, config, onCreativeClick }: KillTabProps) {
  const { kill, kpiLabel, isGte, dirLabel } = useKillScaleLogic(creatives, config);

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 border-l-2 border-l-kill">
        <div className="metric-label text-kill mb-2">Kill Candidates</div>
        <div className="metric-value">{kill.length}</div>
        <p className="text-xs text-muted-foreground mt-1">Underperformers to turn off</p>
      </div>

      <p className="text-xs text-muted-foreground">{dirLabel} · Spend &gt; ${config.spendThreshold}</p>

      {kill.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-2">Kill ({kill.length})</h3>
          <div className="space-y-2">
            {kill.map((c: any) => (
              <div key={c.ad_id} className="glass-panel p-3 border-l-2 border-l-kill cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => onCreativeClick?.(c)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {c.unique_code && !c.ad_name?.startsWith(c.unique_code) && (
                      <span className="text-xs font-mono text-muted-foreground">{c.unique_code}</span>
                    )}
                    <span className="text-xs font-medium truncate">{c.ad_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.ad_type && <Badge variant="outline" className="text-[10px]">{c.ad_type}</Badge>}
                    {c.hook && <Badge variant="outline" className="text-[10px]">{c.hook}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{kpiLabel}: <span className="font-mono text-foreground">{(Number(c[config.winnerKpi]) || 0).toFixed(2)}{config.winnerKpi === "ctr" || config.winnerKpi === "thumb_stop_rate" ? "%" : config.winnerKpi === "roas" ? "x" : ""}</span></span>
                  <span>Spend: <span className="font-mono text-foreground">${(Number(c.spend) || 0).toFixed(0)}</span></span>
                  <span>ROAS: <span className="font-mono text-foreground">{(Number(c.roas) || 0).toFixed(2)}x</span></span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
          <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">No kill candidates</h3>
          <p className="text-sm text-muted-foreground">All creatives with sufficient spend are performing above the kill threshold.</p>
        </div>
      )}
    </div>
  );
}
