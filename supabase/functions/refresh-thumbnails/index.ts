import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN")!;
const THUMB_BUCKET = "ad-thumbnails";
const VIDEO_BUCKET = "ad-videos";
const BATCH_SIZE = 20;
const VIDEO_BATCH_SIZE = 1;
const MAX_TOTAL = 1000;
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB cap
const TIME_BUDGET_MS = 8 * 60 * 1000; // 8 minutes max per invocation

/** Fetch a fresh high-res image URL from Meta Graph API. */
async function getFreshImageUrl(adId: string, accountId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${adId}?fields=creative{thumbnail_url,image_url,image_hash,object_story_spec}&access_token=${META_ACCESS_TOKEN}`
    );
    if (!res.ok) {
      console.log(`Meta API failed for ${adId}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const creative = data?.creative;
    if (!creative) return null;

    const imageHash = creative.image_hash ||
      creative.object_story_spec?.link_data?.image_hash ||
      creative.object_story_spec?.photo_data?.image_hash;
    if (imageHash) {
      const imgRes = await fetch(
        `https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=["${imageHash}"]&fields=url,url_128,width,height,original_width,original_height,permalink_url&access_token=${META_ACCESS_TOKEN}`
      );
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const images = imgData?.data;
        if (images && images.length > 0) {
          const img = images[0];
          // Prefer full-res url, skip url_128 (too low quality)
          const fullUrl = img.url;
          const w = img.original_width || img.width || 0;
          console.log(`image_hash for ${adId}: ${w}px wide, url length: ${fullUrl?.length}`);
          if (fullUrl && fullUrl.length > 100) {
            return fullUrl;
          }
        }
      }
    }

    const spec = creative.object_story_spec;
    const videoId = spec?.video_data?.video_id || spec?.template_data?.video_data?.video_id;
    if (videoId) {
      // Request high-res video thumbnails
      const vidRes = await fetch(
        `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails{uri,width,height}&access_token=${META_ACCESS_TOKEN}`
      );
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const thumbs = vidData?.thumbnails?.data;
        if (thumbs && thumbs.length > 0) {
          // Sort by width descending, pick the largest
          const sorted = thumbs.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
          const best = sorted[0];
          if (best?.uri && (best.width || 0) >= 200) {
            console.log(`Video thumbnail for ${adId}: ${best.width}x${best.height}`);
            return best.uri;
          }
        }
      }
      // Fallback: request largest available picture (1080px)
      const picRes = await fetch(
        `https://graph.facebook.com/v21.0/${videoId}/picture?redirect=false&width=1080&height=1080&access_token=${META_ACCESS_TOKEN}`
      );
      if (picRes.ok) {
        const picData = await picRes.json();
        if (picData?.data?.url) {
          console.log(`Video picture fallback (1080px) for ${adId}`);
          return picData.data.url;
        }
      }
    }

    if (creative.id) {
      const creativeRes = await fetch(
        `https://graph.facebook.com/v21.0/${creative.id}?fields=effective_object_story_id,image_url&access_token=${META_ACCESS_TOKEN}`
      );
      if (creativeRes.ok) {
        const creativeData = await creativeRes.json();
        if (creativeData.effective_object_story_id) {
          const postRes = await fetch(
            `https://graph.facebook.com/v21.0/${creativeData.effective_object_story_id}?fields=full_picture&access_token=${META_ACCESS_TOKEN}`
          );
          if (postRes.ok) {
            const postData = await postRes.json();
            if (postData.full_picture) {
              console.log(`Post full_picture for ${adId}`);
              return postData.full_picture;
            }
          }
        }
      }
    }

    if (creative.image_url) {
      console.log(`Using image_url for ${adId}`);
      return creative.image_url;
    }

    if (spec) {
      const imageUrl = spec.link_data?.image_url || spec.photo_data?.url || spec.photo_data?.image_url;
      if (imageUrl) return imageUrl;
    }

    if (creative.thumbnail_url) {
      console.log(`Using original thumbnail_url for ${adId}`);
      return creative.thumbnail_url;
    }

    return null;
  } catch (e) {
    console.log(`Meta API error for ${adId}:`, e);
    return null;
  }
}

/** Fetch ad preview URL from Meta Graph API for iframe embedding. */
async function getFreshPreviewUrl(adId: string): Promise<string | null> {
  try {
    // First try the ad preview endpoint
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${adId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${META_ACCESS_TOKEN}`
    );
    if (res.ok) {
      const data = await res.json();
      const preview = data?.data?.[0];
      if (preview?.body) {
        // Extract the iframe src from the HTML body
        const match = preview.body.match(/src="([^"]+)"/);
        if (match?.[1]) {
          const decoded = match[1].replace(/&amp;/g, "&");
          return decoded;
        }
      }
    }
    // Fallback: use the effective_object_story_id to build a Facebook post URL
    const adRes = await fetch(
      `https://graph.facebook.com/v21.0/${adId}?fields=creative{effective_object_story_id}&access_token=${META_ACCESS_TOKEN}`
    );
    if (adRes.ok) {
      const adData = await adRes.json();
      const storyId = adData?.creative?.effective_object_story_id;
      if (storyId) {
        // Format: pageId_postId -> facebook.com/pageId/posts/postId
        const parts = storyId.split("_");
        if (parts.length === 2) {
          return `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.log(`Preview URL error for ${adId}:`, e);
    return null;
  }
}

/** Fetch a fresh video source URL from Meta Graph API. */
async function getFreshVideoUrl(adId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${adId}?fields=creative{object_story_spec,video_id}&access_token=${META_ACCESS_TOKEN}`
    );
    if (!res.ok) {
      console.log(`Meta video API failed for ${adId}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const creative = data?.creative;
    if (!creative) return null;

    const spec = creative.object_story_spec;

    const videoIds: string[] = [];
    if (creative.video_id) videoIds.push(creative.video_id);
    if (spec?.video_data?.video_id) videoIds.push(spec.video_data.video_id);
    if (spec?.template_data?.video_data?.video_id) videoIds.push(spec.template_data.video_data.video_id);

    if (spec?.video_data?.video_url) {
      console.log(`Found video_url in spec for ${adId}`);
      return spec.video_data.video_url;
    }

    for (const vid of [...new Set(videoIds)]) {
      const vidRes = await fetch(
        `https://graph.facebook.com/v21.0/${vid}?fields=source&access_token=${META_ACCESS_TOKEN}`
      );
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        if (vidData?.source) {
          console.log(`Got video source from video_id ${vid} for ${adId}`);
          return vidData.source;
        }
      }
    }

    return null;
  } catch (e) {
    console.log(`Meta video API error for ${adId}:`, e);
    return null;
  }
}

async function downloadAndCache(
  supabase: any,
  bucket: string,
  accountId: string,
  adId: string,
  url: string,
  type: "image" | "video"
): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.log(`Download failed ${adId}: HTTP ${resp.status} ${resp.statusText}`);
      return null;
    }
    const blob = await resp.arrayBuffer();
    if (type === "image" && blob.byteLength < 5000) {
      console.log(`Skipping low-quality image for ${adId}: ${blob.byteLength} bytes`);
      return null;
    }
    if (type === "video" && blob.byteLength > MAX_VIDEO_SIZE) {
      console.log(`Skipping oversized video for ${adId}: ${(blob.byteLength / 1024 / 1024).toFixed(1)}MB`);
      return null;
    }
    const contentType = resp.headers.get("content-type") || (type === "video" ? "video/mp4" : "image/jpeg");
    const ext = type === "video"
      ? (contentType.includes("webm") ? "webm" : "mp4")
      : (contentType.includes("png") ? "png" : "jpg");
    const path = `${accountId}/${adId}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, new Uint8Array(blob), { contentType, upsert: true });
    if (error) {
      console.log(`Upload error ${adId}:`, error.message);
      return null;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  } catch (err) {
    console.log(`Cache error ${adId}:`, err);
    return null;
  }
}

/** Helper to check if we've exceeded our time budget */
function isOverBudget(startTime: number): boolean {
  return Date.now() - startTime > TIME_BUDGET_MS;
}

/** Helper to update the progress log row */
async function updateLog(supabase: any, logId: number, updates: Record<string, any>) {
  await supabase.from("media_refresh_logs").update(updates).eq("id", logId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("force") === "true";

    let accountFilter: string | null = url.searchParams.get("account_id");
    if (!accountFilter && req.method === "POST") {
      try {
        const body = await req.clone().json();
        accountFilter = body?.account_id || null;
      } catch { /* no body */ }
    }
    if (accountFilter) console.log(`Filtering to account: ${accountFilter}`);

    // Concurrency guard: skip if another refresh is already running
    const { data: runningLogs } = await supabase
      .from("media_refresh_logs")
      .select("id")
      .eq("status", "running")
      .limit(1);
    if (runningLogs && runningLogs.length > 0) {
      console.log("Skipping: another media refresh is already running.");
      return new Response(JSON.stringify({ skipped: true, reason: "already_running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a progress log entry
    const { data: logRow } = await supabase
      .from("media_refresh_logs")
      .insert({ account_id: accountFilter || "all", status: "running", current_phase: 1 })
      .select("id")
      .single();
    const logId = logRow?.id;

    // Phase 1: Discover work
    let missingThumbsQuery = supabase
      .from("creatives")
      .select("ad_id, account_id, thumbnail_url")
      .is("thumbnail_url", null);
    if (accountFilter) missingThumbsQuery = missingThumbsQuery.eq("account_id", accountFilter);
    const { data: missingThumbs } = await missingThumbsQuery.limit(MAX_TOTAL);

    let thumbQuery = supabase
      .from("creatives")
      .select("ad_id, account_id, thumbnail_url")
      .not("thumbnail_url", "is", null);
    if (accountFilter) thumbQuery = thumbQuery.eq("account_id", accountFilter);
    if (!forceRefresh) {
      thumbQuery = thumbQuery.not("thumbnail_url", "like", `%/storage/v1/object/public/%`);
    }
    const { data: uncachedThumbs } = await thumbQuery.limit(MAX_TOTAL);

    const allThumbWork = [...(missingThumbs || []), ...(uncachedThumbs || [])].slice(0, MAX_TOTAL);

    let missingVideosQuery = supabase
      .from("creatives")
      .select("ad_id, account_id")
      .is("video_url", null)
      .gt("video_views", 0);
    if (accountFilter) missingVideosQuery = missingVideosQuery.eq("account_id", accountFilter);
    const { data: missingVideos } = await missingVideosQuery.limit(500);

    let uncachedVideosQuery = supabase
      .from("creatives")
      .select("ad_id, account_id, video_url")
      .not("video_url", "is", null)
      .not("video_url", "like", `%/storage/v1/object/public/%`)
      .neq("video_url", "no-video");
    if (accountFilter) uncachedVideosQuery = uncachedVideosQuery.eq("account_id", accountFilter);
    const { data: uncachedVideos } = await uncachedVideosQuery.limit(100);

    // Find ads missing preview_url (for iframe embeds)
    let missingPreviewQuery = supabase
      .from("creatives")
      .select("ad_id")
      .is("preview_url", null);
    if (accountFilter) missingPreviewQuery = missingPreviewQuery.eq("account_id", accountFilter);
    const { data: missingPreviews } = await missingPreviewQuery.limit(MAX_TOTAL);

    const thumbs = allThumbWork;
    const noVideos = missingVideos || [];
    const videos = uncachedVideos || [];
    const previews = missingPreviews || [];

    const thumbsTotal = thumbs.length;
    const videosTotal = noVideos.length + videos.length;

    // Update log with totals
    if (logId) {
      await updateLog(supabase, logId, {
        current_phase: 1,
        thumbs_total: thumbsTotal,
        videos_total: videosTotal,
      });
    }

    if (thumbsTotal === 0 && videosTotal === 0) {
      console.log("All media already cached.");
      if (logId) {
        await updateLog(supabase, logId, {
          status: "completed",
          current_phase: 3,
          completed_at: new Date().toISOString(),
        });
      }
      return new Response(JSON.stringify({ thumbnails: { cached: 0, failed: 0, total: 0 }, videos: { cached: 0, failed: 0, total: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${thumbs.length} thumbnails to process, ${noVideos.length} ads missing video_url, ${videos.length} uncached videos`);

    // Phase 2: Process thumbnails
    if (logId) await updateLog(supabase, logId, { current_phase: 2 });
    const invocationStart = Date.now();

    let thumbCached = 0, thumbFailed = 0;
    for (let i = 0; i < thumbs.length; i += BATCH_SIZE) {
      const batch = thumbs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const freshUrl = await getFreshImageUrl(c.ad_id, c.account_id);
          if (!freshUrl) { return false; }
          if (!c.thumbnail_url) {
            await supabase.from("creatives").update({ thumbnail_url: freshUrl }).eq("ad_id", c.ad_id);
            return true;
          }
          const storageUrl = await downloadAndCache(supabase, THUMB_BUCKET, c.account_id, c.ad_id, freshUrl, "image");
          if (storageUrl) {
            await supabase.from("creatives").update({ thumbnail_url: storageUrl }).eq("ad_id", c.ad_id);
            return true;
          }
          return false;
        })
      );
      thumbCached += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
      thumbFailed += results.filter((r: any) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;

      // Update progress after each batch
      if (logId) {
        await updateLog(supabase, logId, { thumbs_cached: thumbCached, thumbs_failed: thumbFailed });
      }

      if (isOverBudget(invocationStart)) {
        console.log(`Time budget reached during thumbnail phase. Processed ${thumbCached + thumbFailed}/${thumbs.length}`);
        break;
      }
      if (i + BATCH_SIZE < thumbs.length) await new Promise(r => setTimeout(r, 300));
    }

    // Phase 3: Process videos
    if (logId) await updateLog(supabase, logId, { current_phase: 3 });

    let videosFetched = 0, videosMarkedNA = 0;
    for (let i = 0; i < noVideos.length; i += BATCH_SIZE) {
      const batch = noVideos.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const freshUrl = await getFreshVideoUrl(c.ad_id);
          if (!freshUrl) {
            await supabase.from("creatives").update({ video_url: "no-video" }).eq("ad_id", c.ad_id);
            return "marked";
          }
          const storageUrl = await downloadAndCache(supabase, VIDEO_BUCKET, c.account_id, c.ad_id, freshUrl, "video");
          if (storageUrl) {
            await supabase.from("creatives").update({ video_url: storageUrl }).eq("ad_id", c.ad_id);
            return "cached";
          }
          await supabase.from("creatives").update({ video_url: freshUrl }).eq("ad_id", c.ad_id);
          return "cached";
        })
      );
      videosFetched += results.filter((r: any) => r.status === "fulfilled" && r.value === "cached").length;
      videosMarkedNA += results.filter((r: any) => r.status === "fulfilled" && r.value === "marked").length;

      if (logId) {
        await updateLog(supabase, logId, { videos_cached: videosFetched, videos_failed: videosMarkedNA });
      }

      if (isOverBudget(invocationStart)) {
        console.log(`Time budget reached during video discovery. Processed ${videosFetched + videosMarkedNA}/${noVideos.length}`);
        break;
      }
      if (i + BATCH_SIZE < noVideos.length) await new Promise(r => setTimeout(r, 500));
    }

    let videoCached = 0, videoFailed = 0;
    for (let i = 0; i < videos.length; i += VIDEO_BATCH_SIZE) {
      const batch = videos.slice(i, i + VIDEO_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const freshUrl = await getFreshVideoUrl(c.ad_id);
          if (!freshUrl) { return false; }
          const storageUrl = await downloadAndCache(supabase, VIDEO_BUCKET, c.account_id, c.ad_id, freshUrl, "video");
          if (storageUrl) {
            await supabase.from("creatives").update({ video_url: storageUrl }).eq("ad_id", c.ad_id);
            return true;
          }
          return false;
        })
      );
      videoCached += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
      videoFailed += results.filter((r: any) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;

      if (logId) {
        await updateLog(supabase, logId, {
          videos_cached: videosFetched + videoCached,
          videos_failed: videosMarkedNA + videoFailed,
        });
      }

      if (isOverBudget(invocationStart)) {
        console.log(`Time budget reached during video caching. Processed ${videoCached + videoFailed}/${videos.length}`);
        break;
      }
      if (i + VIDEO_BATCH_SIZE < videos.length) await new Promise(r => setTimeout(r, 500));
    }

    const totalVideosCached = videosFetched + videoCached;
    const totalVideosFailed = videosMarkedNA + videoFailed;

    // Phase 4: Backfill preview_url for iframe embeds
    let previewsFetched = 0;
    if (previews.length > 0) {
      console.log(`Phase 4: Fetching preview_url for ${previews.length} ads...`);
      for (let i = 0; i < previews.length; i += BATCH_SIZE) {
        const batch = previews.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (c: any) => {
            const previewUrl = await getFreshPreviewUrl(c.ad_id);
            if (previewUrl) {
              await supabase.from("creatives").update({ preview_url: previewUrl }).eq("ad_id", c.ad_id);
              return true;
            }
            return false;
          })
        );
        previewsFetched += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
        if (i + BATCH_SIZE < previews.length) await new Promise(r => setTimeout(r, 300));
      }
      console.log(`  Preview URLs fetched: ${previewsFetched}/${previews.length}`);
    }

    const startTime = logRow ? new Date(logRow.started_at || Date.now()).getTime() : Date.now();
    const durationMs = Date.now() - startTime;

    // Finalize log
    if (logId) {
      await updateLog(supabase, logId, {
        status: "completed",
        current_phase: 3,
        thumbs_cached: thumbCached,
        thumbs_failed: thumbFailed,
        videos_cached: totalVideosCached,
        videos_failed: totalVideosFailed,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      });
    }

    console.log(`Done — Thumbs: ${thumbCached} cached, ${thumbFailed} failed | Videos fetched: ${videosFetched}, marked N/A: ${videosMarkedNA}, cached: ${videoCached}, failed: ${videoFailed} | Previews: ${previewsFetched}`);

    return new Response(JSON.stringify({
      thumbnails: { cached: thumbCached, failed: thumbFailed, total: thumbs.length },
      videos: { fetched: videosFetched, markedNA: videosMarkedNA, cached: videoCached, failed: videoFailed, total: videos.length + noVideos.length },
      previews: { fetched: previewsFetched, total: previews.length },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Refresh media error:", e);
    // Try to mark any running log as failed
    try {
      const { data: runningLogs } = await supabase
        .from("media_refresh_logs")
        .select("id")
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1);
      if (runningLogs?.[0]) {
        await supabase.from("media_refresh_logs").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          api_errors: JSON.stringify([String(e)]),
        }).eq("id", runningLogs[0].id);
      }
    } catch { /* best effort */ }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
