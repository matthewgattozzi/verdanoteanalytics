import { useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, Target } from "lucide-react";

interface WinRateTabProps {
  creatives: any[];
  roasThreshold: number;
  spendThreshold: number;
  defaultSlice?: string;
}

export function WinRateTab({ creatives, roasThreshold, spendThreshold, defaultSlice = "ad_type" }: WinRateTabProps) {
  const [sliceBy, setSliceBy] = useState(defaultSlice);

  const winRateData = useMemo(() => {
    if (creatives.length === 0) return null;

    const isWinner = (c: any) => {
      const roas = Number(c.roas) || 0;
      const spend = Number(c.spend) || 0;
      return roas >= roasThreshold && spend > spendThreshold;
    };

    const winners = creatives.filter(isWinner);
    const totalSpend = creatives.reduce((s: number, c: any) => s + (Number(c.spend) || 0), 0);
    const totalPurchaseValue = creatives.reduce((s: number, c: any) => s + (Number(c.purchase_value) || 0), 0);
    const blendedRoas = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;

    const sliceMap: Record<string, { total: number; winners: number }> = {};
    creatives.forEach((c: any) => {
      const key = c[sliceBy] || "(none)";
      if (!sliceMap[key]) sliceMap[key] = { total: 0, winners: 0 };
      sliceMap[key].total++;
      if (isWinner(c)) sliceMap[key].winners++;
    });

    const breakdown = Object.entries(sliceMap)
      .map(([name, { total, winners: w }]) => ({ name, total, winners: w, winRate: total > 0 ? (w / total) * 100 : 0 }))
      .sort((a, b) => b.winRate - a.winRate);

    return {
      total: creatives.length,
      winners: winners.length,
      winRate: ((winners.length / creatives.length) * 100).toFixed(1),
      blendedRoas: blendedRoas.toFixed(2),
      breakdown,
    };
  }, [creatives, sliceBy, roasThreshold, spendThreshold]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Creatives" value={winRateData?.total || 0} icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Winners" value={winRateData?.winners || 0} icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Win Rate" value={winRateData ? `${winRateData.winRate}%` : "—"} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Blended ROAS" value={winRateData ? `${winRateData.blendedRoas}x` : "—"} />
      </div>




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
    </div>
  );
}
