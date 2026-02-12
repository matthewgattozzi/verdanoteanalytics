import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_TOOL = {
  type: "function" as const,
  function: {
    name: "creative_analysis",
    description: "Return structured creative analysis with four sections.",
    parameters: {
      type: "object",
      properties: {
        overview: { type: "string", description: "2-3 sentence overall performance assessment." },
        hook_analysis: { type: "string", description: "2-3 sentences on hook execution." },
        visual_notes: { type: "string", description: "2-3 sentences on visual/style execution." },
        cta_strategy: { type: "string", description: "2-3 sentences on CTA and conversion strategy." },
      },
      required: ["overview", "hook_analysis", "visual_notes", "cta_strategy"],
      additionalProperties: false,
    },
  },
};

function buildPrompt(creative: any): string {
  return `Analyze this Meta ad creative:
- Ad Name: ${creative.ad_name} | Type: ${creative.ad_type || "Unknown"} | Person: ${creative.person || "Unknown"}
- Style: ${creative.style || "Unknown"} | Hook: ${creative.hook || "Unknown"} | Product: ${creative.product || "Unknown"}
- Spend: $${creative.spend || 0} | ROAS: ${creative.roas || 0}x | CPA: $${creative.cpa || 0} | CTR: ${creative.ctr || 0}%
- CPM: $${creative.cpm || 0} | Purchases: ${creative.purchases || 0} | Impressions: ${creative.impressions || 0}
Provide analysis using the tool.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { ad_id, bulk } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Single creative analysis
    if (ad_id && !bulk) {
      const { data: creative, error: fetchError } = await supabase
        .from("creatives").select("*").eq("ad_id", ad_id).single();
      if (fetchError || !creative) {
        return new Response(JSON.stringify({ error: "Creative not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("creatives").update({ analysis_status: "analyzing" }).eq("ad_id", ad_id);

      const result = await analyzeOne(creative, LOVABLE_API_KEY);
      if (result.error) {
        await supabase.from("creatives").update({ analysis_status: "pending" }).eq("ad_id", ad_id);
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: updateError } = await supabase.from("creatives").update({
        ai_analysis: result.overview,
        ai_hook_analysis: result.hook_analysis,
        ai_visual_notes: result.visual_notes,
        ai_cta_notes: result.cta_strategy,
        analysis_status: "analyzed",
        analyzed_at: new Date().toISOString(),
      }).eq("ad_id", ad_id).select().single();

      if (updateError) throw updateError;
      return new Response(JSON.stringify(updated), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bulk analysis
    if (bulk) {
      const limit = Math.min(body.limit || 20, 50);
      const { data: creatives, error: fetchErr } = await supabase
        .from("creatives").select("*")
        .in("analysis_status", ["pending", null as any])
        .gt("spend", 0)
        .order("spend", { ascending: false })
        .limit(limit);

      if (fetchErr) throw fetchErr;
      if (!creatives?.length) {
        return new Response(JSON.stringify({ analyzed: 0, errors: 0, message: "No creatives to analyze" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark all as analyzing
      const ids = creatives.map((c: any) => c.ad_id);
      await supabase.from("creatives").update({ analysis_status: "analyzing" }).in("ad_id", ids);

      let analyzed = 0;
      let errors = 0;

      for (const creative of creatives) {
        try {
          const result = await analyzeOne(creative, LOVABLE_API_KEY);
          if (result.error) {
            errors++;
            await supabase.from("creatives").update({ analysis_status: "pending" }).eq("ad_id", creative.ad_id);
            // If rate limited, stop processing
            if (result.status === 429 || result.status === 402) break;
            continue;
          }

          await supabase.from("creatives").update({
            ai_analysis: result.overview,
            ai_hook_analysis: result.hook_analysis,
            ai_visual_notes: result.visual_notes,
            ai_cta_notes: result.cta_strategy,
            analysis_status: "analyzed",
            analyzed_at: new Date().toISOString(),
          }).eq("ad_id", creative.ad_id);

          analyzed++;

          // Small delay between requests to avoid rate limits
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          errors++;
          await supabase.from("creatives").update({ analysis_status: "pending" }).eq("ad_id", creative.ad_id);
        }
      }

      return new Response(JSON.stringify({ analyzed, errors, total: creatives.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "ad_id or bulk required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeOne(creative: any, apiKey: string): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a senior performance marketing creative strategist. Provide concise, actionable analysis." },
        { role: "user", content: buildPrompt(creative) },
      ],
      tools: [AI_TOOL],
      tool_choice: { type: "function", function: { name: "creative_analysis" } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) return { error: "Rate limit exceeded.", status: 429 };
    if (status === 402) return { error: "AI credits exhausted.", status: 402 };
    const errText = await response.text();
    console.error("AI gateway error:", status, errText);
    return { error: `AI gateway error: ${status}`, status };
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return { error: "AI did not return structured analysis" };

  return JSON.parse(toolCall.function.arguments);
}
