import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function spendWeightedPercentile(items: { value: number; spend: number }[], pct: number): number {
  if (!items.length) return 0;
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, i) => s + i.spend, 0);
  if (total === 0) return sorted[Math.floor(sorted.length / 2)].value;
  const target = total * (pct / 100);
  let cum = 0;
  for (const item of sorted) { cum += item.spend; if (cum >= target) return item.value; }
  return sorted[sorted.length - 1].value;
}

function computeDiagnostics(creatives: any[]) {
  const items = creatives.map((c: any) => ({
    hookRate: Number(c.thumb_stop_rate) || 0,
    holdRate: Number(c.hold_rate) || 0,
    ctr: Number(c.ctr) || 0,
    spend: Number(c.spend) || 0,
    adType: (c.ad_type || "").toLowerCase(),
    adName: (c.ad_name || "").toLowerCase(),
  }));
  const hookItems = items.map(i => ({ value: i.hookRate, spend: i.spend }));
  const holdItems = items.map(i => ({ value: i.holdRate, spend: i.spend }));
  const ctrItems = items.map(i => ({ value: i.ctr, spend: i.spend }));
  const p25h = spendWeightedPercentile(hookItems, 25), p75h = spendWeightedPercentile(hookItems, 75);
  const p25d = spendWeightedPercentile(holdItems, 25), p75d = spendWeightedPercentile(holdItems, 75);
  const p25c = spendWeightedPercentile(ctrItems, 25), p75c = spendWeightedPercentile(ctrItems, 75);
  const level = (v: number, lo: number, hi: number) => v >= hi ? "strong" : v <= lo ? "weak" : "average";

  const counts = { diag_weak_hook: 0, diag_weak_body: 0, diag_weak_cta: 0, diag_weak_hook_body: 0, diag_landing_page: 0, diag_all_weak: 0, diag_weak_cta_image: 0, diag_total_diagnosed: 0 };

  for (const i of items) {
    const isImage = i.adType === "image" || i.adType === "carousel" || i.adType === "static" || i.adName.includes("static") || (i.adType !== "video" && i.hookRate === 0 && i.holdRate === 0);
    const hk = isImage ? "average" : level(i.hookRate, p25h, p75h);
    const hd = isImage ? "average" : level(i.holdRate, p25d, p75d);
    const ct = level(i.ctr, p25c, p75c);
    let diag = "";
    if (isImage) { if (ct === "weak") diag = "weak_cta_image"; }
    else {
      if (hk === "weak" && hd === "weak" && ct === "weak") diag = "all_weak";
      else if (hk === "weak" && hd === "weak") diag = "weak_hook_body";
      else if (hk === "strong" && hd === "strong" && ct === "weak") diag = "landing_page";
      else if (hk === "weak") diag = "weak_hook";
      else if (hd === "weak") diag = "weak_body";
      else if (ct === "weak") diag = "weak_cta";
    }
    if (diag) {
      (counts as any)[`diag_${diag}`]++;
      counts.diag_total_diagnosed++;
    }
  }
  return counts;
}

async function sendReportToSlack(report: any) {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return;

  const fmt = (v: number | null, pre = "", suf = "") =>
    v === null || v === undefined ? "—" : `${pre}${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suf}`;

  const diagItems = [
    report.diag_weak_hook && `Weak Hook: ${report.diag_weak_hook}`,
    report.diag_weak_body && `Weak Body: ${report.diag_weak_body}`,
    report.diag_weak_cta && `Weak CTA: ${report.diag_weak_cta}`,
    report.diag_weak_hook_body && `Weak Hook+Body: ${report.diag_weak_hook_body}`,
    report.diag_landing_page && `Landing Page: ${report.diag_landing_page}`,
    report.diag_all_weak && `Full Rebuild: ${report.diag_all_weak}`,
    report.diag_weak_cta_image && `Weak CTR (Image): ${report.diag_weak_cta_image}`,
  ].filter(Boolean);

  const topPerformers = (() => { try { return JSON.parse(report.top_performers || "[]"); } catch { return []; } })();
  const topList = topPerformers.slice(0, 3).map((p: any, i: number) =>
    `${i + 1}. ${p.ad_name} — ${fmt(p.roas, "", "x")} ROAS, ${fmt(p.spend, "$")} spent`
  ).join("\n");

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 ${report.report_name}`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Creatives:* ${report.creative_count}` },
        { type: "mrkdwn", text: `*Total Spend:* ${fmt(report.total_spend, "$")}` },
        { type: "mrkdwn", text: `*Blended ROAS:* ${fmt(report.blended_roas, "", "x")}` },
        { type: "mrkdwn", text: `*Avg CPA:* ${fmt(report.average_cpa, "$")}` },
        { type: "mrkdwn", text: `*Avg CTR:* ${fmt(report.average_ctr, "", "%")}` },
        { type: "mrkdwn", text: `*Win Rate:* ${fmt(report.win_rate, "", "%")}` },
      ],
    },
  ];

  if (topList) {
    blocks.push({
      type: "section",
      fields: [{ type: "mrkdwn", text: `*🏆 Top Performers:*\n${topList}` }],
    } as any);
  }

  if (diagItems.length > 0) {
    blocks.push({
      type: "section",
      fields: [{ type: "mrkdwn", text: `*⚠️ Iteration Diagnostics (${report.diag_total_diagnosed} ads):*\n${diagItems.join(" · ")}` }],
    } as any);
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch (e) {
    console.error("Slack webhook error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Auth: require builder or employee role
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
  if (!userRole || !["builder", "employee"].includes(userRole.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

      // Fetch creatives that had delivery (spend > 0)
      let query = supabase.from("creatives").select("*").gt("spend", 0);
      if (account_id) query = query.eq("account_id", account_id);
      const { data: creatives, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const list = creatives || [];
      const withSpend = list;

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
      const topPerformers = sorted.slice(0, 5).map(mapPerformer);
      const bottomPerformers = sorted.slice(-5).reverse().map(mapPerformer);

      const dates = list.map((c: any) => c.created_at).sort();
      const dateStart = dates[0]?.split("T")[0] || null;
      const dateEnd = dates[dates.length - 1]?.split("T")[0] || null;
      const days = dateStart && dateEnd
        ? Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 86400000) + 1
        : null;

      // Iteration diagnostics
      const diagCounts = computeDiagnostics(withSpend);

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
        ...diagCounts,
      };

      const { data, error } = await supabase.from("reports").insert(report).select().single();
      if (error) throw error;

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /reports/slack/:id — send existing report to Slack
    if (req.method === "POST" && path.startsWith("slack/")) {
      const reportId = path.replace("slack/", "");
      const { data: r, error } = await supabase.from("reports").select("*").eq("id", reportId).single();
      if (error || !r) {
        return new Response(JSON.stringify({ error: "Report not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await sendReportToSlack(r);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
