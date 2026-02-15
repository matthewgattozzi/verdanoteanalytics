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
  icon: typeof TrendingUp; valueColor: string;
}> = {
  scale: {
    label: "Scale Candidates",
    subtitle: "High performers to increase spend on",
    emptyTitle: "No scale candidates yet",
    emptyDesc: "Sync creatives with enough spend data to find top performers.",
    icon: TrendingUp,
    valueColor: "text-verdant",
  },
  kill: {
    label: "Kill Candidates",
    subtitle: "Underperformers to turn off",
    emptyTitle: "No kill candidates",
    emptyDesc: "All creatives with sufficient spend are performing above the kill threshold.",
    icon: TrendingDown,
    valueColor: "text-red-700",
  },
};

function formatKpiValue(value: number, kpi: string): string {
  if (kpi === "ctr" || kpi === "thumb_stop_rate") return `${value.toFixed(2)}%`;
  if (kpi === "roas") return `${value.toFixed(2)}x`;
  if (kpi === "cpa" || kpi === "cpc" || kpi === "cpm") return `$${value.toFixed(2)}`;
  return value.toFixed(2);
}

export function KillScaleList({ creatives, config, variant, onCreativeClick }: KillScaleListProps) {
  const { scale, kill, kpiLabel, dirLabel } = useKillScaleLogic(creatives, config);
  const items = variant === "scale" ? scale : kill;
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      {/* Hero metric */}
      <div className="py-3 px-1">
        <p className="font-label text-[10px] uppercase tracking-[0.05em] text-sage font-medium mb-1.5">{meta.label}</p>
        <p className="font-data text-[36px] font-semibold text-charcoal tracking-tight leading-none">{items.length}</p>
        <p className="font-body text-[13px] text-slate font-light mt-1.5">{meta.subtitle}</p>
      </div>

      {/* Threshold definition */}
      <p className="font-body text-[12px] text-sage">
        {dirLabel.split(/(\d+\.?\d*)/g).map((part, i) =>
          /^\d+\.?\d*$/.test(part)
            ? <span key={i} className="font-data font-medium text-charcoal">{part}</span>
            : <span key={i}>{part}</span>
        )}
        {" · Spend > "}
        <span className="font-data font-medium text-charcoal">${config.spendThreshold}</span>
      </p>

      {items.length > 0 ? (
        <div>
          <h3 className="font-heading text-[20px] text-forest mb-3">
            {variant === "scale" ? "Scale" : "Kill"} ({items.length})
          </h3>
          <div className="divide-y divide-border-light">
            {items.map((c: any) => {
              const kpiValue = Number(c[config.winnerKpi]) || 0;
              const spend = Number(c.spend) || 0;
              return (
                <div
                  key={c.ad_id}
                  className="py-3 px-1 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => onCreativeClick?.(c)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="font-body text-[14px] font-medium text-charcoal truncate block">{c.ad_name}</span>
                      <span className="font-body text-[11px] text-sage block mt-0.5">{c.reason}</span>
                    </div>
                    <div className="flex items-center gap-5 flex-shrink-0">
                      <span className={`font-data text-[18px] font-semibold ${meta.valueColor}`}>
                        {formatKpiValue(kpiValue, config.winnerKpi)}
                      </span>
                      <span className="font-data text-[13px] font-medium text-slate">
                        ${spend.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
