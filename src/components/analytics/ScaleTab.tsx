import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { useKillScaleLogic, type KillScaleConfig } from "@/lib/killScaleLogic";

interface ScaleTabProps {
  creatives: any[];
  config: KillScaleConfig;
  onCreativeClick?: (creative: any) => void;
}

export function ScaleTab({ creatives, config, onCreativeClick }: ScaleTabProps) {
  const { scale, kpiLabel, isGte, dirLabel } = useKillScaleLogic(creatives, config);

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 border-l-2 border-l-scale">
        <div className="metric-label text-scale mb-2">Scale Candidates</div>
        <div className="metric-value">{scale.length}</div>
        <p className="text-xs text-muted-foreground mt-1">High performers to increase spend on</p>
      </div>

      <p className="text-xs text-muted-foreground">{dirLabel} · Spend &gt; ${config.spendThreshold}</p>

      {scale.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-2">Scale ({scale.length})</h3>
          <div className="space-y-2">
            {scale.map((c: any) => (
              <div key={c.ad_id} className="glass-panel p-3 border-l-2 border-l-scale cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => onCreativeClick?.(c)}>
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
          <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">No scale candidates yet</h3>
          <p className="text-sm text-muted-foreground">Sync creatives with enough spend data to find top performers.</p>
        </div>
      )}
    </div>
  );
}
