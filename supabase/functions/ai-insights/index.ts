import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a senior performance marketing analyst. Analyze the provided advertising data to identify winning creative patterns and optimization opportunities.

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { account_id, stream } = await req.json();

    // Fetch account details for business context
    let businessContext = "";
    let companyPdfContent = "";
    let customInsightsPrompt: string | null = null;
    if (account_id && account_id !== "all") {
      const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: account } = await supabaseService
        .from("ad_accounts")
        .select("name, company_description, company_pdf_url, primary_kpi, secondary_kpis, winner_roas_threshold, iteration_spend_threshold, insights_prompt")
        .eq("id", account_id)
        .single();
      let customInsightsPrompt: string | null = null;
      if (account) {
        customInsightsPrompt = account.insights_prompt || null;
        businessContext = `\nBusiness Context:
- Company/Account: ${account.name}
- Primary KPI: ${account.primary_kpi || `Purchase ROAS > ${account.winner_roas_threshold || 2.0}x`}
- Secondary KPIs: ${account.secondary_kpis || "CTR, Hook Rate, Volume"}
- Winner ROAS Threshold: ${account.winner_roas_threshold || 2.0}x
- Min Spend Threshold: $${account.iteration_spend_threshold || 50}\n`;

        // Fetch company PDF if available
        if (account.company_pdf_url) {
          try {
            const pdfPath = account.company_pdf_url.replace(/.*\/company-docs\//, "");
            const { data: pdfData } = await supabaseService.storage.from("company-docs").download(pdfPath);
            if (pdfData) {
              const arrayBuf = await pdfData.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
              companyPdfContent = base64;
            }
          } catch (e) {
            console.error("Failed to fetch company PDF:", e);
          }
        }
      }
    }

    // Fetch creative data
    let query = supabase.from("creatives").select("*");
    if (account_id && account_id !== "all") {
      query = query.eq("account_id", account_id);
    }
    const { data: creatives, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!creatives || creatives.length === 0) {
      return new Response(JSON.stringify({ error: "No creative data found for this account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build data summary for the prompt
    const totalSpend = creatives.reduce((s, c) => s + (Number(c.spend) || 0), 0);
    const withSpend = creatives.filter(c => (Number(c.spend) || 0) > 0);
    const dateRange = creatives.length > 0
      ? `Data contains ${creatives.length} creatives (${withSpend.length} with spend)`
      : "";

    // Prepare condensed data table
    const dataRows = creatives
      .sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0))
      .slice(0, 200) // Limit to top 200 by spend to stay within token limits
      .map(c => ({
        ad_name: c.ad_name?.substring(0, 80),
        status: c.ad_status,
        type: c.ad_type,
        person: c.person,
        style: c.style,
        hook: c.hook,
        product: c.product,
        theme: c.theme,
        spend: Number(c.spend)?.toFixed(2),
        roas: Number(c.roas)?.toFixed(2),
        cpa: Number(c.cpa)?.toFixed(2),
        cpm: Number(c.cpm)?.toFixed(2),
        cpc: Number(c.cpc)?.toFixed(2),
        ctr: Number(c.ctr)?.toFixed(2),
        hook_rate: Number(c.thumb_stop_rate)?.toFixed(2),
        hold_rate: Number(c.hold_rate)?.toFixed(2),
        frequency: Number(c.frequency)?.toFixed(2),
        impressions: c.impressions,
        clicks: c.clicks,
        purchases: c.purchases,
        purchase_value: Number(c.purchase_value)?.toFixed(2),
        adds_to_cart: c.adds_to_cart,
        cost_per_atc: Number(c.cost_per_add_to_cart)?.toFixed(2),
        video_views: c.video_views,
        video_avg_play: Number(c.video_avg_play_time)?.toFixed(1),
        result_type: c.result_type,
        campaign: c.campaign_name?.substring(0, 60),
        adset: c.adset_name?.substring(0, 60),
      }));

    const userPrompt = `${businessContext}
Data Overview: ${dateRange}. Total spend: $${totalSpend.toFixed(2)}.
${creatives.length > 200 ? `(Showing top 200 creatives by spend out of ${creatives.length} total)` : ""}

Creative Data (JSON):
${JSON.stringify(dataRows, null, 0)}

Please provide a comprehensive analysis following the required structure.`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Build user content for Anthropic format
    const userContent: any[] = [];
    if (companyPdfContent) {
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: companyPdfContent },
      });
      userContent.push({ type: "text", text: "Here is the company information document for context." });
    }
    userContent.push({ type: "text", text: userPrompt });

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: customInsightsPrompt || SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        stream: !!stream,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, text);
      throw new Error("AI analysis failed");
    }

    if (stream) {
      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming: extract text from Anthropic response format
    const result = await aiResponse.json();
    const analysis = result.content?.map((b: any) => b.text).join("") || "No analysis generated.";

    // Save to history
    await supabase.from("ai_insights").insert([{
      user_id: user.id,
      account_id: account_id && account_id !== "all" ? account_id : null,
      title: `Analysis — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      analysis,
      creative_count: creatives.length,
      total_spend: totalSpend,
    }]);

    return new Response(JSON.stringify({ analysis, creative_count: creatives.length, total_spend: totalSpend }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
