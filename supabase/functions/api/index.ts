import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractApiKey(req: Request): string | null {
  // Support both Authorization: Bearer <key> and x-api-key: <key>
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }
  return req.headers.get("x-api-key");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Authenticate via x-api-key header or Authorization: Bearer <key>
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key. Use x-api-key header or Authorization: Bearer <key>" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keyHash = await sha256Hex(apiKey);
  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys")
    .select("id, user_id, is_active, permissions")
    .eq("key_hash", keyHash)
    .single();

  if (keyError || !keyRecord || !keyRecord.is_active) {
    return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at (fire and forget)
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id).then(() => {});

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const resource = pathParts[0];
  const resourceId = pathParts[1];
  const userId = keyRecord.user_id;

  try {
    // GET /api/accounts
    if (resource === "accounts" && !resourceId) {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("id, name, creative_count, untagged_count, last_synced_at, is_active, created_at");

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/creatives or /api/creatives/:id
    if (resource === "creatives") {
      if (resourceId) {
        const { data, error } = await supabase
          .from("creatives")
          .select("ad_id, ad_name, account_id, spend, roas, ctr, cpa, impressions, clicks, purchases, hook, theme, product, style, person, ad_type, ad_status, thumbnail_url, created_at, updated_at")
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
        .select("ad_id, ad_name, account_id, spend, roas, ctr, cpa, impressions, clicks, purchases, hook, theme, product, style, person, ad_type, ad_status, thumbnail_url, created_at, updated_at", { count: "exact" })
        .range(offset, offset + limit - 1);

      if (accountId) query = query.eq("account_id", accountId);

      const { data, error, count } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ data, total: count, limit, offset }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/metrics
    if (resource === "metrics") {
      const accountId = url.searchParams.get("account_id");

      let query = supabase
        .from("creatives")
        .select("spend, roas, ctr, cpa, impressions, clicks, purchases, purchase_value");

      if (accountId) query = query.eq("account_id", accountId);

      const { data, error } = await query;
      if (error) throw error;

      const metrics = (data || []).reduce((acc, row) => {
        acc.total_spend += row.spend || 0;
        acc.total_impressions += row.impressions || 0;
        acc.total_clicks += row.clicks || 0;
        acc.total_purchases += row.purchases || 0;
        acc.total_purchase_value += row.purchase_value || 0;
        acc.creative_count += 1;
        return acc;
      }, { total_spend: 0, total_impressions: 0, total_clicks: 0, total_purchases: 0, total_purchase_value: 0, creative_count: 0 });

      const blended_roas = metrics.total_spend > 0 ? metrics.total_purchase_value / metrics.total_spend : 0;
      const average_ctr = metrics.total_impressions > 0 ? (metrics.total_clicks / metrics.total_impressions) * 100 : 0;
      const average_cpa = metrics.total_purchases > 0 ? metrics.total_spend / metrics.total_purchases : 0;

      return new Response(JSON.stringify({
        data: { ...metrics, blended_roas, average_ctr, average_cpa }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("API error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
