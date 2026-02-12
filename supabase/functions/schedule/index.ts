import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNC_JOB_NAME = "daily-meta-sync-6am-est";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth: require builder role
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
  if (!userRole || userRole.role !== "builder") {
    return new Response(JSON.stringify({ error: "Forbidden: builder only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // GET — fetch current schedule
    if (req.method === "GET") {
      const { data, error } = await supabase.rpc("get_cron_jobs");
      
      if (error) {
        const { data: settingRow } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "sync_schedule")
          .single();

        const schedule = settingRow?.value ? JSON.parse(settingRow.value) : {
          enabled: true,
          time_utc: "11:00",
          cron_expression: "0 11 * * *",
          description: "Daily at 6:00 AM EST",
        };

        return new Response(JSON.stringify(schedule), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT — update schedule
    if (req.method === "PUT") {
      const body = await req.json();
      const { enabled, hour_utc } = body;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const syncUrl = `${supabaseUrl}/functions/v1/sync`;

      try {
        await supabase.rpc("unschedule_cron_job", { job_name: SYNC_JOB_NAME });
      } catch {
        // Job might not exist
      }

      if (enabled) {
        const cronExpr = `0 ${hour_utc} * * *`;
        
        const { error: scheduleErr } = await supabase.rpc("schedule_cron_job", {
          job_name: SYNC_JOB_NAME,
          cron_expr: cronExpr,
          sync_url: syncUrl,
          anon_key: anonKey,
        });

        if (scheduleErr) {
          console.error("Schedule error:", scheduleErr);
        }

        const estHour = ((hour_utc - 5) + 24) % 24;
        const schedule = {
          enabled: true,
          time_utc: `${String(hour_utc).padStart(2, "0")}:00`,
          hour_utc,
          cron_expression: cronExpr,
          description: `Daily at ${estHour > 12 ? estHour - 12 : estHour || 12}:00 ${estHour >= 12 ? "PM" : "AM"} EST`,
        };

        await supabase.from("settings").upsert({
          key: "sync_schedule",
          value: JSON.stringify(schedule),
        }, { onConflict: "key" });

        return new Response(JSON.stringify(schedule), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const schedule = {
          enabled: false,
          time_utc: null,
          hour_utc: null,
          cron_expression: null,
          description: "Disabled",
        };

        await supabase.from("settings").upsert({
          key: "sync_schedule",
          value: JSON.stringify(schedule),
        }, { onConflict: "key" });

        return new Response(JSON.stringify(schedule), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Schedule error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
