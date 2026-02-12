import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const MAX_RATE_LIMIT_RETRIES = 2;

async function metaFetch(
  url: string,
  ctx: { metaApiCalls: number; apiErrors: { timestamp: string; message: string }[]; isTimedOut: () => boolean }
): Promise<{ data: any[] | null; next: string | null; error: boolean }> {
  if (ctx.isTimedOut()) return { data: null, next: null, error: false };

  let rateLimitRetries = 0;
  while (true) {
    ctx.metaApiCalls++;
    const resp = await fetch(url);
    const json = await resp.json();

    if (json.error) {
      // Rate limit — back off and retry (limited retries)
      if (json.error.code === 80004 && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        rateLimitRetries++;
        const waitSec = 30 * rateLimitRetries;
        console.log(`Rate limited, waiting ${waitSec}s (retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})...`);
        ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: `Rate limited, backing off ${waitSec}s` });
        await new Promise(r => setTimeout(r, waitSec * 1000));
        if (ctx.isTimedOut()) return { data: null, next: null, error: false };
        continue;
      }
      console.error("Meta API error:", json.error);
      ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: json.error.message || "Unknown Meta error" });
      return { data: null, next: null, error: true };
    }

    return { data: json.data || [], next: json.paging?.next || null, error: false };
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
  if (row.actions) {
    const pa = row.actions.find((a: any) => a.action_type === "purchase");
    if (pa) purchases = parseInt(pa.value || "0");
  }
  if (row.action_values) {
    const pv = row.action_values.find((a: any) => a.action_type === "purchase");
    if (pv) purchaseValue = parseFloat(pv.value || "0");
  }
  if (row.cost_per_action_type) {
    const cp = row.cost_per_action_type.find((a: any) => a.action_type === "purchase");
    if (cp) cpa = parseFloat(cp.value || "0");
  }
  const thumbStopRate = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return { spend, roas, cpa, ctr, clicks, impressions, cpm, cpc, frequency, purchases, purchase_value: purchaseValue, thumb_stop_rate: thumbStopRate };
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

    // ─── POST /sync ────────────────────────────────────────────────────
    if (req.method === "POST" && !path) {
      const body = await req.json();
      const { account_id, sync_type = "manual" } = body;

      // Timeout recovery: mark stuck syncs as failed
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: stuckSyncs } = await supabase.from("sync_logs").select("id").eq("status", "running").lt("started_at", tenMinAgo);
      if (stuckSyncs?.length) {
        await supabase.from("sync_logs").update({
          status: "failed",
          api_errors: JSON.stringify([{ timestamp: new Date().toISOString(), message: "Sync timed out (exceeded 10 minutes)" }]),
          completed_at: new Date().toISOString(),
        }).in("id", stuckSyncs.map((s: any) => s.id));
        console.log(`Recovered ${stuckSyncs.length} stuck sync(s)`);
      }

      // Prevent concurrent syncs
      const { data: runningSyncs } = await supabase.from("sync_logs").select("id, account_id, started_at").eq("status", "running").limit(1);
      if (runningSyncs?.length) {
        const r = runningSyncs[0];
        return new Response(JSON.stringify({
          error: `Sync already running (started ${Math.round((Date.now() - new Date(r.started_at).getTime()) / 1000)}s ago)`,
          running_sync: r,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get Meta token
      let metaToken = Deno.env.get("META_ACCESS_TOKEN");
      if (!metaToken) {
        const { data: tokenRow } = await supabase.from("settings").select("value").eq("key", "meta_access_token").single();
        metaToken = tokenRow?.value || null;
      }
      if (!metaToken) return new Response(JSON.stringify({ error: "No Meta access token configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Get settings & accounts
      const { data: settingsRows } = await supabase.from("settings").select("*");
      const settings: Record<string, string> = {};
      for (const row of settingsRows || []) settings[row.key] = row.value;

      let accounts: any[] = [];
      if (account_id && account_id !== "all") {
        const { data } = await supabase.from("ad_accounts").select("*").eq("id", account_id).single();
        if (data) accounts = [data];
      } else {
        const { data } = await supabase.from("ad_accounts").select("*").eq("is_active", true);
        accounts = data || [];
      }
      if (!accounts.length) return new Response(JSON.stringify({ error: "No accounts to sync" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Stagger scheduled multi-account syncs
      if (account_id === "all" && accounts.length > 1 && sync_type === "scheduled") {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const results: any[] = [];
        for (let i = 0; i < accounts.length; i++) {
          const acct = accounts[i];
          console.log(`Staggered sync: account ${acct.id} (${acct.name}) [${i + 1}/${accounts.length}]`);
          try {
            const resp = await fetch(`${supabaseUrl}/functions/v1/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
              body: JSON.stringify({ account_id: acct.id, sync_type: "scheduled" }),
            });
            results.push({ account_id: acct.id, status: resp.ok ? "triggered" : "error", result: await resp.json() });
          } catch (e) {
            results.push({ account_id: acct.id, status: "error", error: String(e) });
          }
          if (i < accounts.length - 1) await new Promise(r => setTimeout(r, 5000));
        }
        return new Response(JSON.stringify({ staggered: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── Single-account sync ───────────────────────────────────────
      const HARD_DEADLINE_MS = 8 * 60 * 1000;
      const syncStartGlobal = Date.now();
      const isTimedOut = () => (Date.now() - syncStartGlobal) > HARD_DEADLINE_MS;
      const allResults = [];

      for (const account of accounts) {
        if (isTimedOut()) { console.log("Global timeout, skipping remaining accounts"); break; }

        const startedAt = Date.now();
        const dateRangeDays = sync_type === "initial" ? 90 : (account.date_range_days || parseInt(settings.date_range_days || "14"));
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRangeDays);
        const sinceStr = startDate.toISOString().split("T")[0];
        const untilStr = endDate.toISOString().split("T")[0];
        const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });

        // Create sync log
        const { data: logEntry, error: logError } = await supabase.from("sync_logs").insert({
          account_id: account.id, sync_type, status: "running",
          date_range_start: sinceStr, date_range_end: untilStr,
        }).select().single();
        if (logError) { console.error("Failed to create sync log:", logError); continue; }
        const syncLogId = logEntry.id;

        let creativesFetched = 0, creativesUpserted = 0;
        let tagsParsed = 0, tagsCsvMatched = 0, tagsManualPreserved = 0, tagsUntagged = 0;
        const ctx = { metaApiCalls: 0, apiErrors: [] as { timestamp: string; message: string }[], isTimedOut };

        // Helper to save progress at any point
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
          console.log(`Date range: ${sinceStr} → ${untilStr} (${dateRangeDays} days)`);

          // ─── PHASE 1: Fetch ads metadata ─────────────────────────────
          // Fetch WITHOUT insights — Meta returns much larger pages this way
          console.log("Phase 1: Fetching ads metadata...");

          const adsUrl = `https://graph.facebook.com/v21.0/${account.id}/ads?` +
            `fields=id,name,status,campaign{name},adset{name},creative{thumbnail_url,video_id},preview_shareable_link` +
            `&limit=50&access_token=${encodeURIComponent(metaToken)}`;

          const fetchedAds: any[] = [];
          let nextAdsUrl: string | null = adsUrl;

          while (nextAdsUrl && !isTimedOut()) {
            const result = await metaFetch(nextAdsUrl, ctx);
            if (result.error) break;
            if (result.data) {
              fetchedAds.push(...result.data);
              console.log(`  Ads fetched: ${fetchedAds.length}`);
            }
            nextAdsUrl = result.next;
            if (nextAdsUrl) await new Promise(r => setTimeout(r, 500));
          }

          creativesFetched = fetchedAds.length;
          console.log(`Phase 1 complete: ${creativesFetched} ads fetched in ${ctx.metaApiCalls} API calls`);

          // ─── PHASE 2: Fetch aggregated insights (account-level) ──────
          // Single API call at account level with level=ad — returns all ads' insights at once
          const insightsMap = new Map<string, any>();

          if (creativesFetched > 0 && !isTimedOut()) {
            console.log("Phase 2: Fetching aggregated insights...");

            const insightsUrl = `https://graph.facebook.com/v21.0/${account.id}/insights?` +
              `time_range=${encodeURIComponent(timeRange)}` +
              `&level=ad` +
              `&fields=ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values` +
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

            console.log(`Phase 2 complete: ${insightsMap.size} ad insights fetched`);
          }

          // ─── PHASE 3: Build & upsert creatives ───────────────────────
          if (creativesFetched > 0) {
            console.log("Phase 3: Upserting creatives...");

            // Get manual-tagged ad IDs to preserve
            const { data: manualAds } = await supabase.from("creatives").select("ad_id")
              .eq("account_id", account.id).eq("tag_source", "manual");
            const manualAdIds = new Set((manualAds || []).map((a: any) => a.ad_id));

            const upsertBatch: any[] = [];
            const manualUpdateBatch: any[] = [];

            for (const ad of fetchedAds) {
              const insights = insightsMap.get(ad.id);
              const metrics = insights ? parseInsightsRow(insights) : {
                spend: 0, roas: 0, cpa: 0, ctr: 0, clicks: 0, impressions: 0,
                cpm: 0, cpc: 0, frequency: 0, purchases: 0, purchase_value: 0, thumb_stop_rate: 0,
              };

              const creativeData = {
                ad_id: ad.id, account_id: account.id, ad_name: ad.name,
                ad_status: ad.status || "UNKNOWN",
                campaign_name: ad.campaign?.name || null,
                adset_name: ad.adset?.name || null,
                thumbnail_url: ad.creative?.thumbnail_url || null,
                preview_url: ad.preview_shareable_link || null,
                ...metrics, video_views: 0, hold_rate: 0,
              };

              if (manualAdIds.has(ad.id)) {
                manualUpdateBatch.push(creativeData);
                tagsManualPreserved++;
              } else {
                upsertBatch.push({ ...creativeData, unique_code: ad.name.split("_")[0] });
              }
            }

            // Batch upsert (progressive — save as we go)
            for (let i = 0; i < upsertBatch.length; i += 100) {
              const chunk = upsertBatch.slice(i, i + 100);
              const { error } = await supabase.from("creatives").upsert(chunk, { onConflict: "ad_id" });
              if (!error) creativesUpserted += chunk.length;
              else console.error("Upsert error:", error);
            }

            // Update manual-tagged creatives (metrics only)
            for (let i = 0; i < manualUpdateBatch.length; i += 50) {
              const batch = manualUpdateBatch.slice(i, i + 50);
              await Promise.all(batch.map(({ ad_id, ...metrics }: any) =>
                supabase.from("creatives").update(metrics).eq("ad_id", ad_id)
              ));
              creativesUpserted += batch.length;
            }

            console.log(`Phase 3 complete: ${creativesUpserted} creatives upserted`);

            // Save progress after creatives — if function dies during daily breakdowns, we still have creatives
            await saveProgress("running");
          }

          // ─── PHASE 4: Daily breakdowns (account-level) ───────────────
          const dailyRows: any[] = [];

          if (!isTimedOut()) {
            console.log("Phase 4: Fetching daily breakdowns...");

            // 14-day chunks to keep response sizes manageable
            const chunkStart = new Date(startDate);
            while (chunkStart < endDate && !isTimedOut()) {
              const chunkEnd = new Date(chunkStart);
              chunkEnd.setDate(chunkEnd.getDate() + 13);
              if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

              const chunkSince = chunkStart.toISOString().split("T")[0];
              const chunkUntil = chunkEnd.toISOString().split("T")[0];
              const chunkRange = JSON.stringify({ since: chunkSince, until: chunkUntil });

              console.log(`  Daily chunk: ${chunkSince} → ${chunkUntil}`);

              const dailyUrl = `https://graph.facebook.com/v21.0/${account.id}/insights?` +
                `time_range=${encodeURIComponent(chunkRange)}&time_increment=1&level=ad` +
                `&fields=ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values` +
                `&limit=200&access_token=${encodeURIComponent(metaToken)}`;

              let nextDailyUrl: string | null = dailyUrl;
              while (nextDailyUrl && !isTimedOut()) {
                const result = await metaFetch(nextDailyUrl, ctx);
                if (result.error) break;
                if (result.data) {
                  for (const row of result.data) {
                    const metrics = parseInsightsRow(row);
                    dailyRows.push({
                      ad_id: row.ad_id, account_id: account.id, date: row.date_start,
                      ...metrics, video_views: 0, hold_rate: 0, video_avg_play_time: 0,
                      adds_to_cart: 0, cost_per_add_to_cart: 0,
                    });
                  }
                  console.log(`  Daily rows: ${dailyRows.length}`);
                }
                nextDailyUrl = result.next;
                if (nextDailyUrl) await new Promise(r => setTimeout(r, 300));
              }

              chunkStart.setDate(chunkStart.getDate() + 14);
              if (chunkStart < endDate) await new Promise(r => setTimeout(r, 500));
            }

            // Upsert daily metrics
            for (let i = 0; i < dailyRows.length; i += 100) {
              const chunk = dailyRows.slice(i, i + 100);
              const { error } = await supabase.from("creative_daily_metrics").upsert(chunk, { onConflict: "ad_id,date" });
              if (error) console.error("Daily upsert error:", error);
            }
            console.log(`Phase 4 complete: ${dailyRows.length} daily rows upserted`);
          } else {
            ctx.apiErrors.push({ timestamp: new Date().toISOString(), message: "Skipped daily breakdowns due to timeout" });
          }

          // ─── PHASE 5: Tag resolution (pure DB, no API calls) ─────────
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
          console.log(`   ${creativesFetched} fetched, ${creativesUpserted} upserted, ${ctx.metaApiCalls} API calls, ${Date.now() - startedAt}ms`);

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
