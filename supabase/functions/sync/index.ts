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

      // Timeout recovery: mark syncs stuck in "running" for >20 minutes as failed
      const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const { data: stuckSyncs } = await supabase
        .from("sync_logs")
        .select("id")
        .eq("status", "running")
        .lt("started_at", twentyMinAgo);
      if (stuckSyncs && stuckSyncs.length > 0) {
        const stuckIds = stuckSyncs.map((s: any) => s.id);
        await supabase
          .from("sync_logs")
          .update({
             status: "failed",
            api_errors: JSON.stringify([{ timestamp: new Date().toISOString(), message: "Sync timed out (exceeded 20 minutes)" }]),
            completed_at: new Date().toISOString(),
          })
          .in("id", stuckIds);
        console.log(`Recovered ${stuckIds.length} stuck sync(s)`);
      }

      // Prevent concurrent syncs: check if any sync is still running
      const { data: runningSyncs } = await supabase
        .from("sync_logs")
        .select("id, account_id, started_at")
        .eq("status", "running")
        .limit(1);

      if (runningSyncs && runningSyncs.length > 0) {
        const running = runningSyncs[0];
        const startedAgo = Math.round((Date.now() - new Date(running.started_at).getTime()) / 1000);
        return new Response(JSON.stringify({
          error: `A sync is already in progress (started ${startedAgo}s ago). Please wait for it to finish.`,
          running_sync: { id: running.id, account_id: running.account_id, started_at: running.started_at },
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      // If syncing all accounts AND this is a scheduled sync, stagger by invoking
      // individual per-account syncs sequentially with a delay between them
      if (account_id === "all" && accounts.length > 1 && sync_type === "scheduled") {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const staggerResults: any[] = [];
        const STAGGER_DELAY_MS = 5000; // 5 seconds between accounts

        for (let i = 0; i < accounts.length; i++) {
          const acct = accounts[i];
          console.log(`Staggered sync: triggering account ${acct.id} (${acct.name}) [${i + 1}/${accounts.length}]`);

          try {
            const resp = await fetch(`${supabaseUrl}/functions/v1/sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${anonKey}`,
              },
              body: JSON.stringify({ account_id: acct.id, sync_type: "scheduled" }),
            });
            const result = await resp.json();
            staggerResults.push({ account_id: acct.id, account_name: acct.name, status: resp.ok ? "triggered" : "error", result });
          } catch (e) {
            staggerResults.push({ account_id: acct.id, account_name: acct.name, status: "error", error: String(e) });
          }

          // Wait between accounts (except after the last one)
          if (i < accounts.length - 1) {
            await new Promise((r) => setTimeout(r, STAGGER_DELAY_MS));
          }
        }

        return new Response(JSON.stringify({ staggered: true, results: staggerResults }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allResults = [];

      for (const account of accounts) {
        const startedAt = new Date();

        // Use per-account date_range_days, fallback to global settings
        const dateRangeDays = sync_type === "initial" ? 90 : (account.date_range_days || parseInt(settings.date_range_days || "14"));
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRangeDays);

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
          // Phase 1: Fetch ads from Meta (aggregated)
          const sinceStr = startDate.toISOString().split("T")[0];
          const untilStr = endDate.toISOString().split("T")[0];
          const timeRange = JSON.stringify({ since: sinceStr, until: untilStr });

          let adsPageLimit = 50; // Start with 50 to avoid "reduce data" errors
          let nextUrl: string | null =
            `https://graph.facebook.com/v21.0/${account.id}/ads?` +
            `fields=id,name,status,campaign{name},adset{name},creative{thumbnail_url,video_id},` +
            `preview_shareable_link,` +
            `insights.time_range(${timeRange}){spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values}` +
            `&limit=${adsPageLimit}&access_token=${encodeURIComponent(token)}`;

          const fetchedAds: any[] = [];

          console.log(`Fetching ads for account ${account.id} (${account.name})`);
          console.log(`Date range: ${sinceStr} to ${untilStr}`);

          while (nextUrl) {
            metaApiCalls++;
            console.log(`Meta API call #${metaApiCalls}...`);
            const resp = await fetch(nextUrl);
            const data = await resp.json();

            if (data.error) {
              // If "reduce data" error, retry with smaller limit
              if (data.error.message?.includes("reduce the amount of data") && adsPageLimit > 10) {
                adsPageLimit = Math.max(10, Math.floor(adsPageLimit / 2));
                console.log(`Reducing page size to ${adsPageLimit} and retrying...`);
                apiErrors.push({ timestamp: new Date().toISOString(), message: `Reduced page size to ${adsPageLimit}: ${data.error.message}` });
                // Rebuild URL with smaller limit
                nextUrl = nextUrl.replace(/&limit=\d+/, `&limit=${adsPageLimit}`);
                await new Promise((r) => setTimeout(r, 2000)); // Back off before retry
                continue;
              }
              console.error(`Meta API error:`, data.error);
              apiErrors.push({ timestamp: new Date().toISOString(), message: data.error.message });
              break;
            }

            if (data.data) {
              fetchedAds.push(...data.data);
              console.log(`Fetched ${data.data.length} ads (total: ${fetchedAds.length})`);
            }

            nextUrl = data.paging?.next || null;

            // Rate limiting — more aggressive with larger datasets
            if (nextUrl) await new Promise((r) => setTimeout(r, 500));
          }

          creativesFetched = fetchedAds.length;

          // Phase 1a: Skip video source URL fetching for speed — use shareable links instead
          const videoIdMap = new Map<string, string>();
          console.log(`Skipping video source URL fetching (${[...new Set(fetchedAds.map((ad: any) => ad.creative?.video_id).filter(Boolean))].length} videos) for faster sync`);

          // Phase 1b: Get existing manual-tagged ad_ids
          const { data: manualAds } = await supabase
            .from("creatives")
            .select("ad_id")
            .eq("account_id", account.id)
            .eq("tag_source", "manual");
          const manualAdIds = new Set((manualAds || []).map((a: any) => a.ad_id));

          // Build all creative records
          const upsertBatch: any[] = [];
          const manualUpdateBatch: any[] = [];

          for (const ad of fetchedAds) {
            const insights = ad.insights?.data?.[0] || {};
            const spend = parseFloat(insights.spend || "0");
            const roas = insights.purchase_roas?.[0]?.value ? parseFloat(insights.purchase_roas[0].value) : 0;
            const ctr = parseFloat(insights.ctr || "0");
            const clicks = parseInt(insights.clicks || "0");
            const impressions = parseInt(insights.impressions || "0");
            const cpm = parseFloat(insights.cpm || "0");
            const cpc = parseFloat(insights.cpc || "0");
            const frequency = parseFloat(insights.frequency || "0");
            let purchases = 0, purchaseValue = 0, cpa = 0;
            if (insights.actions) {
              const pa = insights.actions.find((a: any) => a.action_type === "purchase");
              if (pa) purchases = parseInt(pa.value || "0");
            }
            if (insights.action_values) {
              const pv = insights.action_values.find((a: any) => a.action_type === "purchase");
              if (pv) purchaseValue = parseFloat(pv.value || "0");
            }
            if (insights.cost_per_action_type) {
              const cp = insights.cost_per_action_type.find((a: any) => a.action_type === "purchase");
              if (cp) cpa = parseFloat(cp.value || "0");
            }
            const thumbStopRate = impressions > 0 ? (clicks / impressions) * 100 : 0;

            // Resolve video preview URL
            const videoId = ad.creative?.video_id;
            const videoSourceUrl = videoId ? (videoIdMap.get(videoId) || null) : null;
            const shareableLink = ad.preview_shareable_link || null;
            const previewUrl = videoSourceUrl || shareableLink;

            const creativeData = {
              ad_id: ad.id,
              account_id: account.id,
              ad_name: ad.name,
              ad_status: ad.status || "UNKNOWN",
              campaign_name: ad.campaign?.name || null,
              adset_name: ad.adset?.name || null,
              thumbnail_url: ad.creative?.thumbnail_url || null,
              preview_url: previewUrl,
              spend, roas, cpa, ctr, clicks, impressions,
              video_views: 0, thumb_stop_rate: thumbStopRate, hold_rate: 0,
              cpm, cpc, frequency, purchases, purchase_value: purchaseValue,
            };

            if (manualAdIds.has(ad.id)) {
              manualUpdateBatch.push(creativeData);
              tagsManualPreserved++;
            } else {
              upsertBatch.push({ ...creativeData, unique_code: ad.name.split("_")[0] });
            }
          }

          // Batch upsert non-manual creatives (chunks of 100)
          for (let i = 0; i < upsertBatch.length; i += 100) {
            const chunk = upsertBatch.slice(i, i + 100);
            const { error } = await supabase
              .from("creatives")
              .upsert(chunk, { onConflict: "ad_id" });
            if (!error) creativesUpserted += chunk.length;
            else console.error("Batch upsert error:", error);
          }

          // Batch update manual-tagged creatives (metrics only, parallel batches of 50)
          for (let i = 0; i < manualUpdateBatch.length; i += 50) {
            const batch = manualUpdateBatch.slice(i, i + 50);
            await Promise.all(batch.map(({ ad_id, ...metrics }: any) =>
              supabase.from("creatives").update(metrics).eq("ad_id", ad_id)
            ));
            creativesUpserted += batch.length;
          }

          console.log(`Upserted ${creativesUpserted} creatives`);

          // Phase 1c: Fetch daily breakdowns in 7-day chunks to avoid Meta API timeouts
          console.log(`Fetching daily breakdowns...`);
          const dailyRows: any[] = [];

          // Split date range into 7-day windows to avoid Meta API "reduce data" errors
          const chunkStart = new Date(startDate);
          while (chunkStart < endDate) {
            const chunkEnd = new Date(chunkStart);
            chunkEnd.setDate(chunkEnd.getDate() + 6); // 7-day chunks
            if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

            const chunkSince = chunkStart.toISOString().split("T")[0];
            const chunkUntil = chunkEnd.toISOString().split("T")[0];
            const chunkRange = JSON.stringify({ since: chunkSince, until: chunkUntil });

            console.log(`Daily chunk: ${chunkSince} to ${chunkUntil}`);

            let dailyPageLimit = 200;
            let dailyNextUrl: string | null =
              `https://graph.facebook.com/v21.0/${account.id}/insights?` +
              `time_range=${encodeURIComponent(chunkRange)}&time_increment=1` +
              `&level=ad` +
              `&fields=ad_id,spend,purchase_roas,cost_per_action_type,ctr,clicks,impressions,cpm,cpc,frequency,actions,action_values` +
              `&limit=${dailyPageLimit}&access_token=${encodeURIComponent(token)}`;

            while (dailyNextUrl) {
              metaApiCalls++;
              const resp = await fetch(dailyNextUrl);
              const data = await resp.json();

              if (data.error) {
                // Retry with smaller limit on "reduce data" errors
                if (data.error.message?.includes("reduce the amount of data") && dailyPageLimit > 25) {
                  dailyPageLimit = Math.max(25, Math.floor(dailyPageLimit / 2));
                  console.log(`Daily: reducing page size to ${dailyPageLimit}`);
                  dailyNextUrl = dailyNextUrl.replace(/&limit=\d+/, `&limit=${dailyPageLimit}`);
                  await new Promise((r) => setTimeout(r, 2000));
                  continue;
                }
                console.error(`Daily breakdown API error:`, data.error);
                apiErrors.push({ timestamp: new Date().toISOString(), message: `Daily: ${data.error.message}` });
                break;
              }

              if (data.data) {
                for (const row of data.data) {
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

                  dailyRows.push({
                    ad_id: row.ad_id,
                    account_id: account.id,
                    date: row.date_start,
                    spend, roas, cpa, ctr, clicks, impressions,
                    cpm, cpc, frequency, purchases, purchase_value: purchaseValue,
                    thumb_stop_rate: thumbStopRate,
                    video_views: 0, hold_rate: 0, video_avg_play_time: 0,
                    adds_to_cart: 0, cost_per_add_to_cart: 0,
                  });
                }
                console.log(`Daily rows fetched: ${dailyRows.length}`);
              }

              dailyNextUrl = data.paging?.next || null;
              if (dailyNextUrl) await new Promise((r) => setTimeout(r, 300));
            }

            // Move to next chunk
            chunkStart.setDate(chunkStart.getDate() + 7);
            // Delay between chunks
            await new Promise((r) => setTimeout(r, 500));
          }

          // Upsert daily metrics in chunks
          for (let i = 0; i < dailyRows.length; i += 100) {
            const chunk = dailyRows.slice(i, i + 100);
            const { error } = await supabase
              .from("creative_daily_metrics")
              .upsert(chunk, { onConflict: "ad_id,date" });
            if (error) console.error("Daily metrics upsert error:", error);
          }
          console.log(`Upserted ${dailyRows.length} daily metric rows`);

          // Phase 2: Tag resolution — batch load all CSV mappings upfront to avoid per-creative queries
          const { data: allMappings } = await supabase
            .from("name_mappings")
            .select("*")
            .eq("account_id", account.id);
          const mappingsByCode = new Map((allMappings || []).map((m: any) => [m.unique_code, m]));

          const { data: unresolved } = await supabase
            .from("creatives")
            .select("ad_id, ad_name, tag_source, unique_code")
            .eq("account_id", account.id)
            .neq("tag_source", "manual");

          const tagUpdates: { ad_id: string; tags: any; source: string }[] = [];
          for (const creative of unresolved || []) {
            // Inline tag resolution (no DB queries needed now)
            const parsed = parseAdName(creative.ad_name);
            if (parsed.parsed) {
              tagUpdates.push({ ad_id: creative.ad_id, tags: { unique_code: parsed.unique_code, ad_type: parsed.ad_type, person: parsed.person, style: parsed.style, product: parsed.product, hook: parsed.hook, theme: parsed.theme }, source: "parsed" });
              tagsParsed++;
            } else {
              const mapping = mappingsByCode.get(parsed.unique_code);
              if (mapping) {
                tagUpdates.push({ ad_id: creative.ad_id, tags: { unique_code: parsed.unique_code, ad_type: mapping.ad_type, person: mapping.person, style: mapping.style, product: mapping.product, hook: mapping.hook, theme: mapping.theme }, source: "csv_match" });
                tagsCsvMatched++;
              } else {
                tagUpdates.push({ ad_id: creative.ad_id, tags: { unique_code: parsed.unique_code }, source: "untagged" });
                tagsUntagged++;
              }
            }
          }

          // Apply tag updates in parallel batches
          const TAG_BATCH = 50;
          for (let i = 0; i < tagUpdates.length; i += TAG_BATCH) {
            const batch = tagUpdates.slice(i, i + TAG_BATCH);
            await Promise.all(batch.map(({ ad_id, tags, source }) =>
              supabase.from("creatives").update({ ...tags, tag_source: source }).eq("ad_id", ad_id)
            ));
          }

          console.log(`Tags resolved: ${tagsParsed} parsed, ${tagsCsvMatched} csv, ${tagsUntagged} untagged`);

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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
