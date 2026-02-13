/**
 * Iteration diagnostics utility — reusable benchmark + diagnostic logic
 * for the Iterations tab in Analytics.
 */

export type MetricLevel = "strong" | "average" | "weak";

export type DiagnosticType =
  | "weak_hook"
  | "weak_body"
  | "weak_cta"
  | "weak_hook_body"
  | "landing_page_issue"
  | "all_weak"
  | "scaling_candidate"
  | "weak_cta_image";

export interface Benchmarks {
  hookRate: { median: number; p25: number; p75: number };
  holdRate: { median: number; p25: number; p75: number };
  ctr: { median: number; p25: number; p75: number };
}

export interface DiagnosedCreative {
  ad_id: string;
  ad_name: string;
  thumbnail_url: string | null;
  ad_status: string | null;
  ad_type: string | null;
  isImage: boolean;
  spend: number;
  roas: number;
  cpa: number;
  frequency: number;
  hookRate: number;
  holdRate: number;
  ctr: number;
  hookLevel: MetricLevel;
  holdLevel: MetricLevel;
  ctrLevel: MetricLevel;
  diagnostic: DiagnosticType;
  recommendation: string;
  priorityScore: number;
  priorityLabel: "High" | "Medium" | "Low";
}

// ── Helpers ──────────────────────────────────────────────────────────

function spendWeightedPercentile(
  items: { value: number; spend: number }[],
  percentile: number
): number {
  if (items.length === 0) return 0;
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const totalSpend = sorted.reduce((s, i) => s + i.spend, 0);
  if (totalSpend === 0) return sorted[Math.floor(sorted.length / 2)].value;

  const target = totalSpend * (percentile / 100);
  let cum = 0;
  for (const item of sorted) {
    cum += item.spend;
    if (cum >= target) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

function levelFor(value: number, p25: number, p75: number): MetricLevel {
  if (value >= p75) return "strong";
  if (value <= p25) return "weak";
  return "average";
}

// ── Public API ───────────────────────────────────────────────────────

export function calculateBenchmarks(creatives: any[]): Benchmarks {
  const items = creatives.map((c) => ({
    hookRate: Number(c.thumb_stop_rate) || 0,
    holdRate: Number(c.hold_rate) || 0,
    ctr: Number(c.ctr) || 0,
    spend: Number(c.spend) || 0,
  }));

  const hookItems = items.map((i) => ({ value: i.hookRate, spend: i.spend }));
  const holdItems = items.map((i) => ({ value: i.holdRate, spend: i.spend }));
  const ctrItems = items.map((i) => ({ value: i.ctr, spend: i.spend }));

  return {
    hookRate: {
      median: spendWeightedPercentile(hookItems, 50),
      p25: spendWeightedPercentile(hookItems, 25),
      p75: spendWeightedPercentile(hookItems, 75),
    },
    holdRate: {
      median: spendWeightedPercentile(holdItems, 50),
      p25: spendWeightedPercentile(holdItems, 25),
      p75: spendWeightedPercentile(holdItems, 75),
    },
    ctr: {
      median: spendWeightedPercentile(ctrItems, 50),
      p25: spendWeightedPercentile(ctrItems, 25),
      p75: spendWeightedPercentile(ctrItems, 75),
    },
  };
}

const RECOMMENDATIONS: Record<DiagnosticType, string> = {
  weak_hook:
    "Test new opening hooks. The body and CTA are working — only change the first 3 seconds.",
  weak_body:
    "The hook grabs attention but viewers drop off. Tighten the pacing or restructure the middle section.",
  weak_cta:
    "Strong engagement but low clicks. Test a different end card, CTA overlay, or offer framing.",
  weak_hook_body:
    "Consider a full creative rework. The concept or execution isn't connecting.",
  landing_page_issue:
    "People are watching the full video but not clicking. Check the landing page, offer, or CTA clarity.",
  all_weak:
    "This creative needs a complete rebuild — start with a new concept rather than iterating.",
  scaling_candidate: "No iteration needed — this is a scaling candidate.",
  weak_cta_image:
    "This image ad has a weak CTR. Test different headlines, copy, or visual hierarchy to drive more clicks.",
};

export function diagnoseCreatives(
  creatives: any[],
  benchmarks: Benchmarks,
  minSpend: number
): DiagnosedCreative[] {
  const qualified = creatives.filter(
    (c) => (Number(c.spend) || 0) >= minSpend
  );

  const results: DiagnosedCreative[] = [];

  for (const c of qualified) {
    const adType = (c.ad_type || "").toLowerCase();
    const isImage = adType === "image" || adType === "carousel" || adType === "static";

    const hookRate = Number(c.thumb_stop_rate) || 0;
    const holdRate = Number(c.hold_rate) || 0;
    const ctr = Number(c.ctr) || 0;
    const spend = Number(c.spend) || 0;

    // For image ads, hook/hold are not applicable — treat as "average" (neutral)
    const hookLevel = isImage ? "average" as MetricLevel : levelFor(hookRate, benchmarks.hookRate.p25, benchmarks.hookRate.p75);
    const holdLevel = isImage ? "average" as MetricLevel : levelFor(holdRate, benchmarks.holdRate.p25, benchmarks.holdRate.p75);
    const ctrLevel = levelFor(ctr, benchmarks.ctr.p25, benchmarks.ctr.p75);

    // Diagnostic logic
    let diagnostic: DiagnosticType;

    if (isImage) {
      // Image ads: only CTR matters
      if (ctrLevel === "strong") {
        diagnostic = "scaling_candidate";
      } else if (ctrLevel === "weak") {
        diagnostic = "weak_cta_image";
      } else {
        // Average CTR — no action needed
        continue;
      }
    } else {
      // Video ads: full 3-zone diagnosis
      const hookWeak = hookLevel === "weak";
      const holdWeak = holdLevel === "weak";
      const ctrWeak = ctrLevel === "weak";
      const hookStrong = hookLevel === "strong";
      const holdStrong = holdLevel === "strong";
      const ctrStrong = ctrLevel === "strong";

      if (hookStrong && holdStrong && ctrStrong) {
        diagnostic = "scaling_candidate";
      } else if (hookWeak && holdWeak && ctrWeak) {
        diagnostic = "all_weak";
      } else if (hookWeak && holdWeak) {
        diagnostic = "weak_hook_body";
      } else if (hookStrong && holdStrong && ctrWeak) {
        diagnostic = "landing_page_issue";
      } else if (hookWeak && !holdWeak) {
        diagnostic = "weak_hook";
      } else if (!hookWeak && holdWeak) {
        diagnostic = "weak_body";
      } else if (!hookWeak && !holdWeak && ctrWeak) {
        diagnostic = "weak_cta";
      } else {
        continue;
      }
    }

    // Skip scaling candidates from iteration list
    if (diagnostic === "scaling_candidate") continue;

    // Priority score = daily spend × performance gap
    const createdAt = c.created_at ? new Date(c.created_at) : new Date();
    const daysActive = Math.max(
      1,
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailySpend = spend / daysActive;

    // Performance gap: worst metric gap as a percentage
    const gaps: number[] = [];
    if (!isImage) {
      if (hookLevel === "weak" && benchmarks.hookRate.median > 0)
        gaps.push((benchmarks.hookRate.median - hookRate) / benchmarks.hookRate.median);
      if (holdLevel === "weak" && benchmarks.holdRate.median > 0)
        gaps.push((benchmarks.holdRate.median - holdRate) / benchmarks.holdRate.median);
    }
    if (ctrLevel === "weak" && benchmarks.ctr.median > 0)
      gaps.push((benchmarks.ctr.median - ctr) / benchmarks.ctr.median);

    const performanceGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    const priorityScore = dailySpend * performanceGap;

    let priorityLabel: "High" | "Medium" | "Low";
    if (diagnostic === "weak_hook" || diagnostic === "landing_page_issue" || diagnostic === "weak_cta_image") {
      priorityLabel = "High";
    } else if (diagnostic === "weak_body" || diagnostic === "weak_cta") {
      priorityLabel = "Medium";
    } else {
      priorityLabel = "Low";
    }

    results.push({
      ad_id: c.ad_id,
      ad_name: c.ad_name,
      thumbnail_url: c.thumbnail_url,
      ad_status: c.ad_status,
      ad_type: c.ad_type || null,
      isImage,
      spend,
      roas: Number(c.roas) || 0,
      cpa: Number(c.cpa) || 0,
      frequency: Number(c.frequency) || 0,
      hookRate,
      holdRate,
      ctr,
      hookLevel,
      holdLevel,
      ctrLevel,
      diagnostic,
      recommendation: RECOMMENDATIONS[diagnostic],
      priorityScore,
      priorityLabel,
    });
  }

  return results.sort((a, b) => b.priorityScore - a.priorityScore);
}

export const DIAGNOSTIC_META: Record<
  DiagnosticType,
  { label: string; color: string }
> = {
  weak_hook: { label: "Weak Hook", color: "bg-warning text-warning-foreground" },
  weak_body: { label: "Weak Body", color: "bg-[hsl(48_96%_53%)] text-[hsl(20_25%_10%)]" },
  weak_cta: { label: "Weak CTA", color: "bg-info text-info-foreground" },
  weak_hook_body: { label: "Weak Hook + Body", color: "bg-destructive text-destructive-foreground" },
  landing_page_issue: { label: "Landing Page Issue?", color: "bg-[hsl(265_50%_60%)] text-white" },
  all_weak: { label: "Full Rebuild", color: "bg-destructive text-destructive-foreground" },
  scaling_candidate: { label: "Scaling Candidate", color: "bg-success text-success-foreground" },
  weak_cta_image: { label: "Weak CTR (Image)", color: "bg-info text-info-foreground" },
};
