import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Display name mappings for naming convention values
const DISPLAY_NAMES: Record<string, string> = {
  UGCNative: "UGC Native",
  StudioClean: "Studio Clean",
  TextForward: "Text Forward",
  NoTalent: "No Talent",
  ProblemCallout: "Problem Callout",
  StatementBold: "Statement Bold",
  AuthorityIntro: "Authority Intro",
  BeforeAndAfter: "Before & After",
  PatternInterrupt: "Pattern Interrupt",
};

const VALID_TYPES = ["Video", "Static", "GIF", "Carousel"];
const VALID_PERSONS = ["Creator", "Customer", "Founder", "Actor", "NoTalent"];
const VALID_STYLES = ["UGCNative", "StudioClean", "TextForward", "Lifestyle"];
const VALID_HOOKS = ["ProblemCallout", "Confession", "Question", "StatementBold", "AuthorityIntro", "BeforeAndAfter", "PatternInterrupt"];

function toDisplayName(val: string): string {
  return DISPLAY_NAMES[val] || val;
}

function parseAdName(adName: string): {
  unique_code: string;
  ad_type: string | null;
  person: string | null;
  style: string | null;
  product: string | null;
  hook: string | null;
  theme: string | null;
  parsed: boolean;
} {
  const segments = adName.split("_");
  const unique_code = segments[0] || adName;

  if (segments.length === 7) {
    const [, type, person, style, product, hook, theme] = segments;
    if (
      VALID_TYPES.includes(type) &&
      VALID_PERSONS.includes(person) &&
      VALID_STYLES.includes(style) &&
      VALID_HOOKS.includes(hook)
    ) {
      return {
        unique_code,
        ad_type: toDisplayName(type),
        person: toDisplayName(person),
        style: toDisplayName(style),
        product,
        hook: toDisplayName(hook),
        theme,
        parsed: true,
      };
    }
  }

  return { unique_code, ad_type: null, person: null, style: null, product: null, hook: null, theme: null, parsed: false };
}

async function resolveTagsForCreative(
  supabase: any,
  creative: { ad_id: string; ad_name: string; tag_source: string; unique_code: string | null },
  accountId: string
) {
  // Tier 0: Manual override — skip
  if (creative.tag_source === "manual") {
    return { tags: null, source: "manual" };
  }

  // Tier 1: Parse naming convention
  const parsed = parseAdName(creative.ad_name);
  if (parsed.parsed) {
    return {
      tags: {
        unique_code: parsed.unique_code,
        ad_type: parsed.ad_type,
        person: parsed.person,
        style: parsed.style,
        product: parsed.product,
        hook: parsed.hook,
        theme: parsed.theme,
      },
      source: "parsed",
    };
  }

  // Tier 2: CSV lookup
  const { data: mapping } = await supabase
    .from("name_mappings")
    .select("*")
    .eq("account_id", accountId)
    .eq("unique_code", parsed.unique_code)
    .single();

  if (mapping) {
    return {
      tags: {
        unique_code: parsed.unique_code,
        ad_type: mapping.ad_type,
        person: mapping.person,
        style: mapping.style,
        product: mapping.product,
        hook: mapping.hook,
        theme: mapping.theme,
      },
      source: "csv_match",
    };
  }

  // Tier 3: Untagged
  return {
    tags: { unique_code: parsed.unique_code },
    source: "untagged",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/sync\/?/, "").replace(/\/$/, "");

  try {
    // GET /sync/history — sync log history
    if (req.method === "GET" && path.startsWith("history")) {
      const historyId = path.replace("history/", "").replace("history", "");

      if (historyId && historyId !== "") {
        const { data, error } = await supabase
          .from("sync_logs")
          .select("*")
          .eq("id", historyId)
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accountId = url.searchParams.get("account_id");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      let query = supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(limit);
      if (accountId) query = query.eq("account_id", accountId);

      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /sync — run sync
    if (req.method === "POST" && !path) {
      const body = await req.json();
      const { account_id, sync_type = "manual" } = body;

      // Get Meta token — prefer secret, fallback to DB
      let token = Deno.env.get("META_ACCESS_TOKEN");
      if (!token) {
        const { data: tokenRow } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "meta_access_token")
          .single();
        token = tokenRow?.value || null;
      }
      if (!token) {
        return new Response(JSON.stringify({ error: "No Meta access token configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get settings
      const { data: settingsRows } = await supabase.from("settings").select("*");
      const settings: Record<string, string> = {};
      for (const row of settingsRows || []) settings[row.key] = row.value;

      const dateRangeDays = sync_type === "initial" ? 90 : parseInt(settings.date_range_days || "30");
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRangeDays);

      // Get accounts to sync
      let accounts: any[] = [];
      if (account_id && account_id !== "all") {
        const { data } = await supabase.from("ad_accounts").select("*").eq("id", account_id).single();
        if (data) accounts = [data];
      } else {
        const { data } = await supabase.from("ad_accounts").select("*").eq("is_active", true);
        accounts = data || [];
      }

      if (accounts.length === 0) {
        return new Response(JSON.stringify({ error: "No accounts to sync" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allResults = [];

      for (const account of accounts) {
        const startedAt = new Date();

        // Create sync log entry
        const { data: logEntry, error: logError } = await supabase
          .from("sync_logs")
          .insert({
            account_id: account.id,
            sync_type,
            status: "running",
            date_range_start: startDate.toISOString().split("T")[0],
            date_range_end: endDate.toISOString().split("T")[0],
          })
          .select()
          .single();

        if (logError) {
          console.error("Failed to create sync log:", logError);
          continue;
        }

        const syncLogId = logEntry.id;
        let creativesFetched = 0;
        let creativesUpserted = 0;
        let tagsParsed = 0;
        let tagsCsvMatched = 0;
        let tagsManualPreserved = 0;
        let tagsUntagged = 0;
        let metaApiCalls = 0;
        const apiErrors: { timestamp: string; message: string }[] = [];

        try {
          // Phase 1: Fetch ads from Meta
          const timeRange = JSON.stringify({
            since: startDate.toISOString().split("T")[0],
            until: endDate.toISOString().split("T")[0],
          });

          let nextUrl: string | null =
            `https://graph.facebook.com/v21.0/${account.id}/ads?` +
            `fields=id,name,status,campaign{name},adset{name},creative{thumbnail_url,effective_object_story_id},` +
            `insights.time_range(${timeRange}){spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,video_avg_time_watched_actions,cpm,actions,action_values}` +
            `&limit=100&access_token=${encodeURIComponent(token)}`;

          const fetchedAds: any[] = [];

          console.log(`Fetching ads for account ${account.id} (${account.name})`);
          console.log(`Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);

          while (nextUrl) {
            metaApiCalls++;
            console.log(`Meta API call #${metaApiCalls}...`);
            const resp = await fetch(nextUrl);
            const data = await resp.json();

            if (data.error) {
              console.error(`Meta API error:`, data.error);
              apiErrors.push({ timestamp: new Date().toISOString(), message: data.error.message });
              break;
            }

            if (data.data) {
              fetchedAds.push(...data.data);
              console.log(`Fetched ${data.data.length} ads (total: ${fetchedAds.length})`);
            }

            nextUrl = data.paging?.next || null;

            // Basic rate limiting
            if (nextUrl) await new Promise((r) => setTimeout(r, 200));
          }

          creativesFetched = fetchedAds.length;

          // Phase 1b: Upsert creatives
          for (const ad of fetchedAds) {
            const insights = ad.insights?.data?.[0] || {};

            // Extract metrics
            const spend = parseFloat(insights.spend || "0");
            const roas = insights.purchase_roas?.[0]?.value ? parseFloat(insights.purchase_roas[0].value) : 0;
            const ctr = parseFloat(insights.ctr || "0");
            const clicks = parseInt(insights.clicks || "0");
            const impressions = parseInt(insights.impressions || "0");
            const cpm = parseFloat(insights.cpm || "0");

            // Extract purchases and CPA from actions
            let purchases = 0;
            let purchaseValue = 0;
            let cpa = 0;

            if (insights.actions) {
              const purchaseAction = insights.actions.find((a: any) => a.action_type === "purchase");
              if (purchaseAction) purchases = parseInt(purchaseAction.value || "0");
            }
            if (insights.action_values) {
              const purchaseVal = insights.action_values.find((a: any) => a.action_type === "purchase");
              if (purchaseVal) purchaseValue = parseFloat(purchaseVal.value || "0");
            }
            if (insights.cost_per_action_type) {
              const cpaPurchase = insights.cost_per_action_type.find((a: any) => a.action_type === "purchase");
              if (cpaPurchase) cpa = parseFloat(cpaPurchase.value || "0");
            }

            // Video metrics
            const videoViews = 0; // Would need video_view action type
            const thumbStopRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const holdRate = 0;

            const creativeData = {
              ad_id: ad.id,
              account_id: account.id,
              ad_name: ad.name,
              ad_status: ad.status || "UNKNOWN",
              campaign_name: ad.campaign?.name || null,
              adset_name: ad.adset?.name || null,
              thumbnail_url: ad.creative?.thumbnail_url || null,
              spend,
              roas,
              cpa,
              ctr,
              clicks,
              impressions,
              video_views: videoViews,
              thumb_stop_rate: thumbStopRate,
              hold_rate: holdRate,
              cpm,
              purchases,
              purchase_value: purchaseValue,
            };

            // Check if creative already exists with manual tags
            const { data: existing } = await supabase
              .from("creatives")
              .select("tag_source")
              .eq("ad_id", ad.id)
              .single();

            if (existing?.tag_source === "manual") {
              // Preserve manual tags, update metrics only
              const { error } = await supabase
                .from("creatives")
                .update(creativeData)
                .eq("ad_id", ad.id);
              if (!error) {
                creativesUpserted++;
                tagsManualPreserved++;
              }
            } else {
              // Upsert with tag resolution
              const { error } = await supabase
                .from("creatives")
                .upsert({ ...creativeData, unique_code: ad.name.split("_")[0] }, { onConflict: "ad_id" });
              if (!error) creativesUpserted++;
            }
          }

          // Phase 2: Tag resolution for non-manual creatives
          const { data: unresolved } = await supabase
            .from("creatives")
            .select("ad_id, ad_name, tag_source, unique_code")
            .eq("account_id", account.id)
            .neq("tag_source", "manual");

          for (const creative of unresolved || []) {
            const result = await resolveTagsForCreative(supabase, creative, account.id);

            if (result.source !== "manual" && result.tags) {
              await supabase
                .from("creatives")
                .update({ ...result.tags, tag_source: result.source })
                .eq("ad_id", creative.ad_id);

              if (result.source === "parsed") tagsParsed++;
              else if (result.source === "csv_match") tagsCsvMatched++;
              else if (result.source === "untagged") tagsUntagged++;
            }
          }

          // Update account counts
          const { count: totalCount } = await supabase
            .from("creatives")
            .select("*", { count: "exact", head: true })
            .eq("account_id", account.id);

          const { count: untaggedCount } = await supabase
            .from("creatives")
            .select("*", { count: "exact", head: true })
            .eq("account_id", account.id)
            .eq("tag_source", "untagged");

          await supabase
            .from("ad_accounts")
            .update({
              creative_count: totalCount || 0,
              untagged_count: untaggedCount || 0,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          const durationMs = Date.now() - startedAt.getTime();

          // Update sync log
          await supabase
            .from("sync_logs")
            .update({
              status: apiErrors.length > 0 ? "completed_with_errors" : "completed",
              creatives_fetched: creativesFetched,
              creatives_upserted: creativesUpserted,
              tags_parsed: tagsParsed,
              tags_csv_matched: tagsCsvMatched,
              tags_manual_preserved: tagsManualPreserved,
              tags_untagged: tagsUntagged,
              api_errors: JSON.stringify(apiErrors),
              meta_api_calls: metaApiCalls,
              duration_ms: durationMs,
              completed_at: new Date().toISOString(),
            })
            .eq("id", syncLogId);

          allResults.push({
            account_id: account.id,
            account_name: account.name,
            creatives_fetched: creativesFetched,
            creatives_upserted: creativesUpserted,
            tags: { parsed: tagsParsed, csv_match: tagsCsvMatched, manual: tagsManualPreserved, untagged: tagsUntagged },
            errors: apiErrors,
            duration_ms: durationMs,
          });
        } catch (syncError) {
          const errMsg = syncError instanceof Error ? syncError.message : "Unknown sync error";
          apiErrors.push({ timestamp: new Date().toISOString(), message: errMsg });

          await supabase
            .from("sync_logs")
            .update({
              status: "failed",
              api_errors: JSON.stringify(apiErrors),
              meta_api_calls: metaApiCalls,
              duration_ms: Date.now() - startedAt.getTime(),
              completed_at: new Date().toISOString(),
            })
            .eq("id", syncLogId);

          allResults.push({
            account_id: account.id,
            account_name: account.name,
            error: errMsg,
          });
        }
      }

      return new Response(JSON.stringify({ results: allResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
