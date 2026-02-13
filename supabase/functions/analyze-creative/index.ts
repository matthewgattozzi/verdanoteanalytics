import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const AI_TOOL = {
  type: "function" as const,
  function: {
    name: "creative_analysis",
    description: "Return structured iteration-focused creative analysis with four sections.",
    parameters: {
      type: "object",
      properties: {
        overview: { type: "string", description: "2-3 sentence iteration diagnosis: what's working, what's broken, and whether to iterate or rebuild." },
        hook_analysis: { type: "string", description: "2-3 sentences evaluating the first 3 seconds (hook). Is it stopping the scroll? Specific suggestions to test if weak." },
        visual_notes: { type: "string", description: "2-3 sentences on pacing, story structure, and body content. Are viewers staying after the hook? What to change if they drop off." },
        cta_strategy: { type: "string", description: "2-3 sentences on end card, CTA, and click-through. If CTR is low despite good engagement, diagnose why and suggest specific tests." },
      },
      required: ["overview", "hook_analysis", "visual_notes", "cta_strategy"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Auth: require builder or employee role
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (!userRole || !["builder", "employee"].includes(userRole.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

      // Fetch account-level custom prompt
      const { data: account } = await supabase
        .from("ad_accounts").select("creative_analysis_prompt").eq("id", creative.account_id).single();
      const customSystemPrompt = account?.creative_analysis_prompt || null;

      await supabase.from("creatives").update({ analysis_status: "analyzing" }).eq("ad_id", ad_id);

      const result = await analyzeOne(creative, LOVABLE_API_KEY, customSystemPrompt);
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
      const accountId = body.account_id;
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

      // Fetch custom prompts per account (batch)
      const accountIds = [...new Set(creatives.map((c: any) => c.account_id))];
      const { data: accounts } = await supabase
        .from("ad_accounts").select("id, creative_analysis_prompt").in("id", accountIds);
      const promptMap: Record<string, string | null> = {};
      (accounts || []).forEach((a: any) => { promptMap[a.id] = a.creative_analysis_prompt || null; });

      const ids = creatives.map((c: any) => c.ad_id);
      await supabase.from("creatives").update({ analysis_status: "analyzing" }).in("ad_id", ids);

      let analyzed = 0;
      let errors = 0;

      for (const creative of creatives) {
        try {
          const result = await analyzeOne(creative, LOVABLE_API_KEY, promptMap[creative.account_id] || null);
          if (result.error) {
            errors++;
            await supabase.from("creatives").update({ analysis_status: "pending" }).eq("ad_id", creative.ad_id);
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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeOne(creative: any, apiKey: string, customSystemPrompt: string | null): Promise<any> {
  const imageUrl = creative.thumbnail_url || creative.preview_url;

  const userContent: any[] = [];

  // Gemini can handle image URLs directly
  if (imageUrl) {
    userContent.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  const isImage = (creative.ad_type || "").toLowerCase() === "image" ||
    (creative.ad_type || "").toLowerCase() === "static" ||
    (creative.ad_type || "").toLowerCase() === "carousel" ||
    (creative.ad_name || "").toLowerCase().includes("static") ||
    ((Number(creative.thumb_stop_rate) || 0) === 0 && (Number(creative.hold_rate) || 0) === 0);

  const textPrompt = `Analyze this Meta ad creative for ITERATION opportunities. Your job is to diagnose exactly WHAT part of the creative to iterate on — the hook, the body, or the CTA — so the team doesn't waste effort remaking the entire ad.

Ad Details:
- Ad Name: ${creative.ad_name} | Type: ${isImage ? "Image/Static" : creative.ad_type || "Video"} | Person: ${creative.person || "Unknown"}
- Style: ${creative.style || "Unknown"} | Hook: ${creative.hook || "Unknown"} | Product: ${creative.product || "Unknown"}
- Spend: $${creative.spend || 0} | ROAS: ${creative.roas || 0}x | CPA: $${creative.cpa || 0} | CTR: ${creative.ctr || 0}%
- Hook Rate: ${creative.thumb_stop_rate || 0}% | Hold Rate: ${creative.hold_rate || 0}% | Frequency: ${creative.frequency || 0}
- CPM: $${creative.cpm || 0} | Purchases: ${creative.purchases || 0} | Impressions: ${creative.impressions || 0}

${isImage ? "This is an IMAGE ad — hook rate and hold rate don't apply. Focus your analysis on visual impact, copy, and CTR." : "This is a VIDEO ad — evaluate all three zones: Hook (first 3s), Body (middle), and CTA (end/click)."}
${imageUrl ? "I've attached the creative visual. Reference specific elements you see — colors, composition, text overlays, talent, branding." : "No visual asset available — analyze based on metadata only."}

Be specific and actionable. Tell the team exactly what to change and what to keep.`;
  userContent.push({ type: "text", text: textPrompt });

  const defaultSystemPrompt = "You are a senior performance marketing creative strategist specializing in creative iteration. Your goal is to diagnose WHERE an ad breaks down (hook, body, or CTA) and recommend precisely WHAT to iterate on — never suggest remaking the whole ad unless all metrics are weak. When visuals are provided, reference specific elements. Be direct, concise, and actionable.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: customSystemPrompt || defaultSystemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [AI_TOOL],
      tool_choice: { type: "function", function: { name: "creative_analysis" } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) return { error: "Rate limit exceeded. Please try again later.", status: 429 };
    if (status === 402) return { error: "Insufficient credits. Please add funds.", status: 402 };
    const errText = await response.text();
    console.error("AI gateway error:", status, errText);
    return { error: `AI gateway error: ${status}`, status };
  }

  const aiResult = await response.json();

  try {
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    // Fallback: try parsing content as JSON
    const text = aiResult.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { error: "AI did not return structured analysis" };
  } catch {
    return { error: "Failed to parse AI response" };
  }
}
