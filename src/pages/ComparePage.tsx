import { AppLayout } from "@/components/AppLayout";
import { useSearchParams, Link } from "react-router-dom";
import { useAllCreatives } from "@/hooks/useAllCreatives";
import { useAccountContext } from "@/contexts/AccountContext";
import { calculateBenchmarks, diagnoseCreatives, DIAGNOSTIC_META, DiagnosedCreative } from "@/lib/iterationDiagnostics";
import { cn } from "@/lib/utils";
import { ArrowLeft, Video, Play } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

const METRIC_CONFIG = [
  { key: "roas", label: "ROAS", format: (v: number) => `${v.toFixed(2)}x`, best: "max" },
  { key: "ctr", label: "CTR", format: (v: number) => `${v.toFixed(2)}%`, best: "max" },
  { key: "cpa", label: "CPA", format: (v: number) => fmt$(v), best: "min" },
  { key: "cpm", label: "CPM", format: (v: number) => fmt$(v), best: "min" },
  { key: "spend", label: "Spend", format: (v: number) => fmt$(v), best: "max" },
  { key: "purchases", label: "Purchases", format: (v: number) => v.toLocaleString(), best: "max" },
  { key: "thumb_stop_rate", label: "Hook Rate", format: (v: number) => `${v.toFixed(2)}%`, best: "max" },
  { key: "hold_rate", label: "Hold Rate", format: (v: number) => `${v.toFixed(2)}%`, best: "max" },
  { key: "frequency", label: "Frequency", format: (v: number) => v.toFixed(2), best: "min" },
] as const;

const TAG_FIELDS = [
  { key: "ad_type", label: "Type" },
  { key: "hook", label: "Hook" },
  { key: "person", label: "Person" },
  { key: "style", label: "Style" },
  { key: "product", label: "Product" },
  { key: "theme", label: "Theme" },
];

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);
  const { selectedAccountId, selectedAccount } = useAccountContext();

  const filters = useMemo(() => ({
    ...(selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
  }), [selectedAccountId]);

  const { data: allCreatives = [], isLoading } = useAllCreatives(filters);

  const selected = useMemo(() => {
    return ids.map(id => allCreatives.find((c: any) => c.ad_id === id)).filter(Boolean) as any[];
  }, [ids, allCreatives]);

  // Diagnostics for each creative
  const diagnosticsMap = useMemo(() => {
    if (allCreatives.length === 0) return new Map<string, DiagnosedCreative>();
    const benchmarks = calculateBenchmarks(allCreatives);
    const diagnosed = diagnoseCreatives(allCreatives, benchmarks, 0);
    const map = new Map<string, DiagnosedCreative>();
    diagnosed.forEach(d => map.set(d.ad_id, d));
    return map;
  }, [allCreatives]);

  // Determine best/worst for each metric
  const metricHighlights = useMemo(() => {
    if (selected.length < 2) return {};
    const result: Record<string, { bestIdx: number; worstIdx: number }> = {};
    for (const m of METRIC_CONFIG) {
      const values = selected.map((c: any) => Number(c[m.key]) || 0);
      let bestIdx = 0;
      let worstIdx = 0;
      for (let i = 1; i < values.length; i++) {
        if (m.best === "max") {
          if (values[i] > values[bestIdx]) bestIdx = i;
          if (values[i] < values[worstIdx]) worstIdx = i;
        } else {
          if (values[i] > 0 && (values[bestIdx] === 0 || values[i] < values[bestIdx])) bestIdx = i;
          if (values[i] > values[worstIdx]) worstIdx = i;
        }
      }
      // Only highlight if values differ
      if (values[bestIdx] !== values[worstIdx]) {
        result[m.key] = { bestIdx, worstIdx };
      }
    }
    return result;
  }, [selected]);

  // Pattern summary
  const patterns = useMemo(() => {
    if (selected.length < 2) return [];
    const lines: string[] = [];

    // Best ROAS
    const roasVals = selected.map((c: any) => ({ name: c.ad_name, roas: Number(c.roas) || 0 }));
    const bestRoas = roasVals.reduce((a, b) => b.roas > a.roas ? b : a);
    const worstRoas = roasVals.reduce((a, b) => b.roas < a.roas ? b : a);
    if (bestRoas.roas !== worstRoas.roas) {
      const pctHigher = worstRoas.roas > 0
        ? Math.round(((bestRoas.roas - worstRoas.roas) / worstRoas.roas) * 100)
        : null;
      lines.push(`**${bestRoas.name}** has the highest ROAS at ${bestRoas.roas.toFixed(2)}x${pctHigher ? `, ${pctHigher}% higher than **${worstRoas.name}**` : ""}`);
    }

    // Best CPA
    const cpaVals = selected.map((c: any) => ({ name: c.ad_name, cpa: Number(c.cpa) || 0 })).filter(v => v.cpa > 0);
    if (cpaVals.length >= 2) {
      const bestCpa = cpaVals.reduce((a, b) => b.cpa < a.cpa ? b : a);
      lines.push(`**${bestCpa.name}** has the lowest CPA at ${fmt$(bestCpa.cpa)}`);
    }

    // Hook rate comparison
    const hookVals = selected.map((c: any) => ({ name: c.ad_name, hook: Number(c.thumb_stop_rate) || 0 })).filter(v => v.hook > 0);
    if (hookVals.length >= 2) {
      const bestHook = hookVals.reduce((a, b) => b.hook > a.hook ? b : a);
      const worstHook = hookVals.reduce((a, b) => b.hook < a.hook ? b : a);
      if (bestHook.hook > worstHook.hook * 1.2) {
        const pct = Math.round(((bestHook.hook - worstHook.hook) / worstHook.hook) * 100);
        lines.push(`**${bestHook.name}** retains ${pct}% more viewers in the first 3 seconds`);
      }
    }

    // Tag differences
    const allTagged = selected.every((c: any) => c.tag_source && c.tag_source !== "untagged");
    if (allTagged) {
      const bestRoasC = selected.reduce((a: any, b: any) => (Number(b.roas) || 0) > (Number(a.roas) || 0) ? b : a);
      const worstRoasC = selected.reduce((a: any, b: any) => (Number(b.roas) || 0) < (Number(a.roas) || 0) ? b : a);
      if (bestRoasC.hook && worstRoasC.hook && bestRoasC.hook !== worstRoasC.hook) {
        lines.push(`The top performer uses **${bestRoasC.hook}** hook while the underperformer uses **${worstRoasC.hook}**`);
      }
    }

    return lines.slice(0, 5);
  }, [selected]);

  const anyUntagged = selected.some((c: any) => !c.tag_source || c.tag_source === "untagged");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 border-2 border-verdant border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (selected.length === 0) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <p className="font-body text-[14px] text-slate">No creatives found. Please select creatives from the Creatives page.</p>
          <Link to="/creatives" className="font-body text-[13px] text-verdant hover:underline mt-2 inline-block">← Back to Creatives</Link>
        </div>
      </AppLayout>
    );
  }

  const colClass = selected.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <Link to="/creatives" className="font-body text-[13px] text-verdant hover:underline flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Creatives
          </Link>
          <h1 className="font-heading text-[32px] text-forest">Creative Comparison</h1>
          <p className="font-body text-[13px] text-slate font-light mt-1">
            Comparing {selected.length} creatives · {selectedAccount?.name || "All Accounts"}
          </p>
        </div>

        {/* Columns */}
        <div className={cn("grid gap-0", colClass)}>
          {selected.map((c: any, idx: number) => (
            <div
              key={c.ad_id}
              className={cn(
                "px-5 py-4",
                idx < selected.length - 1 && "border-r border-border-light"
              )}
            >
              {/* 1. Thumbnail */}
              <ComparisonThumbnail creative={c} />

              {/* 2. Identity */}
              <div className="mt-4">
                <p className="font-body text-[15px] font-semibold text-charcoal truncate">{c.ad_name}</p>
                <p className="font-body text-[11px] text-sage mt-0.5">{c.unique_code || "—"}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {TAG_FIELDS.map(tf => {
                    const val = c[tf.key];
                    return val ? (
                      <span key={tf.key} className="font-label text-[9px] font-medium uppercase tracking-wide bg-sage-light text-forest px-1.5 py-0.5 rounded-[3px]">{val}</span>
                    ) : (
                      <span key={tf.key} className="font-label text-[9px] text-sage/50 px-1.5 py-0.5">—</span>
                    );
                  })}
                </div>
              </div>

              {/* 3. Metrics */}
              <div className="mt-5">
                <p className="font-label text-[10px] uppercase tracking-wide text-sage font-medium mb-2">Performance</p>
                <div className="space-y-1.5">
                  {METRIC_CONFIG.map(m => {
                    const val = Number(c[m.key]) || 0;
                    const h = metricHighlights[m.key];
                    let colorClass = "text-charcoal";
                    if (h) {
                      if (h.bestIdx === idx) colorClass = "text-verdant";
                      else if (h.worstIdx === idx) colorClass = "text-red-700";
                    }
                    return (
                      <div key={m.key} className="flex items-center justify-between">
                        <span className="font-label text-[10px] uppercase tracking-[0.04em] text-sage">{m.label}</span>
                        <span className={cn("font-data text-[16px] font-semibold tabular-nums", colorClass)}>
                          {m.format(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Notes */}
              <div className="mt-5">
                <p className="font-label text-[10px] uppercase tracking-wide text-sage font-medium mb-1">Notes</p>
                {c.notes ? (
                  <p className="font-body text-[13px] text-slate italic">{c.notes}</p>
                ) : (
                  <p className="font-body text-[13px] text-sage">No notes yet</p>
                )}
              </div>

              {/* 6. Diagnostic */}
              {diagnosticsMap.has(c.ad_id) && (() => {
                const d = diagnosticsMap.get(c.ad_id)!;
                const meta = DIAGNOSTIC_META[d.diagnostic];
                return (
                  <div className="mt-4">
                    <p className="font-label text-[10px] uppercase tracking-wide text-sage font-medium mb-1">Diagnostic</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("font-label text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]", meta.color)}>{meta.label}</span>
                      <span className={cn(
                        "font-label text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]",
                        d.priorityLabel === "High" ? "bg-red-100 text-red-700" : d.priorityLabel === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      )}>{d.priorityLabel}</span>
                    </div>
                    <p className="font-body text-[12px] text-slate">{d.recommendation}</p>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Pattern Summary */}
        <div className="bg-white border border-border-light rounded-[8px] p-6">
          <h2 className="font-heading text-[20px] text-forest mb-4">What stands out</h2>
          {patterns.length > 0 ? (
            <ul className="space-y-2">
              {patterns.map((line, i) => (
                <li key={i} className="font-body text-[14px] text-charcoal prose prose-sm max-w-none">
                  <ReactMarkdown>{line}</ReactMarkdown>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-[14px] text-sage">Not enough data to generate comparisons.</p>
          )}
          {anyUntagged && (
            <p className="font-body text-[13px] text-sage mt-3">
              <Link to="/tagging" className="text-verdant hover:underline">Tag these creatives</Link> to unlock qualitative pattern analysis.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

function ComparisonThumbnail({ creative }: { creative: any }) {
  const [showVideo, setShowVideo] = useState(false);
  const hasVideo = creative.video_url && creative.video_url !== "no-video";

  return (
    <div className="relative aspect-video rounded-[6px] overflow-hidden bg-muted">
      {showVideo && hasVideo ? (
        <video src={creative.video_url} controls autoPlay className="h-full w-full object-cover" />
      ) : (
        <>
          {creative.thumbnail_url ? (
            <img src={creative.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-sage font-body text-[13px]">No preview</span>
            </div>
          )}
          {hasVideo && (
            <>
              <div className="absolute top-2 left-2 bg-charcoal/80 rounded-[3px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Video className="h-3 w-3 text-white" />
                <span className="font-label text-[9px] font-semibold uppercase tracking-wide text-white">Video</span>
              </div>
              <button
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-charcoal ml-0.5" />
                </div>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ComparePage;
