import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// ─── Tag Parsing ─────────────────────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  UGCNative: "UGC Native", StudioClean: "Studio Clean", TextForward: "Text Forward",
  NoTalent: "No Talent", ProblemCallout: "Problem Callout", StatementBold: "Statement Bold",
  AuthorityIntro: "Authority Intro", BeforeAndAfter: "Before & After", PatternInterrupt: "Pattern Interrupt",
};
const VALID_TYPES = ["Video", "Static", "GIF", "Carousel"];
const VALID_PERSONS = ["Creator", "Customer", "Founder", "Actor", "NoTalent"];
const VALID_STYLES = ["UGCNative", "StudioClean", "TextForward", "Lifestyle"];
const VALID_HOOKS = ["ProblemCallout", "Confession", "Question", "StatementBold", "AuthorityIntro", "BeforeAndAfter", "PatternInterrupt"];

function toDisplayName(val: string): string { return DISPLAY_NAMES[val] || val; }

function parseAdName(adName: string) {
  const segments = adName.split("_");
  const unique_code = segments[0] || adName;
  if (segments.length === 7) {
    const [, type, person, style, product, hook, theme] = segments;
    if (VALID_TYPES.includes(type) && VALID_PERSONS.includes(person) && VALID_STYLES.includes(style) && VALID_HOOKS.includes(hook)) {
      return {
        unique_code, parsed: true,
        ad_type: toDisplayName(type), person: toDisplayName(person),
        style: toDisplayName(style), product, hook: toDisplayName(hook), theme,
      };
    }
  }
  return { unique_code, parsed: false, ad_type: null, person: null, style: null, product: null, hook: null, theme: null };
}

// ─── Thumbnail Caching Helper ────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const THUMBNAIL_BUCKET = "ad-thumbnails";

async function cacheThumbnail(
  supabase: any,
  accountId: string,
  adId: string,
  metaUrl: string
): Promise<string | null> {
  try {
    // Download from Meta CDN
    const resp = await fetch(metaUrl);
    if (!resp.ok) return null;
    const blob = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `${accountId}/${adId}.${ext}`;

    // Upload to storage (upsert)
    const { error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(path, new Uint8Array(blob), {
        contentType,
        upsert: true,
      });
    if (error) {
      console.log(`Thumbnail upload error for ${adId}:`, error.message);
      return null;
    }

    // Return public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${THUMBNAIL_BUCKET}/${path}`;
  } catch (err) {
    console.log(`Thumbnail cache error for ${adId}:`, err);
    return null;
  }
}

// ─── Meta API Helper ─────────────────────────────────────────────────────────

const MAX_RATE_LIMIT_RETRIES = 3;

async function metaFetch(
  url: string,
  ctx: { metaApiCalls: number; apiErrors: { timestamp: string; message: string }[]; isTimedOut: () => boolean }
): Promise<{ data: any[] | null; next: string | null; error: boolean; rateLimited: boolean }> {
  if (ctx.isTimedOut()) return { data: null, next: null, error: false, rateLimited: false };

  let rateLimitRetries = 0;
  while (true) {
    ctx.metaApiCalls++;
    try {
      const resp = await fetch(url);
      const json = await resp.json();

      if (json.error) {
        // Rate limit
        if ((json.error.code === 80004 || json.error.code === 80000 || json.error.error_subcode === 2446079) && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
          rateLimitRetries++;
          const waitSec = 30 * rateLimitRetries;
          console.log(`Rate limited, waiting ${waitSec}s (retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})...`);
          ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: `Rate limited, backing off ${waitSec}s` });
          await new Promise(r => setTimeout(r, waitSec * 1000));
          if (ctx.isTimedOut()) return { data: null, next: null, error: false, rateLimited: true };
          continue;
        }
        // "Reduce data" error — try lower limit
        if (json.error.message?.includes("reduce the amount of data")) {
          console.log("Meta asked to reduce data volume");
          ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: "Reduce data request" });
          // Try reducing the limit in the URL
          const reducedUrl = url.replace(/limit=\d+/, (match) => {
            const currentLimit = parseInt(match.split("=")[1]);
            const newLimit = Math.max(10, Math.floor(currentLimit / 2));
            return `limit=${newLimit}`;
          });
          if (reducedUrl !== url) {
            ctx.metaApiCalls++;
            const retryResp = await fetch(reducedUrl);
            const retryJson = await retryResp.json();
            if (!retryJson.error) {
              return { data: retryJson.data || [], next: retryJson.paging?.next || null, error: false, rateLimited: false };
            }
          }
          return { data: null, next: null, error: true, rateLimited: false };
        }

        console.error("Meta API error:", JSON.stringify(json.error));
        ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: json.error.message || "Unknown Meta error" });
        const isRateLimit = json.error.code === 80004 || json.error.code === 80000;
        return { data: null, next: null, error: true, rateLimited: isRateLimit };
      }

      return { data: json.data || [], next: json.paging?.next || null, error: false, rateLimited: false };
    } catch (fetchErr) {
      console.error("Fetch error:", fetchErr);
      ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: `Network error: ${String(fetchErr)}` });
      return { data: null, next: null, error: true, rateLimited: false };
    }
  }
}

// ─── Metrics Parsing Helper ──────────────────────────────────────────────────

function parseInsightsRow(row: any) {
  const spend = parseFloat(row.spend || "0");
  const roas = row.purchase_roas?.[0]?.value ? parseFloat(row.purchase_roas[0].value) : 0;
  const ctr = parseFloat(row.ctr || "0");
  const clicks = parseInt(row.clicks || "0");
  const impressions = parseInt(row.impressions || "0");
  const cpm = parseFloat(row.cpm || "0");
  const cpc = parseFloat(row.cpc || "0");
  const frequency = parseFloat(row.frequency || "0");

  let purchases = 0, purchaseValue = 0, cpa = 0;
  let addsToCart = 0, costPerAtc = 0;
  let videoViews = 0, thruPlays = 0;

  if (row.actions) {
    // Purchase actions — try multiple action type names
    const purchaseTypes = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];
    const pa = row.actions.find((a: any) => purchaseTypes.includes(a.action_type));
    if (pa) purchases = parseInt(pa.value || "0");

    // Add to cart — try multiple action type names
    const atcTypes = ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart", "omni_add_to_cart"];
    const atc = row.actions.find((a: any) => atcTypes.includes(a.action_type));
    if (atc) addsToCart = parseInt(atc.value || "0");

    // Video views (3-second views)
    const vv = row.actions.find((a: any) => a.action_type === "video_view");
    if (vv) videoViews = parseInt(vv.value || "0");
  }

  // ThruPlays from dedicated field (video_thruplay_watched_actions)
  if (row.video_thruplay_watched_actions) {
    const tp = row.video_thruplay_watched_actions.find((a: any) => a.action_type === "video_view");
    if (tp) thruPlays = parseInt(tp.value || "0");
  }
  if (row.action_values) {
    const purchaseTypes = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];
    const pv = row.action_values.find((a: any) => purchaseTypes.includes(a.action_type));
    if (pv) purchaseValue = parseFloat(pv.value || "0");
  }
  if (row.cost_per_action_type) {
    const purchaseTypes = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];
    const cp = row.cost_per_action_type.find((a: any) => purchaseTypes.includes(a.action_type));
    if (cp) cpa = parseFloat(cp.value || "0");

    const atcTypes = ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart", "omni_add_to_cart"];
    const cpatc = row.cost_per_action_type.find((a: any) => atcTypes.includes(a.action_type));
    if (cpatc) costPerAtc = parseFloat(cpatc.value || "0");
  }

  // Hook Rate (Thumb Stop Rate) = 3-second video views / impressions × 100
  const thumbStopRate = impressions > 0 && videoViews > 0 ? (videoViews / impressions) * 100 : 0;

  // Hold Rate = ThruPlays / 3-second video views × 100
  const holdRate = videoViews > 0 && thruPlays > 0 ? (thruPlays / videoViews) * 100 : 0;

  // Avg Play Time from Meta's video_avg_time_watched_actions
  let videoAvgPlayTime = 0;
  if (row.video_avg_time_watched_actions) {
    const vat = row.video_avg_time_watched_actions.find((a: any) => a.action_type === "video_view");
    if (vat) videoAvgPlayTime = parseFloat(vat.value || "0");
  }

  return { spend, roas, cpa, ctr, clicks, impressions, cpm, cpc, frequency, purchases, purchase_value: purchaseValue, thumb_stop_rate: thumbStopRate, hold_rate: holdRate, video_avg_play_time: videoAvgPlayTime, adds_to_cart: addsToCart, cost_per_add_to_cart: costPerAtc, video_views: videoViews };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const authToken = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (!userRole || !["builder", "employee"].includes(userRole.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/sync\/?/, "").replace(/\/$/, "");

  try {
    // ─── GET /sync/history ─────────────────────────────────────────────
    if (req.method === "GET" && path.startsWith("history")) {
      const historyId = path.replace("history/", "").replace("history", "");
      if (historyId && historyId !== "") {
        const { data, error } = await supabase.from("sync_logs").select("*").eq("id", historyId).single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const accountId = url.searchParams.get("account_id");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      let query = supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(limit);
      if (accountId) query = query.eq("account_id", accountId);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── POST /sync/cancel ─────────────────────────────────────────────
    if (req.method === "POST" && path === "cancel") {
      const { data: runningSyncs } = await supabase.from("sync_logs").select("id").eq("status", "running");
      if (!runningSyncs?.length) {
        return new Response(JSON.stringify({ message: "No running sync to cancel" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("sync_logs").update({
        status: "cancelled",
        api_errors: JSON.stringify([{ timestamp: new Date().toISOString(), message: "Cancelled by user" }]),
        completed_at: new Date().toISOString(),
      }).in("id", runningSyncs.map((s: any) => s.id));
      return new Response(JSON.stringify({ cancelled: runningSyncs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── POST /sync ────────────────────────────────────────────────────
    if (req.method === "POST" && !path) {
      const body = await req.json();
      const { account_id, sync_type = "manual" } = body;

      // Timeout recovery
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: stuckSyncs } = await supabase.from("sync_logs").select("id").eq("status", "running").lt("started_at", tenMinAgo);
      if (stuckSyncs?.length) {
        await supabase.from("sync_logs").update({
          status: "failed",
          api_errors: JSON.stringify([{ timestamp: new Date().toISOString(), message: "Sync timed out" }]),
          completed_at: new Date().toISOString(),
        }).in("id", stuckSyncs.map((s: any) => s.id));
      }

      // Prevent concurrent syncs
      const { data: runningSyncs } = await supabase.from("sync_logs").select("id, account_id, started_at").eq("status", "running").limit(1);
      if (runningSyncs?.length) {
        return new Response(JSON.stringify({ error: "Sync already running" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get Meta token
      let metaToken = Deno.env.get("META_ACCESS_TOKEN");
      if (!metaToken) {
        const { data: tokenRow } = await supabase.from("settings").select("value").eq("key", "meta_access_token").single();
        metaToken = tokenRow?.value || null;
      }
      if (!metaToken) return new Response(JSON.stringify({ error: "No Meta access token configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Get accounts
      let accounts: any[] = [];
      if (account_id && account_id !== "all") {
        const { data } = await supabase.from("ad_accounts").select("*").eq("id", account_id).single();
        if (data) accounts = [data];
      } else {
        const { data } = await supabase.from("ad_accounts").select("*").eq("is_active", true);
        accounts = data || [];
      }
      if (!accounts.length) return new Response(JSON.stringify({ error: "No accounts to sync" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const HARD_DEADLINE_MS = 8 * 60 * 1000;
      const syncStartGlobal = Date.now();
      let cancelledFlag = false;
      const isCancelled = async () => {
        if (cancelledFlag) return true;
        // Check every call if status changed to cancelled
        const { data: logCheck } = await supabase.from("sync_logs").select("status").eq("status", "cancelled").limit(1);
        if (logCheck?.length) { cancelledFlag = true; return true; }
        return false;
      };
      const isTimedOut = () => (Date.now() - syncStartGlobal) > HARD_DEADLINE_MS;
      const allResults = [];

      for (const account of accounts) {
        if (isTimedOut() || cancelledFlag) break;
        if (await isCancelled()) break;

        const startedAt = Date.now();
        const dateRangeDays = sync_type === "initial" ? 90 : (account.date_range_days || 14);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRangeDays);
        const sinceStr = startDate.toISOString().split("T")[0];
        const untilStr = endDate.toISOString().split("T")[0];
        const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });

        const { data: logEntry, error: logError } = await supabase.from("sync_logs").insert({
          account_id: account.id, sync_type, status: "running",
          date_range_start: sinceStr, date_range_end: untilStr,
        }).select().single();
        if (logError) { console.error("Log create error:", logError); continue; }
        const syncLogId = logEntry.id;

        let creativesFetched = 0, creativesUpserted = 0;
        let tagsParsed = 0, tagsCsvMatched = 0, tagsManualPreserved = 0, tagsUntagged = 0;
        const ctx = { metaApiCalls: 0, apiErrors: [] as { timestamp: string; message: string }[], isTimedOut };

        const saveProgress = async (status: string) => {
          await supabase.from("sync_logs").update({
            status, creatives_fetched: creativesFetched, creatives_upserted: creativesUpserted,
            tags_parsed: tagsParsed, tags_csv_matched: tagsCsvMatched,
            tags_manual_preserved: tagsManualPreserved, tags_untagged: tagsUntagged,
            api_errors: JSON.stringify(ctx.apiErrors), meta_api_calls: ctx.metaApiCalls,
            duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString(),
          }).eq("id", syncLogId);
        };

        try {
          console.log(`\n━━━ Syncing ${account.name} (${account.id}) ━━━`);
          console.log(`Date range: ${sinceStr} → ${untilStr}`);

          // ─── Check if we already have ads in DB ─────────────────────
          const { count: existingCount } = await supabase.from("creatives")
            .select("*", { count: "exact", head: true })
            .eq("account_id", account.id);
          const hasExistingAds = (existingCount || 0) > 0;

          // ─── PHASE 1: Fetch ads metadata (skip if we already have them) ──
          let fetchedAds: any[] = [];
          let skipAdFetch = false;

          if (hasExistingAds && sync_type !== "initial") {
            console.log(`Phase 1: Skipping ad fetch — ${existingCount} ads already in DB`);
            skipAdFetch = true;
            creativesFetched = existingCount || 0;
          } else {
            console.log("Phase 1: Fetching ads metadata...");
             const adsUrl = `https://graph.facebook.com/v21.0/${account.id}/ads?` +
              `fields=id,name,status,campaign{name},adset{name},creative{thumbnail_url,object_story_spec},preview_shareable_link` +
              `&limit=50&access_token=${encodeURIComponent(metaToken)}`;

            let nextAdsUrl: string | null = adsUrl;
            let adFetchFailed = false;

            while (nextAdsUrl && !isTimedOut()) {
              const result = await metaFetch(nextAdsUrl, ctx);
              if (result.error || result.rateLimited) {
                if (result.rateLimited && hasExistingAds) {
                  console.log("Rate limited on ad fetch but ads exist in DB — skipping to insights");
                  skipAdFetch = true;
                  creativesFetched = existingCount || 0;
                }
                adFetchFailed = !skipAdFetch;
                break;
              }
              if (result.data) {
                fetchedAds.push(...result.data);
                console.log(`  Ads fetched: ${fetchedAds.length}`);
              }
              nextAdsUrl = result.next;
              if (nextAdsUrl) await new Promise(r => setTimeout(r, 500));
            }

            if (!skipAdFetch) {
              creativesFetched = fetchedAds.length;
              console.log(`Phase 1 complete: ${creativesFetched} ads`);
            }
          }

          // ─── PHASE 2: Fetch aggregated insights (account-level) ──────
          const insightsMap = new Map<string, any>();

          if (!isTimedOut()) {
            console.log("Phase 2: Fetching aggregated insights...");

            const insightsFields = "ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values,video_avg_time_watched_actions,video_thruplay_watched_actions";
            const insightsUrl = `https://graph.facebook.com/v21.0/${account.id}/insights?` +
              `time_range=${encodeURIComponent(timeRange)}` +
              `&level=ad` +
              `&fields=${insightsFields}` +
              `&limit=500&access_token=${encodeURIComponent(metaToken)}`;

            let nextInsightsUrl: string | null = insightsUrl;
            while (nextInsightsUrl && !isTimedOut()) {
              const result = await metaFetch(nextInsightsUrl, ctx);
              if (result.error) break;
              if (result.data) {
                for (const row of result.data) insightsMap.set(row.ad_id, row);
                console.log(`  Insights collected: ${insightsMap.size}`);
              }
              nextInsightsUrl = result.next;
              if (nextInsightsUrl) await new Promise(r => setTimeout(r, 300));
            }

            console.log(`Phase 2 complete: ${insightsMap.size} ad insights`);
          }

          // ─── PHASE 2.5: Extract video URLs from object_story_spec ────
          const videoUrlMap = new Map<string, string>();

          if (!isTimedOut()) {
            // Extract video URLs from object_story_spec embedded in Phase 1 data
            if (!skipAdFetch && fetchedAds.length > 0) {
              let videoCount = 0;
              for (const ad of fetchedAds) {
                const spec = ad.creative?.object_story_spec;
                if (!spec) continue;

                // object_story_spec can contain video_data with video_url or call_to_action.value.link
                const videoData = spec.video_data;
                if (videoData) {
                  // video_data.video_url is the direct playback URL (works with ads_read)
                  if (videoData.video_url) {
                    videoUrlMap.set(ad.id, videoData.video_url);
                    videoCount++;
                  } else if (videoData.call_to_action?.value?.link) {
                    // Some video ads store the video link here
                    const link = videoData.call_to_action.value.link;
                    if (link.includes(".mp4") || link.includes("video")) {
                      videoUrlMap.set(ad.id, link);
                      videoCount++;
                    }
                  }
                }
              }
              console.log(`Phase 2.5: Extracted ${videoCount} video URLs from object_story_spec`);
            } else if (skipAdFetch) {
              // For skipped ad fetch, query ads missing video_url and try to get object_story_spec
              const { data: existingAds } = await supabase.from("creatives")
                .select("ad_id")
                .eq("account_id", account.id)
                .is("video_url", null);

              if (existingAds && existingAds.length > 0) {
                console.log(`Phase 2.5: Fetching object_story_spec for ${existingAds.length} ads missing video URLs...`);
                let videoCount = 0;

                for (let i = 0; i < existingAds.length && !isTimedOut(); i += 50) {
                  const batch = existingAds.slice(i, i + 50);
                  const adIds = batch.map(a => a.ad_id).join(",");
                  const specUrl = `https://graph.facebook.com/v21.0/?ids=${adIds}&fields=creative{object_story_spec}&access_token=${encodeURIComponent(metaToken)}`;
                  ctx.metaApiCalls++;
                  try {
                    const resp = await fetch(specUrl);
                    const json = await resp.json();
                    if (json.error) {
                      console.log("object_story_spec fetch error:", json.error.message);
                      ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: `object_story_spec error: ${json.error.message}` });
                      break;
                    }
                    for (const [adId, adData] of Object.entries(json as Record<string, any>)) {
                      const spec = (adData as any)?.creative?.object_story_spec;
                      if (spec?.video_data?.video_url) {
                        videoUrlMap.set(adId, spec.video_data.video_url);
                        videoCount++;
                      }
                    }
                  } catch (err) {
                    console.log("object_story_spec network error:", err);
                    break;
                  }
                  if (i + 50 < existingAds.length) await new Promise(r => setTimeout(r, 300));
                }
                console.log(`Phase 2.5 complete: ${videoCount} video URLs fetched via object_story_spec`);
              }
            }
          }

          // ─── PHASE 3: Upsert creatives ───────────────────────────────
          // Get manual-tagged ad IDs to preserve
          const { data: manualAds } = await supabase.from("creatives").select("ad_id")
            .eq("account_id", account.id).eq("tag_source", "manual");
          const manualAdIds = new Set((manualAds || []).map((a: any) => a.ad_id));

          if (!skipAdFetch && fetchedAds.length > 0) {
            console.log("Phase 3: Upserting creatives with metrics...");

            const upsertBatch: any[] = [];
            const manualUpdateBatch: any[] = [];

            for (const ad of fetchedAds) {
              const insights = insightsMap.get(ad.id);
              const metrics = insights ? parseInsightsRow(insights) : {
                spend: 0, roas: 0, cpa: 0, ctr: 0, clicks: 0, impressions: 0,
                cpm: 0, cpc: 0, frequency: 0, purchases: 0, purchase_value: 0, 
                thumb_stop_rate: 0, hold_rate: 0, video_avg_play_time: 0, adds_to_cart: 0, cost_per_add_to_cart: 0, video_views: 0,
              };

              // Skip ads with zero spend — only store creatives that had delivery
              if (metrics.spend <= 0) continue;

              const creativeData = {
                ad_id: ad.id, account_id: account.id, ad_name: ad.name,
                ad_status: ad.status || "UNKNOWN",
                campaign_name: ad.campaign?.name || null,
                adset_name: ad.adset?.name || null,
                thumbnail_url: (ad.creative?.thumbnail_url || "").replace(/p\d+x\d+/, "p1080x1080") || null,
                preview_url: ad.preview_shareable_link || null,
                video_url: videoUrlMap.get(ad.id) || null,
                ...metrics,
              };

              if (manualAdIds.has(ad.id)) {
                manualUpdateBatch.push(creativeData);
                tagsManualPreserved++;
              } else {
                upsertBatch.push({ ...creativeData, unique_code: ad.name.split("_")[0] });
              }
            }

            for (let i = 0; i < upsertBatch.length; i += 100) {
              const chunk = upsertBatch.slice(i, i + 100);
              const { error } = await supabase.from("creatives").upsert(chunk, { onConflict: "ad_id" });
              if (!error) creativesUpserted += chunk.length;
              else console.error("Upsert error:", error.message);
            }
            for (const item of manualUpdateBatch) {
              const { ad_id, ...metrics } = item;
              await supabase.from("creatives").update(metrics).eq("ad_id", ad_id);
              creativesUpserted++;
            }
            console.log(`Phase 3 complete: ${creativesUpserted} upserted`);
          } else if (skipAdFetch && insightsMap.size > 0) {
            // Update existing creatives with new insights data
            console.log("Phase 3: Updating existing creatives with insights...");
            let updated = 0;
            const entries = Array.from(insightsMap.entries());
            for (let i = 0; i < entries.length; i += 50) {
              const batch = entries.slice(i, i + 50);
              await Promise.all(batch.map(([adId, row]) => {
                const metrics = parseInsightsRow(row);
                const videoUrl = videoUrlMap.get(adId);
                const updateData = videoUrl ? { ...metrics, video_url: videoUrl } : metrics;
                return supabase.from("creatives").update(updateData).eq("ad_id", adId);
              }));
              updated += batch.length;
            }
            // Also update video URLs for ads not in insights
            for (const [adId, videoUrl] of videoUrlMap.entries()) {
              if (!insightsMap.has(adId)) {
                await supabase.from("creatives").update({ video_url: videoUrl }).eq("ad_id", adId);
              }
            }
            creativesUpserted = updated;
            console.log(`Phase 3 complete: ${updated} creatives updated with insights`);
          }

          await saveProgress("running");

          // ─── PHASE 3.5: Cache thumbnails to storage ──────────────────
          if (!isTimedOut()) {
            console.log("Phase 3.5: Caching thumbnails to storage...");
            const { data: creativesWithMetaThumb } = await supabase.from("creatives")
              .select("ad_id, thumbnail_url")
              .eq("account_id", account.id)
              .not("thumbnail_url", "is", null);

            let cached = 0, skipped = 0;
            const toCache = (creativesWithMetaThumb || []).filter((c: any) =>
              c.thumbnail_url && !c.thumbnail_url.includes("/storage/v1/object/public/")
            );

            console.log(`  ${toCache.length} thumbnails need caching`);

            // Process in batches of 10 to avoid overwhelming
            for (let i = 0; i < toCache.length && !isTimedOut(); i += 10) {
              const batch = toCache.slice(i, i + 10);
              const results = await Promise.allSettled(
                batch.map(async (c: any) => {
                  const storageUrl = await cacheThumbnail(supabase, account.id, c.ad_id, c.thumbnail_url);
                  if (storageUrl) {
                    await supabase.from("creatives").update({ thumbnail_url: storageUrl }).eq("ad_id", c.ad_id);
                    return true;
                  }
                  return false;
                })
              );
              cached += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
              skipped += results.filter((r: any) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
              
              // Brief pause between batches
              if (i + 10 < toCache.length) await new Promise(r => setTimeout(r, 200));
            }
            console.log(`Phase 3.5 complete: ${cached} cached, ${skipped} skipped`);
          }

          // ─── PHASE 4: Daily breakdowns ───────────────────────────────
          const dailyRows: any[] = [];

          if (!isTimedOut()) {
            console.log("Phase 4: Fetching daily breakdowns...");

            // Use 30-day chunks for daily breakdowns to reduce API round-trips
            const DAILY_CHUNK_DAYS = 30;
            const chunkStart = new Date(startDate);
            while (chunkStart < endDate && !isTimedOut()) {
              const chunkEnd = new Date(chunkStart);
              chunkEnd.setDate(chunkEnd.getDate() + DAILY_CHUNK_DAYS - 1);
              if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

              const chunkSince = chunkStart.toISOString().split("T")[0];
              const chunkUntil = chunkEnd.toISOString().split("T")[0];
              const chunkRange = JSON.stringify({ since: chunkSince, until: chunkUntil });

              console.log(`  Daily chunk: ${chunkSince} → ${chunkUntil}`);

              const dailyUrl = `https://graph.facebook.com/v21.0/${account.id}/insights?` +
                `time_range=${encodeURIComponent(chunkRange)}&time_increment=1&level=ad` +
                `&fields=ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values,video_avg_time_watched_actions,video_thruplay_watched_actions` +
                `&limit=500&access_token=${encodeURIComponent(metaToken)}`;

              let nextDailyUrl: string | null = dailyUrl;
              let chunkRowCount = 0;
              while (nextDailyUrl && !isTimedOut()) {
                const result = await metaFetch(nextDailyUrl, ctx);
                if (result.error) break;
                if (result.data) {
                  for (const row of result.data) {
                    const metrics = parseInsightsRow(row);
                    dailyRows.push({
                      ad_id: row.ad_id, account_id: account.id, date: row.date_start,
                      ...metrics,
                    });
                  }
                  chunkRowCount += result.data.length;
                }
                nextDailyUrl = result.next;
                if (nextDailyUrl) await new Promise(r => setTimeout(r, 200));
              }

              console.log(`  Chunk rows: ${chunkRowCount}, total: ${dailyRows.length}`);

              // Upsert this chunk immediately to avoid losing data on timeout
              if (dailyRows.length > 0) {
                const pendingRows = dailyRows.splice(0, dailyRows.length);
                for (let i = 0; i < pendingRows.length; i += 200) {
                  const batch = pendingRows.slice(i, i + 200);
                  const { error } = await supabase.from("creative_daily_metrics").upsert(batch, { onConflict: "ad_id,date" });
                  if (error) console.error("Daily upsert error:", error.message);
                }
              }

              chunkStart.setDate(chunkStart.getDate() + DAILY_CHUNK_DAYS);
              if (chunkStart < endDate) await new Promise(r => setTimeout(r, 300));
            }

            // Daily rows already upserted per-chunk above
            console.log(`Phase 4 complete: daily data ingested`);
          } else {
            ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: "Skipped daily breakdowns due to timeout" });
          }

          // ─── PHASE 5: Tag resolution ─────────────────────────────────
          console.log("Phase 5: Resolving tags...");

          const { data: allMappings } = await supabase.from("name_mappings").select("*").eq("account_id", account.id);
          const mappingsByCode = new Map((allMappings || []).map((m: any) => [m.unique_code, m]));

          const { data: unresolved } = await supabase.from("creatives").select("ad_id, ad_name, tag_source, unique_code")
            .eq("account_id", account.id).neq("tag_source", "manual");

          const tagUpdates: { ad_id: string; tags: any; source: string }[] = [];
          for (const c of unresolved || []) {
            const parsed = parseAdName(c.ad_name);
            if (parsed.parsed) {
              tagUpdates.push({ ad_id: c.ad_id, tags: { unique_code: parsed.unique_code, ad_type: parsed.ad_type, person: parsed.person, style: parsed.style, product: parsed.product, hook: parsed.hook, theme: parsed.theme }, source: "parsed" });
              tagsParsed++;
            } else {
              const mapping = mappingsByCode.get(parsed.unique_code);
              if (mapping) {
                tagUpdates.push({ ad_id: c.ad_id, tags: { unique_code: parsed.unique_code, ad_type: mapping.ad_type, person: mapping.person, style: mapping.style, product: mapping.product, hook: mapping.hook, theme: mapping.theme }, source: "csv_match" });
                tagsCsvMatched++;
              } else {
                tagUpdates.push({ ad_id: c.ad_id, tags: { unique_code: parsed.unique_code }, source: "untagged" });
                tagsUntagged++;
              }
            }
          }

          for (let i = 0; i < tagUpdates.length; i += 50) {
            const batch = tagUpdates.slice(i, i + 50);
            await Promise.all(batch.map(({ ad_id, tags, source }) =>
              supabase.from("creatives").update({ ...tags, tag_source: source }).eq("ad_id", ad_id)
            ));
          }
          console.log(`Phase 5 complete: ${tagsParsed} parsed, ${tagsCsvMatched} csv, ${tagsUntagged} untagged`);

          // ─── Finalize ────────────────────────────────────────────────
          const { count: totalCount } = await supabase.from("creatives").select("*", { count: "exact", head: true }).eq("account_id", account.id);
          const { count: untaggedCount } = await supabase.from("creatives").select("*", { count: "exact", head: true }).eq("account_id", account.id).eq("tag_source", "untagged");

          await supabase.from("ad_accounts").update({
            creative_count: totalCount || 0, untagged_count: untaggedCount || 0,
            last_synced_at: new Date().toISOString(),
          }).eq("id", account.id);

          const finalStatus = ctx.apiErrors.length > 0 ? "completed_with_errors" : "completed";
          await saveProgress(finalStatus);

          console.log(`\n✅ Sync complete for ${account.name}: ${finalStatus}`);
          console.log(`   ${creativesFetched} fetched, ${creativesUpserted} upserted, insights: ${insightsMap.size}, daily: ${dailyRows.length}`);

          allResults.push({
            account_id: account.id, account_name: account.name,
            creatives_fetched: creativesFetched, creatives_upserted: creativesUpserted,
            insights_matched: insightsMap.size, daily_rows: dailyRows.length,
            tags: { parsed: tagsParsed, csv_match: tagsCsvMatched, manual: tagsManualPreserved, untagged: tagsUntagged },
            errors: ctx.apiErrors, duration_ms: Date.now() - startedAt,
          });
        } catch (syncError) {
          const errMsg = syncError instanceof Error ? syncError.message : "Unknown sync error";
          ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: errMsg });
          await saveProgress("failed");
          allResults.push({ account_id: account.id, account_name: account.name, error: errMsg });
        }
      }

      return new Response(JSON.stringify({ results: allResults }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Sync error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
