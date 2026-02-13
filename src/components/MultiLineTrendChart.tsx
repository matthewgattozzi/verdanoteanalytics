import { useMemo, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Expand } from "lucide-react";

export interface TrendLine {
  key: string;
  label: string;
  color: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  values: number[];
}

interface MultiLineTrendChartProps {
  dates: string[];
  lines: TrendLine[];
  height?: number;
}

export function MultiLineTrendChart({ dates, lines, height = 260 }: MultiLineTrendChartProps) {
  const [expanded, setExpanded] = useState(false);

  if (dates.length === 0 || lines.length === 0) {
    return (
      <div className="glass-panel flex items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">Select at least one metric to display</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="glass-panel p-4 cursor-pointer group relative hover:ring-1 hover:ring-primary/30 transition-all"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap gap-3">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-1.5">
                <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: line.color }} />
                <span className="text-xs font-medium text-muted-foreground">{line.label}</span>
              </div>
            ))}
          </div>
          <Expand className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <ChartSVG dates={dates} lines={lines} height={height} />
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] p-6">
          <div className="flex flex-wrap gap-4 mb-4">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-1.5">
                <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: line.color }} />
                <span className="text-sm font-medium">{line.label}</span>
              </div>
            ))}
          </div>
          <ChartSVG dates={dates} lines={lines} height={400} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChartSVG({ dates, lines, height }: { dates: string[]; lines: TrendLine[]; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const chart = useMemo(() => {
    const padding = 50;
    const rightPadding = 50;
    const width = 600;
    const chartH = height - 40;
    const xStep = dates.length > 1 ? (width - padding - rightPadding) / (dates.length - 1) : 0;

    const lineData = lines.map((line) => {
      const vals = line.values;
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const range = maxVal - minVal || 1;

      const points = vals.map((v, i) => ({
        x: padding + i * xStep,
        y: 20 + chartH - ((v - minVal) / range) * chartH,
        value: v,
      }));

      const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

      return { ...line, points, linePath, minVal, maxVal, range };
    });

    const xLabelInterval = Math.max(1, Math.floor(dates.length / 8));
    const xLabels = dates
      .map((d, i) => ({ date: d, x: padding + i * xStep }))
      .filter((_, i) => i % xLabelInterval === 0 || i === dates.length - 1);

    const primaryLine = lineData[0];
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = primaryLine.minVal + (primaryLine.range * i) / 4;
      const y = 20 + chartH - (i / 4) * chartH;
      return { val, y };
    });

    const fmtPrimary = (v: number) => {
      const p = primaryLine;
      return `${p.prefix || ""}${v.toLocaleString("en-US", { minimumFractionDigits: p.decimals ?? 2, maximumFractionDigits: p.decimals ?? 2 })}${p.suffix || ""}`;
    };

    return { lineData, xLabels, yTicks, width, chartH, fmtPrimary, padding, rightPadding, xStep };
  }, [dates, lines, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || dates.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * chart.width;
    const index = Math.round((svgX - chart.padding) / (chart.xStep || 1));
    if (index >= 0 && index < dates.length) {
      setHoveredIndex(index);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredIndex(null);
    }
  }, [dates.length, chart.width, chart.padding, chart.xStep]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltipPos(null);
  }, []);

  const fmtValue = (line: TrendLine, v: number) =>
    `${line.prefix || ""}${v.toLocaleString("en-US", { minimumFractionDigits: line.decimals ?? 2, maximumFractionDigits: line.decimals ?? 2 })}${line.suffix || ""}`;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chart.width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {chart.yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={50} y1={tick.y} x2={chart.width - 50} y2={tick.y} stroke="hsl(var(--border))" strokeWidth={0.5} />
            <text x={46} y={tick.y + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={8} fontFamily="monospace">
              {chart.fmtPrimary(tick.val)}
            </text>
          </g>
        ))}

        {/* Hover vertical line */}
        {hoveredIndex !== null && chart.lineData[0] && (
          <line
            x1={chart.lineData[0].points[hoveredIndex]?.x}
            y1={20}
            x2={chart.lineData[0].points[hoveredIndex]?.x}
            y2={20 + chart.chartH}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.5}
            strokeDasharray="3 3"
            opacity={0.5}
          />
        )}

        {/* Lines */}
        {chart.lineData.map((ld) => (
          <g key={ld.key}>
            <path d={ld.linePath} fill="none" stroke={ld.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
            {ld.points.length <= 60 && ld.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={hoveredIndex === i ? 4 : 2} fill={ld.color} opacity={hoveredIndex === i ? 1 : 0.6} />
            ))}
          </g>
        ))}

        {/* X-axis labels */}
        {chart.xLabels.map((p, i) => (
          <text key={i} x={p.x} y={height - 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={7} fontFamily="monospace">
            {format(new Date(p.date + "T12:00:00"), "MMM d")}
          </text>
        ))}
      </svg>

      {/* HTML Tooltip */}
      {hoveredIndex !== null && tooltipPos && (
        <div
          className="absolute z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium text-foreground mb-1.5">
            {format(new Date(dates[hoveredIndex] + "T12:00:00"), "MMM d, yyyy")}
          </p>
          {chart.lineData.map((ld) => (
            <div key={ld.key} className="flex items-center gap-2 justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ld.color }} />
                <span className="text-muted-foreground">{ld.label}</span>
              </span>
              <span className="font-mono font-medium text-foreground ml-3">{fmtValue(ld, ld.points[hoveredIndex]?.value ?? 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
