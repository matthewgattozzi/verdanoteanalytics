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

/** Fetch a fresh thumbnail URL from Meta Graph API */
async function getFreshThumbnailUrl(adId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${adId}?fields=creative{thumbnail_url}&access_token=${META_ACCESS_TOKEN}`
    );
    if (!res.ok) {
      console.log(`Meta API failed for ${adId}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const url = data?.creative?.thumbnail_url;
    if (url) {
      // Upscale to 1080x1080
      return url.replace(/\/[sp]\d+x\d+\//, "/p1080x1080/");
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
    // Find uncached thumbnails
    const { data: uncachedThumbs } = await supabase
      .from("creatives")
      .select("ad_id, account_id, thumbnail_url")
      .not("thumbnail_url", "is", null)
      .not("thumbnail_url", "like", `%/storage/v1/object/public/%`)
      .limit(MAX_TOTAL);

    // Find uncached videos
    const { data: uncachedVideos } = await supabase
      .from("creatives")
      .select("ad_id, account_id, video_url")
      .not("video_url", "is", null)
      .not("video_url", "like", `%/storage/v1/object/public/%`)
      .limit(50);

    const thumbs = uncachedThumbs || [];
    const videos = uncachedVideos || [];

    if (thumbs.length === 0 && videos.length === 0) {
      console.log("All media already cached.");
      return new Response(JSON.stringify({ thumbnails: { cached: 0, failed: 0, total: 0 }, videos: { cached: 0, failed: 0, total: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${thumbs.length} uncached thumbnails, ${videos.length} uncached videos`);

    // Process thumbnails — re-fetch fresh URLs from Meta API
    let thumbCached = 0, thumbFailed = 0;
    for (let i = 0; i < thumbs.length; i += BATCH_SIZE) {
      const batch = thumbs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const freshUrl = await getFreshThumbnailUrl(c.ad_id);
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

    // Process videos — re-fetch fresh URLs from Meta API
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

    console.log(`Done — Thumbs: ${thumbCached} cached, ${thumbFailed} failed | Videos: ${videoCached} cached, ${videoFailed} failed`);

    return new Response(JSON.stringify({
      thumbnails: { cached: thumbCached, failed: thumbFailed, total: thumbs.length },
      videos: { cached: videoCached, failed: videoFailed, total: videos.length },
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
