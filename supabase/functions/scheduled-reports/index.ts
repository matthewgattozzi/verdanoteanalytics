import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
    const dayOfMonth = now.getUTCDate();

    // Fetch accounts with active schedules
    const { data: accounts, error: accErr } = await supabase
      .from("ad_accounts")
      .select("id, name, report_schedule, last_scheduled_report_at")
      .in("report_schedule", ["weekly", "monthly"])
      .eq("is_active", true);

    if (accErr) throw accErr;

    const generated: string[] = [];

    for (const account of accounts || []) {
      let shouldGenerate = false;

      if (account.report_schedule === "weekly" && dayOfWeek === 1) {
        // Weekly: generate on Mondays
        const last = account.last_scheduled_report_at ? new Date(account.last_scheduled_report_at) : null;
        if (!last || now.getTime() - last.getTime() > 5 * 24 * 60 * 60 * 1000) {
          shouldGenerate = true;
        }
      } else if (account.report_schedule === "monthly" && dayOfMonth === 1) {
        // Monthly: generate on 1st of month
        const last = account.last_scheduled_report_at ? new Date(account.last_scheduled_report_at) : null;
        if (!last || now.getTime() - last.getTime() > 25 * 24 * 60 * 60 * 1000) {
          shouldGenerate = true;
        }
      }

      if (!shouldGenerate) continue;

      // Generate the report (same logic as reports edge function)
      let query = supabase.from("creatives").select("*").eq("account_id", account.id);
      const { data: creatives, error: fetchErr } = await query;
      if (fetchErr) { console.error("Fetch error for", account.id, fetchErr); continue; }

      const list = creatives || [];
      const withSpend = list.filter((c: any) => (c.spend || 0) > 0);
      const totalSpend = withSpend.reduce((s: number, c: any) => s + Number(c.spend || 0), 0);
      const avgField = (field: string) => {
        if (withSpend.length === 0) return 0;
        return withSpend.reduce((s: number, c: any) => s + Number(c[field] || 0), 0) / withSpend.length;
      };

      const winners = withSpend.filter((c: any) => Number(c.roas || 0) > 1);
      const winRate = withSpend.length > 0 ? (winners.length / withSpend.length) * 100 : 0;

      const tagCounts = { parsed: 0, csv_match: 0, manual: 0, untagged: 0 };
      list.forEach((c: any) => {
        if (c.tag_source in tagCounts) tagCounts[c.tag_source as keyof typeof tagCounts]++;
      });

      const sorted = [...withSpend].sort((a: any, b: any) => Number(b.roas || 0) - Number(a.roas || 0));
      const mapPerformer = (c: any) => ({
        ad_id: c.ad_id, ad_name: c.ad_name, unique_code: c.unique_code,
        roas: c.roas, cpa: c.cpa, spend: c.spend, ctr: c.ctr,
      });

      const dates = list.map((c: any) => c.created_at).sort();
      const dateStart = dates[0]?.split("T")[0] || null;
      const dateEnd = dates[dates.length - 1]?.split("T")[0] || null;
      const days = dateStart && dateEnd
        ? Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 86400000) + 1
        : null;

      const scheduleLabel = account.report_schedule === "weekly" ? "Weekly" : "Monthly";
      const report = {
        report_name: `${scheduleLabel} Report – ${account.name} – ${now.toLocaleDateString("en-US")}`,
        account_id: account.id,
        creative_count: list.length,
        total_spend: Math.round(totalSpend * 100) / 100,
        blended_roas: Math.round(avgField("roas") * 100) / 100,
        average_cpa: Math.round(avgField("cpa") * 100) / 100,
        average_ctr: Math.round(avgField("ctr") * 100) / 100,
        win_rate: Math.round(winRate * 100) / 100,
        tags_parsed_count: tagCounts.parsed,
        tags_csv_count: tagCounts.csv_match,
        tags_manual_count: tagCounts.manual,
        tags_untagged_count: tagCounts.untagged,
        top_performers: JSON.stringify(sorted.slice(0, 5).map(mapPerformer)),
        bottom_performers: JSON.stringify(sorted.slice(-5).reverse().map(mapPerformer)),
        date_range_start: dateStart,
        date_range_end: dateEnd,
        date_range_days: days,
      };

      const { error: insertErr } = await supabase.from("reports").insert(report);
      if (insertErr) { console.error("Insert error for", account.id, insertErr); continue; }

      // Update last_scheduled_report_at
      await supabase.from("ad_accounts").update({ last_scheduled_report_at: now.toISOString() }).eq("id", account.id);
      generated.push(account.id);
    }

    return new Response(JSON.stringify({ generated, count: generated.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Scheduled reports error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
