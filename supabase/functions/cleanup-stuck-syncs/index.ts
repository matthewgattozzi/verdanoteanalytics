import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: stuck } = await supabase
    .from("sync_logs")
    .select("id")
    .eq("status", "running")
    .lt("started_at", tenMinAgo);

  if (!stuck?.length) {
    return new Response(JSON.stringify({ cleaned: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("sync_logs")
    .update({
      status: "failed",
      api_errors: JSON.stringify([{ timestamp: now, message: "Sync timed out (auto-cleanup)" }]),
      completed_at: now,
    })
    .in("id", stuck.map((s: any) => s.id));

  console.log(`Cleaned up ${stuck.length} stuck sync(s)`);

  return new Response(JSON.stringify({ cleaned: stuck.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
