import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, Target, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useCreatives } from "@/hooks/useCreatives";
import { useAccountContext } from "@/contexts/AccountContext";

function determineFunnel(creative: any): "TOF" | "MOF" | "BOF" {
  const name = `${creative.campaign_name || ""} ${creative.adset_name || ""}`.toLowerCase();
  if (/tof|prospecting|awareness|top.?of.?funnel/.test(name)) return "TOF";
  if (/mof|retarget|middle.?of.?funnel|consideration/.test(name)) return "MOF";
  return "BOF";
}

const AnalyticsPage = () => {
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const accountFilter = selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {};
  const { data: creatives, isLoading } = useCreatives(accountFilter);
  const [sliceBy, setSliceBy] = useState("ad_type");

  const roasThreshold = parseFloat(selectedAccount?.winner_roas_threshold || "2.0");
  const spendThreshold = parseFloat(selectedAccount?.iteration_spend_threshold || "50");

  const tagged = useMemo(() => (creatives || []).filter((c: any) => c.tag_source !== "untagged"), [creatives]);

  // Win rate computation
  const winRateData = useMemo(() => {
    if (tagged.length === 0) return null;

    const medianCtr = (() => {
      const vals = tagged.map((c: any) => Number(c.ctr) || 0).sort((a: number, b: number) => a - b);
      return vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 0;
    })();
    const medianThumbStop = (() => {
      const vals = tagged.map((c: any) => Number(c.thumb_stop_rate) || 0).sort((a: number, b: number) => a - b);
      return vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 0;
    })();
    const medianHoldRate = (() => {
      const vals = tagged.map((c: any) => Number(c.hold_rate) || 0).sort((a: number, b: number) => a - b);
      return vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 0;
    })();

    const isWinner = (c: any) => {
      const funnel = determineFunnel(c);
      const ctr = Number(c.ctr) || 0;
      const tsr = Number(c.thumb_stop_rate) || 0;
      const hr = Number(c.hold_rate) || 0;
      const roas = Number(c.roas) || 0;
      const spend = Number(c.spend) || 0;

      switch (funnel) {
        case "TOF": return ctr > medianCtr && tsr > medianThumbStop;
        case "MOF": return ctr > medianCtr && hr > medianHoldRate;
        case "BOF": return roas >= roasThreshold && spend > spendThreshold;
      }
    };

    const winners = tagged.filter(isWinner);
    const totalSpend = tagged.reduce((s: number, c: any) => s + (Number(c.spend) || 0), 0);
    const totalPurchaseValue = tagged.reduce((s: number, c: any) => s + (Number(c.purchase_value) || 0), 0);
    const blendedRoas = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;

    // Per-funnel breakdown
    const funnels: Record<string, { total: number; winners: number }> = { TOF: { total: 0, winners: 0 }, MOF: { total: 0, winners: 0 }, BOF: { total: 0, winners: 0 } };
    tagged.forEach((c: any) => {
      const f = determineFunnel(c);
      funnels[f].total++;
      if (isWinner(c)) funnels[f].winners++;
    });

    // Slice by dimension
    const sliceMap: Record<string, { total: number; winners: number }> = {};
    tagged.forEach((c: any) => {
      const key = c[sliceBy] || "(none)";
      if (!sliceMap[key]) sliceMap[key] = { total: 0, winners: 0 };
      sliceMap[key].total++;
      if (isWinner(c)) sliceMap[key].winners++;
    });

    const breakdown = Object.entries(sliceMap)
      .map(([name, { total, winners: w }]) => ({ name, total, winners: w, winRate: total > 0 ? (w / total) * 100 : 0 }))
      .sort((a, b) => b.winRate - a.winRate);

    return {
      total: tagged.length,
      winners: winners.length,
      winRate: tagged.length > 0 ? ((winners.length / tagged.length) * 100).toFixed(1) : "0",
      blendedRoas: blendedRoas.toFixed(2),
      funnels,
      breakdown,
    };
  }, [tagged, sliceBy, roasThreshold, spendThreshold]);

  // Kill/Scale
  const recommendations = useMemo(() => {
    if (tagged.length === 0) return { scale: [], watch: [], kill: [] };

    const scale: any[] = [];
    const watch: any[] = [];
    const kill: any[] = [];

    tagged.forEach((c: any) => {
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
  }, [tagged, roasThreshold, spendThreshold]);

  // Iteration priorities
  const iterations = useMemo(() => {
    if (tagged.length === 0) return [];

    // Find underperforming combos
    const hookGroups: Record<string, any[]> = {};
    tagged.forEach((c: any) => {
      if ((Number(c.spend) || 0) < spendThreshold) return;
      const key = c.hook || "(none)";
      if (!hookGroups[key]) hookGroups[key] = [];
      hookGroups[key].push(c);
    });

    const allCtr = tagged.map((c: any) => Number(c.ctr) || 0);
    const medianCtr = allCtr.sort((a, b) => a - b)[Math.floor(allCtr.length / 2)] || 0;

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
  }, [tagged, spendThreshold]);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const excludedCount = (creatives || []).length - tagged.length;

  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        description="Win rate analysis, kill/scale recommendations, and iteration priorities."
        badge={excludedCount > 0 ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">{excludedCount} untagged excluded</Badge>
        ) : undefined}
      />

      <Tabs defaultValue="winrate" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="winrate">Win Rate</TabsTrigger>
          <TabsTrigger value="killscale">Kill / Scale</TabsTrigger>
          <TabsTrigger value="iterations">Iteration Priorities</TabsTrigger>
        </TabsList>

        <TabsContent value="winrate" className="animate-fade-in space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Total Tagged" value={winRateData?.total || 0} icon={<BarChart3 className="h-4 w-4" />} />
            <MetricCard label="Winners" value={winRateData?.winners || 0} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Win Rate" value={winRateData ? `${winRateData.winRate}%` : "—"} icon={<Target className="h-4 w-4" />} />
            <MetricCard label="Blended ROAS" value={winRateData ? `${winRateData.blendedRoas}x` : "—"} />
          </div>

          {/* Funnel stage breakdown */}
          {winRateData?.funnels && (
            <div className="grid grid-cols-3 gap-3">
              {(["TOF", "MOF", "BOF"] as const).map((stage) => {
                const f = winRateData.funnels[stage];
                const rate = f.total > 0 ? ((f.winners / f.total) * 100).toFixed(1) : "0";
                const labels = { TOF: "Top of Funnel", MOF: "Mid Funnel", BOF: "Bottom of Funnel" };
                const criteria = { TOF: "CTR + Thumb Stop > median", MOF: "CTR + Hold Rate > median", BOF: `ROAS ≥ ${roasThreshold}x + spend > $${spendThreshold}` };
                return (
                  <div key={stage} className="glass-panel p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{stage}</span>
                      <Badge variant="outline" className="text-[10px]">{labels[stage]}</Badge>
                    </div>
                    <div className="text-2xl font-bold font-mono">{rate}%</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {f.winners} / {f.total} creatives
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                      {criteria[stage]}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Slice by:</span>
            <Select value={sliceBy} onValueChange={setSliceBy}>
              <SelectTrigger className="w-36 h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ad_type">Type</SelectItem>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="style">Style</SelectItem>
                <SelectItem value="hook">Hook</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="theme">Theme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {winRateData && winRateData.breakdown.length > 0 ? (
            <div className="glass-panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{sliceBy.replace("ad_", "").replace("_", " ")}</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Winners</TableHead>
                    <TableHead className="text-xs text-right">Win Rate</TableHead>
                    <TableHead className="text-xs">Visual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {winRateData.breakdown.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="text-xs font-medium">{row.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.total}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.winners}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.winRate.toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(row.winRate, 100)}%` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">No data yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">Sync creatives and ensure they are tagged to see win rate analysis.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="killscale" className="animate-fade-in space-y-4">
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
        </TabsContent>

        <TabsContent value="iterations" className="animate-fade-in space-y-4">
          {iterations.length > 0 ? (
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
          ) : (
            <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">No iteration priorities yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">Sync tagged creatives with enough spend data to surface opportunities.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default AnalyticsPage;
