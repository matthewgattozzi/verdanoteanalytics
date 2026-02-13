import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useKillScaleLogic, type KillScaleConfig } from "@/lib/killScaleLogic";

type Variant = "scale" | "kill";

interface KillScaleListProps {
  creatives: any[];
  config: KillScaleConfig;
  variant: Variant;
  onCreativeClick?: (creative: any) => void;
}

const VARIANT_META: Record<Variant, {
  label: string; subtitle: string; emptyTitle: string; emptyDesc: string;
  icon: typeof TrendingUp; borderClass: string; textClass: string;
}> = {
  scale: {
    label: "Scale Candidates",
    subtitle: "High performers to increase spend on",
    emptyTitle: "No scale candidates yet",
    emptyDesc: "Sync creatives with enough spend data to find top performers.",
    icon: TrendingUp,
    borderClass: "border-l-scale",
    textClass: "text-scale",
  },
  kill: {
    label: "Kill Candidates",
    subtitle: "Underperformers to turn off",
    emptyTitle: "No kill candidates",
    emptyDesc: "All creatives with sufficient spend are performing above the kill threshold.",
    icon: TrendingDown,
    borderClass: "border-l-kill",
    textClass: "text-kill",
  },
};

export function KillScaleList({ creatives, config, variant, onCreativeClick }: KillScaleListProps) {
  const { scale, kill, kpiLabel, dirLabel } = useKillScaleLogic(creatives, config);
  const items = variant === "scale" ? scale : kill;
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      <div className={`glass-panel p-4 border-l-2 ${meta.borderClass}`}>
        <div className={`metric-label ${meta.textClass} mb-2`}>{meta.label}</div>
        <div className="metric-value">{items.length}</div>
        <p className="text-xs text-muted-foreground mt-1">{meta.subtitle}</p>
      </div>

      <p className="text-xs text-muted-foreground">{dirLabel} · Spend &gt; ${config.spendThreshold}</p>

      {items.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-2">{variant === "scale" ? "Scale" : "Kill"} ({items.length})</h3>
          <div className="space-y-2">
            {items.map((c: any) => (
              <div key={c.ad_id} className={`glass-panel p-3 border-l-2 ${meta.borderClass} cursor-pointer hover:bg-muted/40 transition-colors`} onClick={() => onCreativeClick?.(c)}>
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
          <Icon className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">{meta.emptyTitle}</h3>
          <p className="text-sm text-muted-foreground">{meta.emptyDesc}</p>
        </div>
      )}
    </div>
  );
}
