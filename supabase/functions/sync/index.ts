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

// ─── Meta API Helper ─────────────────────────────────────────────────────────

const META_API_VERSION = "v22.0";
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
        if ((json.error.code === 80004 || json.error.code === 80000 || json.error.error_subcode === 2446079) && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
          rateLimitRetries++;
          const waitSec = 30 * rateLimitRetries;
          console.log(`Rate limited, waiting ${waitSec}s (retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})...`);
          ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: `Rate limited, backing off ${waitSec}s` });
          await new Promise(r => setTimeout(r, waitSec * 1000));
          if (ctx.isTimedOut()) return { data: null, next: null, error: false, rateLimited: true };
          continue;
        }
        if (json.error.message?.includes("reduce the amount of data")) {
          console.log("Meta asked to reduce data volume");
          ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: "Reduce data request" });
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
    const purchaseTypes = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];
    const pa = row.actions.find((a: any) => purchaseTypes.includes(a.action_type));
    if (pa) purchases = parseInt(pa.value || "0");
    const atcTypes = ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart", "omni_add_to_cart"];
    const atc = row.actions.find((a: any) => atcTypes.includes(a.action_type));
    if (atc) addsToCart = parseInt(atc.value || "0");
    const vv = row.actions.find((a: any) => a.action_type === "video_view");
    if (vv) videoViews = parseInt(vv.value || "0");
  }
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

  const thumbStopRate = impressions > 0 && videoViews > 0 ? (videoViews / impressions) * 100 : 0;
  const holdRate = videoViews > 0 && thruPlays > 0 ? (thruPlays / videoViews) * 100 : 0;

  let videoAvgPlayTime = 0;
  if (row.video_avg_time_watched_actions) {
    const vat = row.video_avg_time_watched_actions.find((a: any) => a.action_type === "video_view");
    if (vat) videoAvgPlayTime = parseFloat(vat.value || "0");
  }

  return { spend, roas, cpa, ctr, clicks, impressions, cpm, cpc, frequency, purchases, purchase_value: purchaseValue, thumb_stop_rate: thumbStopRate, hold_rate: holdRate, video_avg_play_time: videoAvgPlayTime, adds_to_cart: addsToCart, cost_per_add_to_cart: costPerAtc, video_views: videoViews };
}

// ─── Phase Budget ────────────────────────────────────────────────────────────
const PHASE_BUDGET_MS = 2 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 20 * 1000;

// ─── Promote Next Queued Sync ────────────────────────────────────────────────
async function promoteNextQueued(supabase: any) {
  const { data: next } = await supabase.from("sync_logs")
    .select("id")
    .eq("status", "queued")
    .order("started_at", { ascending: true })
    .limit(1);
  if (next?.length) {
    await supabase.from("sync_logs").update({
      status: "running",
      sync_state: { last_activity: new Date().toISOString() },
    }).eq("id", next[0].id);
    console.log(`Promoted queued sync ${next[0].id} to running`);
  }
}

// ─── Sync Worker: Resumable Phase Execution ──────────────────────────────────
// Phases:
//   1 = Fetch ads metadata (lightweight — no media)
//   2 = Fetch aggregated insights (batch upsert)
//   3 = Cleanup zero-spend + count
//   4 = Daily metric breakdowns (batch upsert, chunked)
//   5 = Tag resolution
//   6 = Finalize

async function runSyncPhase(supabase: any, syncLog: any, metaToken: string) {
  const startMs = Date.now();
  const isTimedOut = () => (Date.now() - startMs) > PHASE_BUDGET_MS;
  const ctx = { metaApiCalls: 0, apiErrors: [] as { timestamp: string; message: string }[], isTimedOut };

  // Lightweight heartbeat
  let lastHeartbeat = Date.now();
  const heartbeat = async () => {
    if (Date.now() - lastHeartbeat < HEARTBEAT_INTERVAL_MS) return;
    lastHeartbeat = Date.now();
    try {
      const { data: current } = await supabase.from("sync_logs").select("sync_state").eq("id", syncLog.id).single();
      const currentState = current?.sync_state || {};
      await supabase.from("sync_logs").update({
        sync_state: { ...currentState, last_activity: new Date().toISOString() },
      }).eq("id", syncLog.id);
    } catch (_) { /* best effort */ }
  };

  const accountId = syncLog.account_id;
  const { data: account } = await supabase.from("ad_accounts").select("*").eq("id", accountId).single();
  if (!account) {
    await supabase.from("sync_logs").update({ status: "failed", api_errors: JSON.stringify([{ timestamp: new Date().toISOString(), message: "Account not found" }]), completed_at: new Date().toISOString() }).eq("id", syncLog.id);
    await promoteNextQueued(supabase);
    return;
  }

  const phase = syncLog.current_phase || 1;
  const state = syncLog.sync_state || {};
  const syncType = syncLog.sync_type || "manual";
  const dateRangeDays = syncType === "initial" ? 90 : (account.date_range_days || 14);

  console.log(`\n━━━ Phase ${phase} for ${account.name} (${accountId}) ━━━`);

  // Check cancellation
  const { data: statusCheck } = await supabase.from("sync_logs").select("status").eq("id", syncLog.id).single();
  if (statusCheck?.status === "cancelled") {
    await promoteNextQueued(supabase);
    return;
  }

  const saveState = async (nextPhase: number, newState: any, status = "running") => {
    const merged = { ...state, ...newState, last_activity: new Date().toISOString() };
    try {
      await supabase.from("sync_logs").update({
        current_phase: nextPhase,
        sync_state: merged,
        status,
        creatives_fetched: merged.creatives_fetched ?? syncLog.creatives_fetched ?? 0,
        creatives_upserted: merged.creatives_upserted ?? syncLog.creatives_upserted ?? 0,
        tags_parsed: merged.tags_parsed ?? syncLog.tags_parsed ?? 0,
        tags_csv_matched: merged.tags_csv_matched ?? syncLog.tags_csv_matched ?? 0,
        tags_manual_preserved: merged.tags_manual_preserved ?? syncLog.tags_manual_preserved ?? 0,
        tags_untagged: merged.tags_untagged ?? syncLog.tags_untagged ?? 0,
        meta_api_calls: (syncLog.meta_api_calls || 0) + ctx.metaApiCalls,
        api_errors: JSON.stringify([...JSON.parse(syncLog.api_errors || "[]"), ...ctx.apiErrors]),
        duration_ms: (syncLog.duration_ms || 0) + (Date.now() - startMs),
        ...(status !== "running" ? { completed_at: new Date().toISOString() } : {}),
      }).eq("id", syncLog.id);
    } catch (saveErr) {
      console.error("saveState failed:", saveErr);
      try {
        await supabase.from("sync_logs").update({
          sync_state: { ...state, last_activity: new Date().toISOString(), save_error: String(saveErr) },
        }).eq("id", syncLog.id);
      } catch (_) { /* truly lost */ }
    }

    if (status !== "running") {
      await promoteNextQueued(supabase);
    }
  };

  try {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: Fetch ads metadata — LIGHTWEIGHT (no media fields)
    //   Always runs to discover new ads. Only fetches essential fields:
    //   id, name, status, campaign name, adset name.
    //   Media (thumbnails, videos) are handled by refresh-thumbnails.
    // ═══════════════════════════════════════════════════════════════════
    if (phase === 1) {
      // Get manual-tagged ad IDs to preserve their tags
      const { data: manualAds } = await supabase.from("creatives").select("ad_id")
        .eq("account_id", accountId).eq("tag_source", "manual");
      const manualAdIds = new Set((manualAds || []).map((a: any) => a.ad_id));

      const cursor = state.ads_cursor || null;
      let fetchedCount = state.creatives_fetched || 0;

      // STRIPPED DOWN: Only essential fields — no creative{}, no preview_shareable_link
      // This reduces per-page payload from ~5MB to ~50KB
      let nextUrl = cursor || (
        `https://graph.facebook.com/${META_API_VERSION}/${accountId}/ads?` +
        `fields=id,name,status,campaign{name},adset{name}` +
        `&limit=200&access_token=${encodeURIComponent(metaToken)}`
      );

      while (nextUrl && !isTimedOut()) {
        await heartbeat();
        const result = await metaFetch(nextUrl, ctx);
        if (result.error) {
          ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: "Ad fetch failed" });
          break;
        }
        if (result.data) {
          const upsertBatch: any[] = [];
          for (const ad of result.data) {
            const adData: any = {
              ad_id: ad.id,
              account_id: accountId,
              ad_name: ad.name,
              ad_status: ad.status || "UNKNOWN",
              campaign_name: ad.campaign?.name || null,
              adset_name: ad.adset?.name || null,
              unique_code: ad.name.split("_")[0],
            };

            if (!manualAdIds.has(ad.id)) {
              upsertBatch.push(adData);
            } else {
              // For manual ads, only update metadata fields
              const { ad_id, unique_code, ...metadataOnly } = adData;
              await supabase.from("creatives").update(metadataOnly).eq("ad_id", ad.id);
            }
          }
          if (upsertBatch.length > 0) {
            const { error } = await supabase.from("creatives").upsert(upsertBatch, {
              onConflict: "ad_id",
              // ignoreDuplicates: false ensures we update existing rows
            });
            if (error) console.error("Phase 1 upsert error:", error.message);
          }
          fetchedCount += result.data.length;
          console.log(`  Ads fetched & upserted: ${fetchedCount}`);
        }
        nextUrl = result.next;
        if (nextUrl) await new Promise(r => setTimeout(r, 150));
      }

      if (nextUrl && isTimedOut()) {
        console.log(`Phase 1 paused at ${fetchedCount} ads — will resume`);
        await saveState(1, { ads_cursor: nextUrl, creatives_fetched: fetchedCount });
      } else {
        console.log(`Phase 1 complete: ${fetchedCount} ads`);
        await saveState(2, { ads_cursor: null, creatives_fetched: fetchedCount });
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: Fetch aggregated insights → BATCH upsert to creatives
    //   Groups metrics by ad_id and upserts in batches of 200
    //   instead of individual row updates.
    // ═══════════════════════════════════════════════════════════════════
    if (phase === 2) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRangeDays);
      const timeRange = JSON.stringify({ since: startDate.toISOString().split("T")[0], until: endDate.toISOString().split("T")[0] });

      const insightsFields = "ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values,video_avg_time_watched_actions,video_thruplay_watched_actions";
      const cursor = state.insights_cursor || null;
      let insightsCount = state.insights_count || 0;

      let nextUrl = cursor || (
        `https://graph.facebook.com/${META_API_VERSION}/${accountId}/insights?` +
        `time_range=${encodeURIComponent(timeRange)}&level=ad` +
        `&fields=${insightsFields}` +
        `&limit=500&access_token=${encodeURIComponent(metaToken)}`
      );

      while (nextUrl && !isTimedOut()) {
        await heartbeat();
        const result = await metaFetch(nextUrl, ctx);
        if (result.error) break;
        if (result.data) {
          // Batch update metrics — Phase 1 already created the rows
          const UPDATE_BATCH_SIZE = 50;
          const metricsRows: { ad_id: string; metrics: any }[] = [];
          for (const row of result.data) {
            metricsRows.push({ ad_id: row.ad_id, metrics: parseInsightsRow(row) });
          }
          for (let i = 0; i < metricsRows.length; i += UPDATE_BATCH_SIZE) {
            const batch = metricsRows.slice(i, i + UPDATE_BATCH_SIZE);
            await Promise.all(batch.map(({ ad_id, metrics }) =>
              supabase.from("creatives").update(metrics).eq("ad_id", ad_id)
            ));
          }
          insightsCount += result.data.length;
          console.log(`  Insights batch-upserted: ${insightsCount}`);
        }
        nextUrl = result.next;
        if (nextUrl) await new Promise(r => setTimeout(r, 200));
      }

      if (nextUrl && isTimedOut()) {
        console.log(`Phase 2 paused at ${insightsCount} insights`);
        await saveState(2, { insights_cursor: nextUrl, insights_count: insightsCount });
      } else {
        console.log(`Phase 2 complete: ${insightsCount} insights`);
        await saveState(3, { insights_cursor: null, insights_count: insightsCount });
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: Cleanup zero-spend creatives + count
    // ═══════════════════════════════════════════════════════════════════
    if (phase === 3) {
      console.log("Phase 3: Cleanup zero-spend creatives...");

      // Delete creatives with zero spend (no insights matched), except manual-tagged
      const { count: zeroSpendCount } = await supabase.from("creatives")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId).lte("spend", 0).neq("tag_source", "manual");
      if (zeroSpendCount && zeroSpendCount > 0) {
        await supabase.from("creatives")
          .delete()
          .eq("account_id", accountId).lte("spend", 0).neq("tag_source", "manual");
        console.log(`  Cleaned up ${zeroSpendCount} zero-spend creatives`);
      }

      // Count remaining
      const { count: remaining } = await supabase.from("creatives")
        .select("*", { count: "exact", head: true }).eq("account_id", accountId);
      const creativesUpserted = remaining || 0;

      console.log(`Phase 3 complete: ${creativesUpserted} creatives remain`);
      await saveState(4, { creatives_upserted: creativesUpserted });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: Daily metric breakdowns (chunked, resumable, batch upsert)
    //   Upserts incrementally per page instead of accumulating in memory
    // ═══════════════════════════════════════════════════════════════════
    if (phase === 4) {
      const { count: existingCount } = await supabase.from("creatives")
        .select("*", { count: "exact", head: true }).eq("account_id", accountId);
      const hasExistingAds = (existingCount || 0) > 0;

      const dailyDays = hasExistingAds && syncType !== "initial"
        ? Math.min(dateRangeDays, 30)
        : dateRangeDays;

      const CHUNK_DAYS = 15;
      const endDate = new Date();
      const fullStartDate = new Date();
      fullStartDate.setDate(fullStartDate.getDate() - dailyDays);

      const chunkOffset = state.daily_chunk_offset || 0;
      const dailyCursor = state.daily_cursor || null;
      const totalChunks = Math.ceil(dailyDays / CHUNK_DAYS);

      console.log(`Phase 4: Daily breakdowns (${dailyDays} days, chunk ${chunkOffset + 1}/${totalChunks})...`);

      let currentChunk = chunkOffset;
      let paginationCursor = dailyCursor;

      while (currentChunk < totalChunks && !isTimedOut()) {
        const { data: sc } = await supabase.from("sync_logs").select("status").eq("id", syncLog.id).single();
        if (sc?.status === "cancelled") return;

        const chunkStart = new Date(fullStartDate);
        chunkStart.setDate(chunkStart.getDate() + currentChunk * CHUNK_DAYS);
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setDate(chunkEnd.getDate() + CHUNK_DAYS - 1);
        if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

        const chunkSince = chunkStart.toISOString().split("T")[0];
        const chunkUntil = chunkEnd.toISOString().split("T")[0];
        const chunkRange = JSON.stringify({ since: chunkSince, until: chunkUntil });

        console.log(`  Chunk ${currentChunk + 1}/${totalChunks}: ${chunkSince} → ${chunkUntil}`);

        const insightsFields = "ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values,video_avg_time_watched_actions,video_thruplay_watched_actions";

        let nextUrl = paginationCursor || (
          `https://graph.facebook.com/${META_API_VERSION}/${accountId}/insights?` +
          `time_range=${encodeURIComponent(chunkRange)}&time_increment=1&level=ad` +
          `&fields=${insightsFields}` +
          `&limit=500&access_token=${encodeURIComponent(metaToken)}`
        );

        while (nextUrl && !isTimedOut()) {
          await heartbeat();
          const result = await metaFetch(nextUrl, ctx);
          if (result.error) { nextUrl = null; break; }
          if (result.data && result.data.length > 0) {
            // Upsert each page directly — no accumulation
            const rows = result.data.map((row: any) => ({
              ad_id: row.ad_id,
              account_id: accountId,
              date: row.date_start,
              ...parseInsightsRow(row),
            }));
            for (let i = 0; i < rows.length; i += 500) {
              const batch = rows.slice(i, i + 500);
              const { error } = await supabase.from("creative_daily_metrics").upsert(batch, { onConflict: "ad_id,date" });
              if (error) console.error("Daily upsert error:", error.message);
            }
            console.log(`    Upserted ${rows.length} daily rows`);
          }
          nextUrl = result.next;
          if (nextUrl) await new Promise(r => setTimeout(r, 150));
        }

        if (nextUrl && isTimedOut()) {
          console.log(`Phase 4 paused mid-chunk ${currentChunk + 1}`);
          await saveState(4, { daily_chunk_offset: currentChunk, daily_cursor: nextUrl });
          return;
        }

        paginationCursor = null;
        currentChunk++;
      }

      if (currentChunk >= totalChunks) {
        console.log("Phase 4 complete");
        await saveState(5, { daily_chunk_offset: null, daily_cursor: null });
      } else {
        console.log(`Phase 4 paused after chunk ${currentChunk}`);
        await saveState(4, { daily_chunk_offset: currentChunk, daily_cursor: null });
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 5: Tag resolution (batch updates)
    // ═══════════════════════════════════════════════════════════════════
    if (phase === 5) {
      console.log("Phase 5: Resolving tags...");
      let tagsParsed = 0, tagsCsvMatched = 0, tagsUntagged = 0;

      const { data: allMappings } = await supabase.from("name_mappings").select("*").eq("account_id", accountId);
      const mappingsByCode = new Map((allMappings || []).map((m: any) => [m.unique_code, m]));

      let offset = state.tag_offset || 0;
      const BATCH = 1000;

      while (!isTimedOut()) {
        const { data: unresolved } = await supabase.from("creatives")
          .select("ad_id, ad_name, tag_source, unique_code")
          .eq("account_id", accountId).neq("tag_source", "manual")
          .range(offset, offset + BATCH - 1);

        if (!unresolved?.length) break;

        // Collect updates and batch them
        const updatesBySource: Record<string, any[]> = {};
        for (const c of unresolved) {
          const parsed = parseAdName(c.ad_name);
          let tags: any, source: string;
          if (parsed.parsed) {
            tags = { unique_code: parsed.unique_code, ad_type: parsed.ad_type, person: parsed.person, style: parsed.style, product: parsed.product, hook: parsed.hook, theme: parsed.theme };
            source = "parsed";
            tagsParsed++;
          } else {
            const mapping = mappingsByCode.get(parsed.unique_code);
            if (mapping) {
              tags = { unique_code: parsed.unique_code, ad_type: mapping.ad_type, person: mapping.person, style: mapping.style, product: mapping.product, hook: mapping.hook, theme: mapping.theme };
              source = "csv_match";
              tagsCsvMatched++;
            } else {
              tags = { unique_code: parsed.unique_code };
              source = "untagged";
              tagsUntagged++;
            }
          }
          if (!updatesBySource[source]) updatesBySource[source] = [];
          updatesBySource[source].push({ ad_id: c.ad_id, ...tags, tag_source: source });
        }

        // Batch upsert per source group
        for (const [, rows] of Object.entries(updatesBySource)) {
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200);
            // Use individual updates in parallel (tags differ per row)
            await Promise.all(batch.map((row: any) => {
              const { ad_id, ...fields } = row;
              return supabase.from("creatives").update(fields).eq("ad_id", ad_id);
            }));
          }
        }

        offset += unresolved.length;
        if (unresolved.length < BATCH) break;
      }

      console.log(`Phase 5: ${tagsParsed} parsed, ${tagsCsvMatched} csv, ${tagsUntagged} untagged`);
      await saveState(6, {
        tags_parsed: (state.tags_parsed || 0) + tagsParsed,
        tags_csv_matched: (state.tags_csv_matched || 0) + tagsCsvMatched,
        tags_untagged: (state.tags_untagged || 0) + tagsUntagged,
        tag_offset: null,
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 6: Finalize
    // ═══════════════════════════════════════════════════════════════════
    if (phase === 6) {
      console.log("Phase 6: Finalizing...");

      const { count: totalCount } = await supabase.from("creatives")
        .select("*", { count: "exact", head: true }).eq("account_id", accountId);
      const { count: untaggedCount } = await supabase.from("creatives")
        .select("*", { count: "exact", head: true }).eq("account_id", accountId).eq("tag_source", "untagged");

      await supabase.from("ad_accounts").update({
        creative_count: totalCount || 0, untagged_count: untaggedCount || 0,
        last_synced_at: new Date().toISOString(),
      }).eq("id", accountId);

      const finalStatus = (JSON.parse(syncLog.api_errors || "[]")).length > 0 ? "completed_with_errors" : "completed";
      await saveState(6, {}, finalStatus);
      console.log(`\n✅ Sync complete for ${account.name}: ${finalStatus}`);
      return;
    }

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Phase ${phase} error:`, errMsg);
    ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: errMsg });
    try {
      await supabase.from("sync_logs").update({
        status: "failed",
        api_errors: JSON.stringify([...JSON.parse(syncLog.api_errors || "[]"), ...ctx.apiErrors]),
        completed_at: new Date().toISOString(),
        duration_ms: (syncLog.duration_ms || 0) + (Date.now() - startMs),
      }).eq("id", syncLog.id);
    } catch (_) { /* can't save error status */ }
    await promoteNextQueued(supabase);
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/sync\/?/, "").replace(/\/$/, "");

  // The /sync/continue endpoint is called by pg_cron — no user auth needed
  // (same pattern as cleanup-stuck-syncs)
  const isCronPath = path === "continue";

  // Auth (skip for cron-only paths)
  if (!isCronPath) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authToken = authHeader.replace("Bearer ", "");

    const isAnonKey = authToken === Deno.env.get("SUPABASE_ANON_KEY") || authToken === Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!isAnonKey) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
      if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      if (!userRole || !["builder", "employee"].includes(userRole.role)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
  }

  // url and path already parsed above

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
      const { data: activeSyncs } = await supabase.from("sync_logs").select("id, started_at").in("status", ["running", "queued"]);
      if (!activeSyncs?.length) {
        return new Response(JSON.stringify({ message: "No running sync to cancel" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const now = new Date().toISOString();
      await supabase.from("sync_logs").update({
        status: "cancelled",
        api_errors: JSON.stringify([{ timestamp: now, message: "Cancelled by user" }]),
        completed_at: now,
      }).in("id", activeSyncs.map((s: any) => s.id));
      return new Response(JSON.stringify({ cancelled: activeSyncs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── POST /sync/continue ───────────────────────────────────────────
    if (req.method === "POST" && path === "continue") {
      const { data: runningSyncs } = await supabase.from("sync_logs")
        .select("*")
        .eq("status", "running")
        .order("started_at", { ascending: true })
        .limit(1);

      if (!runningSyncs?.length) {
        await promoteNextQueued(supabase);
        return new Response(JSON.stringify({ message: "No syncs to continue, promoted queued if any" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const syncLog = runningSyncs[0];

      let metaToken = Deno.env.get("META_ACCESS_TOKEN");
      if (!metaToken) {
        const { data: tokenRow } = await supabase.from("settings").select("value").eq("key", "meta_access_token").single();
        metaToken = tokenRow?.value || null;
      }
      if (!metaToken) {
        return new Response(JSON.stringify({ error: "No Meta token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("sync_logs").update({
        sync_state: { ...syncLog.sync_state, last_activity: new Date().toISOString() },
      }).eq("id", syncLog.id);

      await runSyncPhase(supabase, syncLog, metaToken);

      return new Response(JSON.stringify({ continued: syncLog.id, phase: syncLog.current_phase }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── POST /sync ────────────────────────────────────────────────────
    if (req.method === "POST" && !path) {
      const body = await req.json();
      const { account_id, sync_type = "manual" } = body;

      const { data: activeSyncs } = await supabase.from("sync_logs").select("id, account_id, started_at").in("status", ["running", "queued"]).limit(1);
      if (activeSyncs?.length) {
        return new Response(JSON.stringify({ error: "Sync already running" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let metaToken = Deno.env.get("META_ACCESS_TOKEN");
      if (!metaToken) {
        const { data: tokenRow } = await supabase.from("settings").select("value").eq("key", "meta_access_token").single();
        metaToken = tokenRow?.value || null;
      }
      if (!metaToken) return new Response(JSON.stringify({ error: "No Meta access token configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let accounts: any[] = [];
      if (account_id && account_id !== "all") {
        const { data } = await supabase.from("ad_accounts").select("*").eq("id", account_id).single();
        if (data) accounts = [data];
      } else {
        const { data } = await supabase.from("ad_accounts").select("*").eq("is_active", true);
        accounts = data || [];
      }
      if (!accounts.length) return new Response(JSON.stringify({ error: "No accounts to sync" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const created = [];
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const dateRangeDays = sync_type === "initial" ? 90 : (account.date_range_days || 14);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRangeDays);

        const isFirst = i === 0;
        const { data: logEntry, error: logError } = await supabase.from("sync_logs").insert({
          account_id: account.id, sync_type,
          status: isFirst ? "running" : "queued",
          current_phase: 1,
          sync_state: { last_activity: new Date().toISOString() },
          date_range_start: startDate.toISOString().split("T")[0],
          date_range_end: endDate.toISOString().split("T")[0],
        }).select().single();

        if (logError) {
          console.error("Log create error:", logError);
          continue;
        }
        created.push({ id: logEntry.id, account_id: account.id, account_name: account.name });
      }

      if (created.length > 0) {
        const { data: firstLog } = await supabase.from("sync_logs").select("*").eq("id", created[0].id).single();
        if (firstLog) {
          await runSyncPhase(supabase, firstLog, metaToken);
        }
      }

      return new Response(JSON.stringify({ started: created }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Sync error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
