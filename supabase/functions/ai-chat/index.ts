import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, conversationId, accountId } = await req.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load existing conversation if continuing
    let existingMessages: { role: string; content: string }[] = [];
    let convId = conversationId;

    if (convId) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .select("messages")
        .eq("id", convId)
        .eq("user_id", user.id)
        .single();
      if (conv?.messages) existingMessages = conv.messages;
    }

    // Fetch creative context data
    const contextData = await fetchCreativeContext(supabase, accountId, user.id);

    const systemPrompt = buildSystemPrompt(contextData);

    // Build messages array for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...existingMessages,
      { role: "user", content: message },
    ];

    // Call Lovable AI
    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content ?? "Sorry, I could not generate a response.";

    // Persist conversation
    const updatedMessages = [
      ...existingMessages,
      { role: "user", content: message },
      { role: "assistant", content: answer },
    ];

    if (convId) {
      await supabase
        .from("ai_conversations")
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq("id", convId);
    } else {
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          account_id: accountId && accountId !== "all" ? accountId : null,
          messages: updatedMessages,
        })
        .select("id")
        .single();
      convId = newConv?.id;
    }

    return new Response(JSON.stringify({ answer, conversationId: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-chat error:", err);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchCreativeContext(supabase: any, accountId: string | null, userId: string) {
  let creativesQuery = supabase
    .from("creatives")
    .select("ad_name, spend, roas, cpa, ctr, thumb_stop_rate, hold_rate, ad_type, tag_source, hook, theme, product, style, ad_status")
    .order("spend", { ascending: false })
    .limit(60);

  if (accountId && accountId !== "all") {
    creativesQuery = creativesQuery.eq("account_id", accountId);
  }

  const { data: creatives } = await creativesQuery;

  let accountName = "All Accounts";
  if (accountId && accountId !== "all") {
    const { data: acc } = await supabase
      .from("ad_accounts")
      .select("name")
      .eq("id", accountId)
      .single();
    if (acc) accountName = acc.name;
  }

  return { creatives: creatives || [], accountName };
}

function buildSystemPrompt(ctx: { creatives: any[]; accountName: string }): string {
  const { creatives, accountName } = ctx;

  const totalSpend = creatives.reduce((s, c) => s + (c.spend || 0), 0);
  const avgRoas = creatives.length
    ? creatives.reduce((s, c) => s + (c.roas || 0), 0) / creatives.length
    : 0;
  const avgCtr = creatives.length
    ? creatives.reduce((s, c) => s + (c.ctr || 0), 0) / creatives.length
    : 0;

  const topByRoas = [...creatives]
    .filter(c => c.roas > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5)
    .map(c => `"${c.ad_name}" (ROAS: ${c.roas?.toFixed(2)}, Spend: $${c.spend?.toFixed(0)})`)
    .join("; ");

  const topBySpend = [...creatives]
    .sort((a, b) => (b.spend || 0) - (a.spend || 0))
    .slice(0, 5)
    .map(c => `"${c.ad_name}" ($${c.spend?.toFixed(0)})`)
    .join("; ");

  return `You are Verdanote AI, an expert creative performance analyst for Meta advertising.

CURRENT ACCOUNT: ${accountName}
DATASET: ${creatives.length} creatives | Total Spend: $${totalSpend.toFixed(0)} | Avg ROAS: ${avgRoas.toFixed(2)}x | Avg CTR: ${(avgCtr * 100).toFixed(2)}%

TOP PERFORMERS BY ROAS: ${topByRoas || "N/A"}
TOP SPENDERS: ${topBySpend || "N/A"}

FULL CREATIVE DATA (name | spend | roas | cpa | ctr% | hook% | hold% | type | status):
${creatives.slice(0, 40).map(c =>
  `${c.ad_name} | $${(c.spend||0).toFixed(0)} | ${(c.roas||0).toFixed(2)}x | $${(c.cpa||0).toFixed(0)} | ${((c.ctr||0)*100).toFixed(1)}% | ${((c.thumb_stop_rate||0)*100).toFixed(1)}% | ${((c.hold_rate||0)*100).toFixed(1)}% | ${c.ad_type||'?'} | ${c.ad_status||'?'}`
).join("\n")}

You have deep knowledge of Meta advertising, creative strategy, and performance marketing. 
Answer questions concisely but thoroughly. When asked for recommendations, be specific and actionable.
Format responses with markdown when helpful (lists, bold key metrics).`;
}
