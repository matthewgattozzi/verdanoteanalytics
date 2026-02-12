import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISPLAY_NAMES: Record<string, string> = {
  UGCNative: "UGC Native", StudioClean: "Studio Clean", TextForward: "Text Forward",
  NoTalent: "No Talent", ProblemCallout: "Problem Callout", StatementBold: "Statement Bold",
  AuthorityIntro: "Authority Intro", BeforeAndAfter: "Before & After", PatternInterrupt: "Pattern Interrupt",
};

function toDisplayName(val: string): string { return DISPLAY_NAMES[val] || val; }

const VALID_TYPES = ["Video", "Static", "GIF", "Carousel"];
const VALID_PERSONS = ["Creator", "Customer", "Founder", "Actor", "NoTalent"];
const VALID_STYLES = ["UGCNative", "StudioClean", "TextForward", "Lifestyle"];
const VALID_HOOKS = ["ProblemCallout", "Confession", "Question", "StatementBold", "AuthorityIntro", "BeforeAndAfter", "PatternInterrupt"];

function parseAdName(adName: string) {
  const segments = adName.split("_");
  const unique_code = segments[0] || adName;
  if (segments.length === 7) {
    const [, type, person, style, product, hook, theme] = segments;
    if (VALID_TYPES.includes(type) && VALID_PERSONS.includes(person) && VALID_STYLES.includes(style) && VALID_HOOKS.includes(hook)) {
      return { unique_code, ad_type: toDisplayName(type), person: toDisplayName(person), style: toDisplayName(style), product, hook: toDisplayName(hook), theme, parsed: true };
    }
  }
  return { unique_code, ad_type: null, person: null, style: null, product: null, hook: null, theme: null, parsed: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/creatives\/?/, "").replace(/\/$/, "");

  try {
    // GET /creatives/filters — distinct filter values
    if (req.method === "GET" && path === "filters") {
      const controlledTypes = ["Video", "Static", "GIF", "Carousel"];
      const controlledPersons = ["Creator", "Customer", "Founder", "Actor", "No Talent"];
      const controlledStyles = ["UGC Native", "Studio Clean", "Text Forward", "Lifestyle"];
      const controlledHooks = ["Problem Callout", "Confession", "Question", "Statement Bold", "Authority Intro", "Before & After", "Pattern Interrupt"];

      const { data: products } = await supabase.from("creatives").select("product").not("product", "is", null);
      const { data: themes } = await supabase.from("creatives").select("theme").not("theme", "is", null);
      const { data: accounts } = await supabase.from("ad_accounts").select("id, name");

      const uniqueProducts = [...new Set((products || []).map((r: any) => r.product).filter(Boolean))];
      const uniqueThemes = [...new Set((themes || []).map((r: any) => r.theme).filter(Boolean))];

      return new Response(JSON.stringify({
        ad_type: controlledTypes,
        person: controlledPersons,
        style: controlledStyles,
        hook: controlledHooks,
        product: uniqueProducts,
        theme: uniqueThemes,
        accounts: accounts || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /creatives — list with filters
    if (req.method === "GET" && !path) {
      let query = supabase.from("creatives").select("*").order("spend", { ascending: false });

      const accountId = url.searchParams.get("account_id");
      const adType = url.searchParams.get("ad_type");
      const person = url.searchParams.get("person");
      const style = url.searchParams.get("style");
      const hook = url.searchParams.get("hook");
      const product = url.searchParams.get("product");
      const theme = url.searchParams.get("theme");
      const tagSource = url.searchParams.get("tag_source");
      const adStatus = url.searchParams.get("ad_status");
      const delivery = url.searchParams.get("delivery");
      const limit = parseInt(url.searchParams.get("limit") || "1000");

      if (accountId) query = query.eq("account_id", accountId);
      if (adType) query = query.eq("ad_type", adType);
      if (person) query = query.eq("person", person);
      if (style) query = query.eq("style", style);
      if (hook) query = query.eq("hook", hook);
      if (product) query = query.eq("product", product);
      if (theme) query = query.eq("theme", theme);
      if (tagSource) query = query.eq("tag_source", tagSource);
      if (adStatus) query = query.eq("ad_status", adStatus);
      if (delivery === "had_delivery") query = query.gt("spend", 0);
      if (delivery === "active") query = query.eq("ad_status", "ACTIVE");

      const dateFrom = url.searchParams.get("date_from");
      const dateTo = url.searchParams.get("date_to");
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00Z`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59Z`);

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PUT /creatives/:id — update tags
    if (req.method === "PUT" && path) {
      const body = await req.json();
      const { ad_type, person, style, product, hook, theme, tag_source } = body;

      const update: Record<string, any> = {};
      if (ad_type !== undefined) update.ad_type = ad_type;
      if (person !== undefined) update.person = person;
      if (style !== undefined) update.style = style;
      if (product !== undefined) update.product = product;
      if (hook !== undefined) update.hook = hook;
      if (theme !== undefined) update.theme = theme;

      if (tag_source === "untagged") {
        // Reset to auto — re-run tagging
        update.tag_source = "untagged";
        update.ad_type = null;
        update.person = null;
        update.style = null;
        update.product = null;
        update.hook = null;
        update.theme = null;

        const { data: creative } = await supabase.from("creatives").select("ad_name, account_id").eq("ad_id", path).single();
        if (creative) {
          const parsed = parseAdName(creative.ad_name);
          if (parsed.parsed) {
            update.ad_type = parsed.ad_type;
            update.person = parsed.person;
            update.style = parsed.style;
            update.product = parsed.product;
            update.hook = parsed.hook;
            update.theme = parsed.theme;
            update.tag_source = "parsed";
            update.unique_code = parsed.unique_code;
          } else {
            const { data: mapping } = await supabase.from("name_mappings").select("*").eq("account_id", creative.account_id).eq("unique_code", parsed.unique_code).single();
            if (mapping) {
              update.ad_type = mapping.ad_type;
              update.person = mapping.person;
              update.style = mapping.style;
              update.product = mapping.product;
              update.hook = mapping.hook;
              update.theme = mapping.theme;
              update.tag_source = "csv_match";
            }
          }
        }
      } else {
        update.tag_source = "manual";
      }

      const { data, error } = await supabase.from("creatives").update(update).eq("ad_id", path).select().single();
      if (error) throw error;

      // Update account untagged count
      if (data) {
        const { count } = await supabase.from("creatives").select("*", { count: "exact", head: true }).eq("account_id", data.account_id).eq("tag_source", "untagged");
        await supabase.from("ad_accounts").update({ untagged_count: count || 0 }).eq("id", data.account_id);
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /creatives/bulk-untag — mark selected as untagged
    if (req.method === "POST" && path === "bulk-untag") {
      const { ad_ids } = await req.json();
      if (!Array.isArray(ad_ids)) {
        return new Response(JSON.stringify({ error: "ad_ids array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase.from("creatives").update({
        tag_source: "untagged", ad_type: null, person: null, style: null, product: null, hook: null, theme: null,
      }).in("ad_id", ad_ids);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, count: ad_ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Creatives error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
