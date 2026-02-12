import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import { determineFunnel } from "./determineFunnel";

interface KillScaleTabProps {
  creatives: any[];
  roasThreshold: number;
  spendThreshold: number;
}

export function KillScaleTab({ creatives, roasThreshold, spendThreshold }: KillScaleTabProps) {
  const recommendations = useMemo(() => {
    if (creatives.length === 0) return { scale: [], watch: [], kill: [] };

    const scale: any[] = [];
    const watch: any[] = [];
    const kill: any[] = [];

    creatives.forEach((c: any) => {
      const roas = Number(c.roas) || 0;
      const spend = Number(c.spend) || 0;
      const funnel = determineFunnel(c);

      if (spend < spendThreshold) {
        watch.push({ ...c, reason: "Insufficient spend data", funnel });
      } else if (funnel === "BOF" && roas >= roasThreshold) {
        scale.push({ ...c, reason: `ROAS ${roas.toFixed(2)}x exceeds ${roasThreshold}x threshold`, funnel });
      } else if (funnel === "BOF" && roas < roasThreshold * 0.5 && spend > spendThreshold) {
        kill.push({ ...c, reason: `ROAS ${roas.toFixed(2)}x is well below threshold with $${spend.toFixed(0)} spent`, funnel });
      } else {
        watch.push({ ...c, reason: "Mixed signals", funnel });
      }
    });

    return {
      scale: scale.sort((a, b) => (Number(b.roas) || 0) - (Number(a.roas) || 0)).slice(0, 10),
      watch: watch.slice(0, 10),
      kill: kill.sort((a, b) => (Number(a.roas) || 0) - (Number(b.roas) || 0)).slice(0, 10),
    };
  }, [creatives, roasThreshold, spendThreshold]);

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

      {[
        { label: "Scale", items: recommendations.scale, color: "border-l-scale" },
        { label: "Kill", items: recommendations.kill, color: "border-l-kill" },
      ].map(({ label, items, color }) =>
        items.length > 0 && (
          <div key={label}>
            <h3 className="text-sm font-semibold mb-2">{label} ({items.length})</h3>
            <div className="space-y-2">
              {items.map((c: any) => (
                <div key={c.ad_id} className={`glass-panel p-3 border-l-2 ${color}`}>
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
                    <span>ROAS: <span className="font-mono text-foreground">{(Number(c.roas) || 0).toFixed(2)}x</span></span>
                    <span>Spend: <span className="font-mono text-foreground">${(Number(c.spend) || 0).toFixed(0)}</span></span>
                    <span>CPA: <span className="font-mono text-foreground">${(Number(c.cpa) || 0).toFixed(2)}</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                  {c.ai_analysis && <p className="text-xs mt-1 text-muted-foreground/80 italic">AI: {c.ai_analysis}</p>}
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
