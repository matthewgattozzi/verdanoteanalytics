import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface IterationsTabProps {
  creatives: any[];
  spendThreshold: number;
}

const METRICS = [
  { key: "thumb_stop_rate", label: "Hook Rate", suffix: "%" },
  { key: "hold_rate", label: "Hold Rate", suffix: "%" },
  { key: "ctr", label: "CTR", suffix: "%" },
];

export function IterationsTab({ creatives, spendThreshold }: IterationsTabProps) {
  const iterations = useMemo(() => {
    if (creatives.length === 0) return [];

    // Only consider creatives with enough spend
    const qualified = creatives.filter((c: any) => (Number(c.spend) || 0) >= spendThreshold);
    if (qualified.length === 0) return [];

    // Calculate medians for each metric
    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    };

    const medians = {
      thumb_stop_rate: median(qualified.map((c: any) => Number(c.thumb_stop_rate) || 0)),
      hold_rate: median(qualified.map((c: any) => Number(c.hold_rate) || 0)),
      ctr: median(qualified.map((c: any) => Number(c.ctr) || 0)),
    };

    // Group by hook tag
    const hookGroups: Record<string, any[]> = {};
    qualified.forEach((c: any) => {
      const key = c.hook || "(none)";
      if (!hookGroups[key]) hookGroups[key] = [];
      hookGroups[key].push(c);
    });

    const priorities: any[] = [];
    Object.entries(hookGroups).forEach(([hook, group]) => {
      const totalSpend = group.reduce((s, c) => s + (Number(c.spend) || 0), 0);

      // Calculate avg for each metric
      const avgMetrics = METRICS.map(m => {
        const avg = group.reduce((s, c) => s + (Number(c[m.key]) || 0), 0) / group.length;
        const medianVal = medians[m.key as keyof typeof medians];
        const gap = medianVal - avg;
        return { ...m, avg, median: medianVal, gap, belowMedian: gap > 0 };
      });

      // Count how many metrics are below median
      const belowCount = avgMetrics.filter(m => m.belowMedian).length;
      if (belowCount === 0) return;

      // Score: sum of (gap × spend) across below-median metrics
      const score = avgMetrics
        .filter(m => m.belowMedian)
        .reduce((s, m) => s + m.gap * totalSpend, 0);

      const topStyle = group[0]?.style || "any";
      const topPerson = group[0]?.person || "any";

      const weakMetrics = avgMetrics.filter(m => m.belowMedian).map(m => m.label);

      priorities.push({
        hook,
        totalSpend: totalSpend.toFixed(0),
        score,
        count: group.length,
        belowCount,
        metrics: avgMetrics,
        weakMetrics,
        suggestion: `Weak on ${weakMetrics.join(", ")}. Try iterating with ${topStyle} style and ${topPerson} talent.`,
        aiContext: group[0]?.ai_hook_analysis || null,
      });
    });

    return priorities.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [creatives, spendThreshold]);

  if (iterations.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
        <Target className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">No iteration priorities yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">Sync tagged creatives with enough spend data to surface opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {iterations.map((p, i) => (
        <div key={p.hook} className="glass-panel p-4 border-l-2 border-l-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">#{i + 1}</Badge>
              <span className="text-sm font-medium">Hook: {p.hook}</span>
            </div>
            <span className="text-xs text-muted-foreground">{p.count} creatives · ${p.totalSpend} total spend</span>
          </div>
          <div className="flex items-center gap-4 text-xs mb-2">
            {p.metrics.map((m: any) => (
              <span key={m.key} className="text-muted-foreground">
                {m.label}:{" "}
                <span className={`font-mono ${m.belowMedian ? "text-kill" : "text-scale"}`}>
                  {m.avg.toFixed(2)}{m.suffix}
                </span>
                <span className="text-muted-foreground/60"> / {m.median.toFixed(2)}{m.suffix}</span>
              </span>
            ))}
          </div>
          <p className="text-xs">{p.suggestion}</p>
          {p.aiContext && <p className="text-xs mt-1 text-muted-foreground italic">AI insight: {p.aiContext}</p>}
        </div>
      ))}
    </div>
  );
}
