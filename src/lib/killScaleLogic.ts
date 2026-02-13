import { useMemo } from "react";

export const KPI_LABELS: Record<string, string> = {
  roas: "ROAS",
  cpa: "CPA",
  ctr: "CTR",
  thumb_stop_rate: "Hook Rate",
};

export interface KillScaleConfig {
  winnerKpi: string;
  winnerKpiDirection: string;
  scaleAt: number;
  killAt: number;
  spendThreshold: number;
}

export interface CategorizedCreative extends Record<string, any> {
  reason: string;
}

export interface KillScaleResults {
  scale: CategorizedCreative[];
  watch: CategorizedCreative[];
  kill: CategorizedCreative[];
  kpiLabel: string;
  isGte: boolean;
  dirLabel: string;
}

export function useKillScaleLogic(
  creatives: any[],
  config: KillScaleConfig
): KillScaleResults {
  const { winnerKpi, winnerKpiDirection, scaleAt, killAt, spendThreshold } = config;
  const kpiLabel = KPI_LABELS[winnerKpi] || winnerKpi;
  const isGte = winnerKpiDirection !== "lte";

  const { scale, watch, kill } = useMemo(() => {
    if (creatives.length === 0) return { scale: [] as any[], watch: [] as any[], kill: [] as any[] };

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
      scale: scale.sort(sortScale),
      watch,
      kill: kill.sort(sortKill),
    };
  }, [creatives, winnerKpi, winnerKpiDirection, scaleAt, killAt, spendThreshold, isGte, kpiLabel]);

  const dirLabel = isGte
    ? `Scale: ${kpiLabel} ≥ ${scaleAt} · Kill: ${kpiLabel} < ${killAt} · Watch: in between`
    : `Scale: ${kpiLabel} ≤ ${scaleAt} · Kill: ${kpiLabel} > ${killAt} · Watch: in between`;

  return { scale, watch, kill, kpiLabel, isGte, dirLabel };
}
