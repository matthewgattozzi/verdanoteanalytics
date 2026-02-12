import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { ad_id } = await req.json();
    if (!ad_id) {
      return new Response(JSON.stringify({ error: "ad_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the creative
    const { data: creative, error: fetchError } = await supabase
      .from("creatives")
      .select("*")
      .eq("ad_id", ad_id)
      .single();

    if (fetchError || !creative) {
      return new Response(JSON.stringify({ error: "Creative not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as analyzing
    await supabase
      .from("creatives")
      .update({ analysis_status: "analyzing" })
      .eq("ad_id", ad_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are an expert paid media creative strategist analyzing Meta ad creatives. Analyze this ad creative and provide actionable insights.

**Creative Details:**
- Ad Name: ${creative.ad_name}
- Type: ${creative.ad_type || "Unknown"}
- Person/Talent: ${creative.person || "Unknown"}
- Style: ${creative.style || "Unknown"}
- Hook Approach: ${creative.hook || "Unknown"}
- Product: ${creative.product || "Unknown"}
- Theme: ${creative.theme || "Unknown"}
- Campaign: ${creative.campaign_name || "Unknown"}
- Ad Set: ${creative.adset_name || "Unknown"}

**Performance Metrics:**
- Spend: $${creative.spend || 0}
- ROAS: ${creative.roas || 0}x
- CPA: $${creative.cpa || 0}
- CTR: ${creative.ctr || 0}%
- CPM: $${creative.cpm || 0}
- Purchases: ${creative.purchases || 0}
- Impressions: ${creative.impressions || 0}
- Clicks: ${creative.clicks || 0}
- Thumb Stop Rate: ${creative.thumb_stop_rate || 0}%
- Hold Rate: ${creative.hold_rate || 0}%

Provide your analysis using the following tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior performance marketing creative strategist. Provide concise, actionable analysis." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "creative_analysis",
              description: "Return structured creative analysis with four sections.",
              parameters: {
                type: "object",
                properties: {
                  overview: {
                    type: "string",
                    description: "2-3 sentence overall performance assessment. Is this a winner, watcher, or underperformer? Why?",
                  },
                  hook_analysis: {
                    type: "string",
                    description: "2-3 sentences on the hook execution. How effective is the opening approach? What could improve the thumb-stop rate?",
                  },
                  visual_notes: {
                    type: "string",
                    description: "2-3 sentences on visual/style execution. How does the creative style support or hinder the message? Suggestions for iteration.",
                  },
                  cta_strategy: {
                    type: "string",
                    description: "2-3 sentences on CTA and conversion strategy. Is the path from attention to action clear? What adjustments could improve CPA/ROAS?",
                  },
                },
                required: ["overview", "hook_analysis", "visual_notes", "cta_strategy"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "creative_analysis" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        await supabase.from("creatives").update({ analysis_status: "pending" }).eq("ad_id", ad_id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        await supabase.from("creatives").update({ analysis_status: "pending" }).eq("ad_id", ad_id);
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured analysis");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Save analysis to DB
    const { data: updated, error: updateError } = await supabase
      .from("creatives")
      .update({
        ai_analysis: analysis.overview,
        ai_hook_analysis: analysis.hook_analysis,
        ai_visual_notes: analysis.visual_notes,
        ai_cta_notes: analysis.cta_strategy,
        analysis_status: "analyzed",
        analyzed_at: new Date().toISOString(),
      })
      .eq("ad_id", ad_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
