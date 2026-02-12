import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const DEFAULT_CREATIVE_PROMPT = `You are a senior performance marketing creative strategist. When visuals are provided, analyze them in detail — comment on imagery, text overlays, composition, branding, and emotional appeal. Provide concise, actionable analysis.`;

const DEFAULT_INSIGHTS_PROMPT = `You are a senior performance marketing analyst. Analyze the provided advertising data to identify winning creative patterns and optimization opportunities.

Important: Avoid generic, cookie-cutter analysis. Focus on what's unique, surprising, or counterintuitive in THIS specific dataset. Surface insights that wouldn't be obvious from a surface-level review.

Required Analyses:

1. Creative Pattern Analysis
- Format performance: Compare Video vs Image vs Carousel/Flexible
- Content themes: Group ads by messaging angle and compare performance
- Hook variations: If ads have hook versions, determine which hooks win
- Naming patterns: Extract patterns from ad names that correlate with performance

2. Engagement-to-Conversion Analysis (video ads)
- Correlate Hook Rate with CPA and ROAS
- Correlate Hold Rate with CPA and ROAS
- Analyze video play time impact on conversions
- Identify engagement thresholds that predict success

3. Frequency & Reach Efficiency Analysis
- Segment performance by frequency bands (1-1.5x, 1.5-2x, 2-2.5x, 2.5-3x, 3x+)
- CPMr analysis: cost per 1,000 reached users
- Frequency × ROAS relationship
- Flag ads with high frequency but declining performance (fatigue)

4. Cost Efficiency Analysis
- CPM vs CPMr comparison
- CTR bands: segment by CTR (0-2%, 2-3%, 3-4%, 4%+)
- Funnel efficiency: CTR → Add to Cart → Purchase conversion rates
- Identify which input metrics most strongly predict ROAS and CPA

5. Anomaly Detection
Positive anomalies (opportunities):
- Ads with exceptional ROAS (>2x) that have low spend (<$500) — scaling candidates
- Inactive/paused ads with strong historical performance — reactivation candidates
- Ads maintaining strong ROAS at high frequency (not fatiguing)

Negative anomalies (problems):
- High-spend ads with below-average ROAS — budget reallocation candidates
- Ads with ROAS <1x — pause immediately
- Ads with high CTR but poor conversion — messaging/landing page mismatch
- Ads with high frequency AND declining ROAS — creative fatigue

6. Correlation Analysis
Calculate correlations between: Hook Rate ↔ CPA, Hold Rate ↔ CPA, Frequency ↔ ROAS, CTR ↔ ROAS, Video play time ↔ conversion rate. For each: state direction, strength, and whether it's actionable.

7. Statistical Validation
For key findings: provide sample sizes, magnitude of differences, and note when sample sizes are too small.

Output Structure:
- **Executive Summary** (1 paragraph): The single most important finding and recommended action.
- **Key Findings** (prioritized): For each — What, Evidence, So What, Action.
- **Creative Winners**: Top 10-15 ads to scale with key metrics.
- **Creative Losers**: Ads to pause or optimize with specific issues.
- **Frequency & Reach Insights**: Optimal frequency, CPMr benchmarks, fatigue indicators.
- **Pattern Insights**: Best themes/angles, winning hooks/formats, engagement thresholds.
- **Correlation Summary Table**: Metric pairs with correlation direction, strength, implication.
- **Recommendations**: Immediate (this week), Short-term (next 2 weeks), Strategic (next month).

Guidelines:
- Use weighted metrics (by spend) for aggregate comparisons, not simple averages
- Flag findings where sample size is <5 ads or <$500 total spend
- Compare like-to-like where relevant
- Prioritize surprising or counterintuitive findings
- Look for interaction effects
- Don't just report what's working — explain WHY it might be working
- Use markdown formatting with headers, tables, bold, and bullet points for readability`;

interface AIContextSectionProps {
  account: any;
  primaryKpi: string;
  setPrimaryKpi: (v: string) => void;
  secondaryKpis: string;
  setSecondaryKpis: (v: string) => void;
  companyPdfUrl: string | null;
  setCompanyPdfUrl: (v: string | null) => void;
  creativePrompt: string;
  setCreativePrompt: (v: string) => void;
  insightsPrompt: string;
  setInsightsPrompt: (v: string) => void;
  onSaveSettings: (updates: Record<string, any>) => Promise<void>;
  onApplyPromptsToAll?: () => void;
  applyingToAll?: boolean;
  applyProgress?: { current: number; total: number };
  showApplyAll?: boolean;
}

export { DEFAULT_CREATIVE_PROMPT, DEFAULT_INSIGHTS_PROMPT };

export function AIContextSection({
  account, primaryKpi, setPrimaryKpi, secondaryKpis, setSecondaryKpis,
  companyPdfUrl, setCompanyPdfUrl,
  creativePrompt, setCreativePrompt, insightsPrompt, setInsightsPrompt,
  onSaveSettings, onApplyPromptsToAll, applyingToAll, applyProgress, showApplyAll,
}: AIContextSectionProps) {
  const [uploadingPdf, setUploadingPdf] = useState(false);

  return (
    <section className="glass-panel p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold">AI Analysis Context</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Helps AI understand your business for better creative analysis. Company name is pulled from the account name.</p>
      </div>

      {/* Company PDF */}
      <div className="space-y-2">
        <Label className="text-sm">Company Info PDF</Label>
        <p className="text-[11px] text-muted-foreground">Upload a PDF with details about the company, products, target audience, etc. This context helps the AI produce more relevant analysis.</p>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                toast.error("File too large — max 10MB.");
                return;
              }
              setUploadingPdf(true);
              try {
                const filePath = `${account.id}/${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from("company-docs").upload(filePath, file, { upsert: true });
                if (uploadError) throw uploadError;
                const pdfUrl = `company-docs/${uploadData.path}`;
                await onSaveSettings({ company_pdf_url: pdfUrl });
                setCompanyPdfUrl(pdfUrl);
                toast.success("Company info PDF saved successfully.");
              } catch (err: any) {
                toast.error(`Upload failed: ${err.message}`);
              } finally {
                setUploadingPdf(false);
                e.target.value = "";
              }
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer"
            disabled={uploadingPdf}
          />
          {uploadingPdf && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {companyPdfUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="text-xs">PDF uploaded</Badge>
            <span className="truncate max-w-[200px]">{companyPdfUrl.split("/").pop()}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={async () => {
                const path = companyPdfUrl.replace("company-docs/", "");
                await supabase.storage.from("company-docs").remove([path]);
                await onSaveSettings({ company_pdf_url: null });
                setCompanyPdfUrl(null);
                toast.success("PDF removed");
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Primary KPI</Label>
          <Input value={primaryKpi} onChange={(e) => setPrimaryKpi(e.target.value)} placeholder="e.g. Purchase ROAS > 1.5x" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Secondary KPIs</Label>
          <Input value={secondaryKpis} onChange={(e) => setSecondaryKpis(e.target.value)} placeholder="e.g. CTR, Hook Rate, Volume" className="bg-background" />
        </div>
      </div>

      {/* Creative Analysis Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Creative Analysis System Prompt</Label>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setCreativePrompt(DEFAULT_CREATIVE_PROMPT)}
            title="Reset to default"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">System prompt used when analyzing individual ad creatives.</p>
        <textarea
          value={creativePrompt}
          onChange={(e) => setCreativePrompt(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          placeholder="Enter custom system prompt for creative analysis…"
        />
      </div>

      {/* Insights Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">AI Insights System Prompt</Label>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setInsightsPrompt(DEFAULT_INSIGHTS_PROMPT)}
            title="Reset to default"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">System prompt used for full account-level performance insights analysis.</p>
        <textarea
          value={insightsPrompt}
          onChange={(e) => setInsightsPrompt(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          placeholder="Enter custom system prompt for AI insights…"
        />
      </div>

      {/* Apply to all accounts */}
      {showApplyAll && onApplyPromptsToAll && (
        <div className="pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={onApplyPromptsToAll}
            disabled={applyingToAll}
            className="w-full"
          >
            {applyingToAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {applyingToAll && applyProgress ? `Updating ${applyProgress.current}/${applyProgress.total} accounts…` : "Copy prompts to all accounts"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">Applies both system prompts to every account.</p>
        </div>
      )}
    </section>
  );
}
