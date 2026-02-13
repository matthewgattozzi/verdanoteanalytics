import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Expand } from "lucide-react";

interface TrendChartProps {
  data: { date: string; value: number }[];
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  color?: string;
  height?: number;
}

export function TrendChart({ data, label, prefix = "", suffix = "", decimals = 2, color = "hsl(var(--primary))", height = 200 }: TrendChartProps) {
  const [expanded, setExpanded] = useState(false);

  const fmt = (v: number) => `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  if (data.length === 0) {
    return (
      <div className="glass-panel flex items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No daily data available for {label}</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel p-4 cursor-pointer group relative hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setExpanded(true)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Expand className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <ChartSVG data={data} height={height} color={color} fmt={fmt} />
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] p-6">
          <h2 className="text-lg font-semibold mb-4">{label}</h2>
          <ChartSVG data={data} height={400} color={color} fmt={fmt} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChartSVG({ data, height, color, fmt }: { data: { date: string; value: number }[]; height: number; color: string; fmt: (v: number) => string }) {
  const chart = useMemo(() => {
    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const padding = 40;
    const width = 600;
    const chartH = height - 40;
    const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

    const points = data.map((d, i) => ({
      x: padding + i * xStep,
      y: 20 + chartH - ((d.value - minVal) / range) * chartH,
      ...d,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${20 + chartH} L ${points[0].x} ${20 + chartH} Z`;

    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = minVal + (range * i) / 4;
      const y = 20 + chartH - (i / 4) * chartH;
      return { val, y };
    });

    const xLabelInterval = Math.max(1, Math.floor(data.length / 8));
    const xLabels = points.filter((_, i) => i % xLabelInterval === 0 || i === points.length - 1);

    return { points, linePath, areaPath, yTicks, xLabels, width, chartH };
  }, [data, height]);

  return (
    <svg viewBox={`0 0 ${chart.width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {chart.yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={40} y1={tick.y} x2={chart.width - 40} y2={tick.y} stroke="hsl(var(--border))" strokeWidth={0.5} />
          <text x={36} y={tick.y + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={8} fontFamily="monospace">
            {fmt(tick.val)}
          </text>
        </g>
      ))}
      <path d={chart.areaPath} fill={color} opacity={0.08} />
      <path d={chart.linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {chart.points.length <= 60 && chart.points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} opacity={0.7} />
      ))}
      {chart.xLabels.map((p, i) => (
        <text key={i} x={p.x} y={height - 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={7} fontFamily="monospace">
          {format(new Date(p.date), "MMM d")}
        </text>
      ))}
    </svg>
  );
}
