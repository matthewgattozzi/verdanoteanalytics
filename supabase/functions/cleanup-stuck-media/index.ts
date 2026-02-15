import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: stuck } = await supabase
    .from("media_refresh_logs")
    .select("id, started_at")
    .eq("status", "running")
    .lt("started_at", fifteenMinAgo);

  if (!stuck?.length) {
    return new Response(JSON.stringify({ cleaned: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("media_refresh_logs")
    .update({
      status: "failed",
      api_errors: JSON.stringify([{ timestamp: now, message: "Media refresh timed out (auto-cleanup after 15min)" }]),
      completed_at: now,
    })
    .in("id", stuck.map((s: any) => s.id));

  console.log(`Cleaned up ${stuck.length} stuck media refresh(es)`);

  return new Response(JSON.stringify({ cleaned: stuck.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
