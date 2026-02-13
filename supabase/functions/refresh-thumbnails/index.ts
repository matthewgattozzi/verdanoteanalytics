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
const VIDEO_BATCH_SIZE = 3;
const MAX_TOTAL = 200;

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

    // Priority 1: Use image_hash to get full-res from Ad Account Images API
    // Request url_128 (which despite the name is the full-res original URL)
    const imageHash = creative.image_hash ||
      creative.object_story_spec?.link_data?.image_hash ||
      creative.object_story_spec?.photo_data?.image_hash;
    if (imageHash) {
      const imgRes = await fetch(
        `https://graph.facebook.com/v21.0/${accountId}/adimages?hashes=["${imageHash}"]&fields=url,url_128,width,height,original_width,original_height&access_token=${META_ACCESS_TOKEN}`
      );
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const images = imgData?.data;
        if (images && images.length > 0) {
          // 'url' field is the actual full-resolution image
          const img = images[0];
          const fullUrl = img.url || img.url_128;
          const w = img.original_width || img.width || 0;
          console.log(`image_hash for ${adId}: ${w}px wide, url length: ${fullUrl?.length}`);
          if (fullUrl && fullUrl.length > 100) {
            return fullUrl;
          }
        }
      }
    }

    // Priority 2: For video ads, get thumbnail from video_id at high resolution
    const spec = creative.object_story_spec;
    const videoId = spec?.video_data?.video_id || spec?.template_data?.video_data?.video_id;
    if (videoId) {
      const vidRes = await fetch(
        `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails{uri,width,height}&access_token=${META_ACCESS_TOKEN}`
      );
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const thumbs = vidData?.thumbnails?.data;
        if (thumbs && thumbs.length > 0) {
          // Pick the largest thumbnail available
          const sorted = thumbs.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
          const best = sorted[0];
          if (best?.uri) {
            console.log(`Video thumbnail for ${adId}: ${best.width}x${best.height}`);
            return best.uri;
          }
        }
      }
      // Fallback: get video picture at specific width
      const picRes = await fetch(
        `https://graph.facebook.com/v21.0/${videoId}/picture?redirect=false&type=large&access_token=${META_ACCESS_TOKEN}`
      );
      if (picRes.ok) {
        const picData = await picRes.json();
        if (picData?.data?.url) {
          console.log(`Video picture fallback for ${adId}`);
          return picData.data.url;
        }
      }
    }

    // Priority 3: image_url from creative (can be full-res for image ads)
    if (creative.image_url) {
      console.log(`Using image_url for ${adId}`);
      return creative.image_url;
    }

    // Priority 4: image from object_story_spec
    if (spec) {
      const imageUrl = spec.link_data?.image_url || spec.photo_data?.url || spec.photo_data?.image_url;
      if (imageUrl) return imageUrl;
    }

    // Priority 5: thumbnail_url upscaled
    if (creative.thumbnail_url) {
      return creative.thumbnail_url.replace(/\/[sp]\d+x\d+\//, "/p1080x1080/");
    }

    return null;
  } catch (e) {
    console.log(`Meta API error for ${adId}:`, e);
    return null;
  }
}

/** Fetch a fresh video source URL from Meta Graph API */
async function getFreshVideoUrl(adId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${adId}?fields=creative{object_story_spec}&access_token=${META_ACCESS_TOKEN}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const spec = data?.creative?.object_story_spec;

    // Try video_data.video_url first (direct playback URL)
    if (spec?.video_data?.video_url) {
      return spec.video_data.video_url;
    }

    // Try to get video source from video_id
    const videoData = spec?.video_data || spec?.template_data?.video_data;
    if (videoData?.video_id) {
      const vidRes = await fetch(
        `https://graph.facebook.com/v21.0/${videoData.video_id}?fields=source&access_token=${META_ACCESS_TOKEN}`
      );
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        return vidData?.source || null;
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
    if (type === "video" && blob.byteLength > 200 * 1024 * 1024) return null;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("force") === "true";

    // Find uncached thumbnails (or ALL thumbnails if force refresh)
    let thumbQuery = supabase
      .from("creatives")
      .select("ad_id, account_id, thumbnail_url")
      .not("thumbnail_url", "is", null);

    if (!forceRefresh) {
      thumbQuery = thumbQuery.not("thumbnail_url", "like", `%/storage/v1/object/public/%`);
    }

    const { data: uncachedThumbs } = await thumbQuery.limit(MAX_TOTAL);

    // Find ads missing video_url (need to fetch from Meta API)
    const { data: missingVideos } = await supabase
      .from("creatives")
      .select("ad_id, account_id")
      .is("video_url", null)
      .limit(100);

    // Find uncached videos (have video_url but not in storage)
    const { data: uncachedVideos } = await supabase
      .from("creatives")
      .select("ad_id, account_id, video_url")
      .not("video_url", "is", null)
      .not("video_url", "like", `%/storage/v1/object/public/%`)
      .limit(50);

    const thumbs = uncachedThumbs || [];
    const noVideos = missingVideos || [];
    const videos = uncachedVideos || [];

    if (thumbs.length === 0 && videos.length === 0 && noVideos.length === 0) {
      console.log("All media already cached.");
      return new Response(JSON.stringify({ thumbnails: { cached: 0, failed: 0, total: 0 }, videos: { cached: 0, failed: 0, total: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${thumbs.length} thumbnails to process, ${noVideos.length} ads missing video_url, ${videos.length} uncached videos`);

    // Process thumbnails — fetch full-res images from Meta API
    let thumbCached = 0, thumbFailed = 0;
    for (let i = 0; i < thumbs.length; i += BATCH_SIZE) {
      const batch = thumbs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const freshUrl = await getFreshImageUrl(c.ad_id, c.account_id);
          if (!freshUrl) { return false; }
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
      if (i + BATCH_SIZE < thumbs.length) await new Promise(r => setTimeout(r, 300));
    }

    // Process ads missing video_url — try to fetch from Meta API
    let videosFetched = 0;
    for (let i = 0; i < noVideos.length; i += BATCH_SIZE) {
      const batch = noVideos.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const freshUrl = await getFreshVideoUrl(c.ad_id);
          if (!freshUrl) return false;
          // Cache directly to storage
          const storageUrl = await downloadAndCache(supabase, VIDEO_BUCKET, c.account_id, c.ad_id, freshUrl, "video");
          if (storageUrl) {
            await supabase.from("creatives").update({ video_url: storageUrl }).eq("ad_id", c.ad_id);
            return true;
          }
          // If caching failed, at least store the direct URL
          await supabase.from("creatives").update({ video_url: freshUrl }).eq("ad_id", c.ad_id);
          return true;
        })
      );
      videosFetched += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
      if (i + BATCH_SIZE < noVideos.length) await new Promise(r => setTimeout(r, 500));
    }

    // Process uncached videos — re-fetch fresh URLs from Meta API
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
      if (i + VIDEO_BATCH_SIZE < videos.length) await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Done — Thumbs: ${thumbCached} cached, ${thumbFailed} failed | Videos fetched: ${videosFetched}, cached: ${videoCached}, failed: ${videoFailed}`);

    return new Response(JSON.stringify({
      thumbnails: { cached: thumbCached, failed: thumbFailed, total: thumbs.length },
      videos: { fetched: videosFetched, cached: videoCached, failed: videoFailed, total: videos.length + noVideos.length },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Refresh media error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
