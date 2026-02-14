import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const now = new Date().toISOString();

  const { data: candidates } = await supabase
    .from("sync_logs")
    .select("id, sync_state")
    .eq("status", "running")
    .lt("started_at", tenMinAgo);

  if (!candidates?.length) {
    return new Response(JSON.stringify({ cleaned: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only mark as stuck if there's been no activity in the last 5 minutes
  // (the continuation cron updates last_activity on every invocation)
  const trulyStuck = candidates.filter((s: any) => {
    const lastActivity = s.sync_state?.last_activity;
    if (lastActivity && new Date(lastActivity).getTime() > fiveMinAgo) return false;
    return true;
  });

  if (!trulyStuck.length) {
    return new Response(JSON.stringify({ cleaned: 0, skipped: candidates.length }), {
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
    .in("id", trulyStuck.map((s: any) => s.id));

  console.log(`Cleaned up ${trulyStuck.length} stuck sync(s), skipped ${candidates.length - trulyStuck.length} active`);

  return new Response(JSON.stringify({ cleaned: trulyStuck.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
