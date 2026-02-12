import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/reports\/?/, "").replace(/\/$/, "");

  try {
    // GET /reports — list all reports
    if (req.method === "GET" && !path) {
      const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /reports — generate a new report
    if (req.method === "POST" && !path) {
      const body = await req.json();
      const { report_name, account_id } = body;

      // Fetch creatives
      let query = supabase.from("creatives").select("*");
      if (account_id) query = query.eq("account_id", account_id);
      const { data: creatives, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const list = creatives || [];
      const withSpend = list.filter((c: any) => (c.spend || 0) > 0);

      const totalSpend = withSpend.reduce((s: number, c: any) => s + Number(c.spend || 0), 0);
      const avgField = (field: string) => {
        if (withSpend.length === 0) return 0;
        return withSpend.reduce((s: number, c: any) => s + Number(c[field] || 0), 0) / withSpend.length;
      };

      // Win rate: ROAS > 1 among those with spend
      const winners = withSpend.filter((c: any) => Number(c.roas || 0) > 1);
      const winRate = withSpend.length > 0 ? (winners.length / withSpend.length) * 100 : 0;

      // Tag source counts
      const tagCounts = { parsed: 0, csv_match: 0, manual: 0, untagged: 0 };
      list.forEach((c: any) => {
        if (c.tag_source in tagCounts) tagCounts[c.tag_source as keyof typeof tagCounts]++;
      });

      // Top/bottom performers by ROAS (top 5)
      const sorted = [...withSpend].sort((a: any, b: any) => Number(b.roas || 0) - Number(a.roas || 0));
      const mapPerformer = (c: any) => ({
        ad_id: c.ad_id, ad_name: c.ad_name, unique_code: c.unique_code,
        roas: c.roas, cpa: c.cpa, spend: c.spend, ctr: c.ctr,
      });
      const topPerformers = sorted.slice(0, 5).map(mapPerformer);
      const bottomPerformers = sorted.slice(-5).reverse().map(mapPerformer);

      // Date range from creatives
      const dates = list.map((c: any) => c.created_at).sort();
      const dateStart = dates[0]?.split("T")[0] || null;
      const dateEnd = dates[dates.length - 1]?.split("T")[0] || null;
      const days = dateStart && dateEnd
        ? Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 86400000) + 1
        : null;

      const report = {
        report_name: report_name || `Report ${new Date().toLocaleDateString()}`,
        account_id: account_id || null,
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
        top_performers: JSON.stringify(topPerformers),
        bottom_performers: JSON.stringify(bottomPerformers),
        date_range_start: dateStart,
        date_range_end: dateEnd,
        date_range_days: days,
      };

      const { data, error } = await supabase.from("reports").insert(report).select().single();
      if (error) throw error;

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE /reports/:id
    if (req.method === "DELETE" && path) {
      const { error } = await supabase.from("reports").delete().eq("id", path);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Reports error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
