import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiAuth, corsHeaders } from "../_shared/api-auth.ts";

serve(withApiAuth(async (req, { userId, permissions }) => {
  if (!permissions.includes("read")) {
    return new Response(
      JSON.stringify({ error: "Insufficient permissions" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/functions\/v1\/api\/?/, "").replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const resource = pathParts[0];
  const resourceId = pathParts[1];

  try {
    // GET /api/accounts
    if (resource === "accounts" && req.method === "GET") {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("id, name, creative_count, untagged_count, last_synced_at, is_active, created_at")
        .order("name");

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/creatives or /api/creatives/:id
    if (resource === "creatives" && req.method === "GET") {
      if (resourceId) {
        const { data, error } = await supabase
          .from("creatives")
          .select("ad_id, ad_name, account_id, spend, roas, ctr, cpa, cpm, cpc, impressions, clicks, purchases, purchase_value, adds_to_cart, hook, theme, product, style, person, ad_type, ad_status, thumbnail_url, created_at, updated_at")
          .eq("ad_id", resourceId)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accountId = url.searchParams.get("account_id");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabase
        .from("creatives")
        .select("ad_id, ad_name, account_id, spend, roas, ctr, cpa, cpm, cpc, impressions, clicks, purchases, purchase_value, adds_to_cart, hook, theme, product, style, person, ad_type, ad_status, thumbnail_url, created_at, updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (accountId) query = query.eq("account_id", accountId);

      const { data, error, count } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ data, total: count, limit, offset }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/metrics
    if (resource === "metrics" && req.method === "GET") {
      const accountId = url.searchParams.get("account_id");

      let query = supabase
        .from("creatives")
        .select("spend, roas, ctr, cpa, impressions, clicks, purchases, purchase_value");

      if (accountId) query = query.eq("account_id", accountId);

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      const total_spend = rows.reduce((s, c) => s + (c.spend || 0), 0);
      const total_purchase_value = rows.reduce((s, c) => s + (c.purchase_value || 0), 0);
      const total_impressions = rows.reduce((s, c) => s + (c.impressions || 0), 0);
      const total_clicks = rows.reduce((s, c) => s + (c.clicks || 0), 0);
      const total_purchases = rows.reduce((s, c) => s + (c.purchases || 0), 0);

      return new Response(JSON.stringify({
        data: {
          total_creatives: rows.length,
          total_spend,
          total_purchase_value,
          total_impressions,
          total_clicks,
          total_purchases,
          blended_roas: total_spend > 0 ? total_purchase_value / total_spend : 0,
          avg_ctr: total_impressions > 0 ? (total_clicks / total_impressions) * 100 : 0,
          avg_cpa: total_purchases > 0 ? total_spend / total_purchases : 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("API error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
