import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface IterationsTabProps {
  creatives: any[];
  spendThreshold: number;
}

export function IterationsTab({ creatives, spendThreshold }: IterationsTabProps) {
  const iterations = useMemo(() => {
    if (creatives.length === 0) return [];

    const hookGroups: Record<string, any[]> = {};
    creatives.forEach((c: any) => {
      if ((Number(c.spend) || 0) < spendThreshold) return;
      const key = c.hook || "(none)";
      if (!hookGroups[key]) hookGroups[key] = [];
      hookGroups[key].push(c);
    });

    const allCtr = creatives.map((c: any) => Number(c.ctr) || 0);
    const medianCtr = [...allCtr].sort((a, b) => a - b)[Math.floor(allCtr.length / 2)] || 0;

    const priorities: any[] = [];
    Object.entries(hookGroups).forEach(([hook, group]) => {
      const avgCtr = group.reduce((s, c) => s + (Number(c.ctr) || 0), 0) / group.length;
      const totalSpend = group.reduce((s, c) => s + (Number(c.spend) || 0), 0);
      if (avgCtr < medianCtr) {
        const gap = medianCtr - avgCtr;
        const score = gap * totalSpend;
        const topStyle = group[0]?.style || "any";
        const topPerson = group[0]?.person || "any";
        priorities.push({
          hook,
          avgCtr: avgCtr.toFixed(2),
          medianCtr: medianCtr.toFixed(2),
          totalSpend: totalSpend.toFixed(0),
          score,
          count: group.length,
          suggestion: `Try a different hook with ${topStyle} style and ${topPerson} talent`,
          aiContext: group[0]?.ai_hook_analysis || null,
        });
      }
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
            <span className="text-muted-foreground">Avg CTR: <span className="font-mono text-tag-untagged">{p.avgCtr}%</span></span>
            <span className="text-muted-foreground">Median CTR: <span className="font-mono text-foreground">{p.medianCtr}%</span></span>
          </div>
          <p className="text-xs">{p.suggestion}</p>
          {p.aiContext && <p className="text-xs mt-1 text-muted-foreground italic">AI insight: {p.aiContext}</p>}
        </div>
      ))}
    </div>
  );
}
