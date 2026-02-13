import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const THUMB_BUCKET = "ad-thumbnails";
const VIDEO_BUCKET = "ad-videos";
const BATCH_SIZE = 20;
const VIDEO_BATCH_SIZE = 3;
const MAX_TOTAL = 200;

async function cacheMedia(
  supabase: any,
  bucket: string,
  accountId: string,
  adId: string,
  metaUrl: string,
  type: "image" | "video"
): Promise<string | null> {
  try {
    const resp = await fetch(metaUrl);
    if (!resp.ok) {
      console.log(`Download failed ${adId}: HTTP ${resp.status} ${resp.statusText}`);
      return null;
    }
    const blob = await resp.arrayBuffer();
    // Skip very large videos (>200MB)
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

async function processBatch(
  supabase: any,
  items: any[],
  bucket: string,
  urlField: string,
  type: "image" | "video",
  batchSize: number
) {
  let cached = 0, failed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (c: any) => {
        const storageUrl = await cacheMedia(supabase, bucket, c.account_id, c.ad_id, c[urlField], type);
        if (storageUrl) {
          await supabase.from("creatives").update({ [urlField]: storageUrl }).eq("ad_id", c.ad_id);
          return true;
        }
        return false;
      })
    );
    cached += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
    failed += results.filter((r: any) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
    if (i + batchSize < items.length) await new Promise(r => setTimeout(r, 300));
  }
  return { cached, failed };
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
      .limit(50); // fewer videos due to size

    const thumbs = uncachedThumbs || [];
    const videos = uncachedVideos || [];

    if (thumbs.length === 0 && videos.length === 0) {
      console.log("All media already cached.");
      return new Response(JSON.stringify({ thumbnails: { cached: 0, failed: 0, total: 0 }, videos: { cached: 0, failed: 0, total: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${thumbs.length} uncached thumbnails, ${videos.length} uncached videos`);

    const thumbResult = await processBatch(supabase, thumbs, THUMB_BUCKET, "thumbnail_url", "image", BATCH_SIZE);
    const videoResult = await processBatch(supabase, videos, VIDEO_BUCKET, "video_url", "video", VIDEO_BATCH_SIZE);

    console.log(`Done — Thumbs: ${thumbResult.cached} cached, ${thumbResult.failed} failed | Videos: ${videoResult.cached} cached, ${videoResult.failed} failed`);

    return new Response(JSON.stringify({
      thumbnails: { ...thumbResult, total: thumbs.length },
      videos: { ...videoResult, total: videos.length },
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
