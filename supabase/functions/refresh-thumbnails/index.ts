import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const BUCKET = "ad-thumbnails";
const BATCH_SIZE = 20;
const MAX_TOTAL = 200; // cap per invocation to stay within time limits

async function cacheThumbnail(
  supabase: any,
  accountId: string,
  adId: string,
  metaUrl: string
): Promise<string | null> {
  try {
    const resp = await fetch(metaUrl);
    if (!resp.ok) return null;
    const blob = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `${accountId}/${adId}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(blob), { contentType, upsert: true });
    if (error) {
      console.log(`Upload error ${adId}:`, error.message);
      return null;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  } catch (err) {
    console.log(`Cache error ${adId}:`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Find creatives with Meta CDN URLs (not yet cached to our storage)
    const { data: uncached, error } = await supabase
      .from("creatives")
      .select("ad_id, account_id, thumbnail_url")
      .not("thumbnail_url", "is", null)
      .not("thumbnail_url", "like", `%/storage/v1/object/public/%`)
      .limit(MAX_TOTAL);

    if (error) throw error;
    if (!uncached || uncached.length === 0) {
      console.log("All thumbnails already cached.");
      return new Response(JSON.stringify({ cached: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${uncached.length} uncached thumbnails`);

    let cached = 0;
    let failed = 0;

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (c: any) => {
          const storageUrl = await cacheThumbnail(supabase, c.account_id, c.ad_id, c.thumbnail_url);
          if (storageUrl) {
            await supabase.from("creatives").update({ thumbnail_url: storageUrl }).eq("ad_id", c.ad_id);
            return true;
          }
          return false;
        })
      );
      cached += results.filter((r: any) => r.status === "fulfilled" && r.value).length;
      failed += results.filter((r: any) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;

      if (i + BATCH_SIZE < uncached.length) await new Promise(r => setTimeout(r, 300));
    }

    console.log(`Done: ${cached} cached, ${failed} failed out of ${uncached.length}`);

    return new Response(JSON.stringify({ cached, failed, total: uncached.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Refresh thumbnails error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
