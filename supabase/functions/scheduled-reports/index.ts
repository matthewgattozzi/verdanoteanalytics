import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    hookRate: Number(c.thumb_stop_rate) || 0, holdRate: Number(c.hold_rate) || 0,
    ctr: Number(c.ctr) || 0, spend: Number(c.spend) || 0,
    adType: (c.ad_type || "").toLowerCase(), adName: (c.ad_name || "").toLowerCase(),
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
    if (diag) { (counts as any)[`diag_${diag}`]++; counts.diag_total_diagnosed++; }
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
  const blocks: any[] = [
    { type: "header", text: { type: "plain_text", text: `📊 ${report.report_name}`, emoji: true } },
    { type: "section", fields: [
      { type: "mrkdwn", text: `*Creatives:* ${report.creative_count}` },
      { type: "mrkdwn", text: `*Total Spend:* ${fmt(report.total_spend, "$")}` },
      { type: "mrkdwn", text: `*Blended ROAS:* ${fmt(report.blended_roas, "", "x")}` },
      { type: "mrkdwn", text: `*Avg CPA:* ${fmt(report.average_cpa, "$")}` },
      { type: "mrkdwn", text: `*Avg CTR:* ${fmt(report.average_ctr, "", "%")}` },
      { type: "mrkdwn", text: `*Win Rate:* ${fmt(report.win_rate, "", "%")}` },
    ]},
  ];
  if (topList) blocks.push({ type: "section", fields: [{ type: "mrkdwn", text: `*🏆 Top Performers:*\n${topList}` }] });
  if (diagItems.length > 0) blocks.push({ type: "section", fields: [{ type: "mrkdwn", text: `*⚠️ Diagnostics (${report.diag_total_diagnosed}):*\n${diagItems.join(" · ")}` }] });
  try { await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks }) }); }
  catch (e) { console.error("Slack webhook error:", e); }
}

function resolveTemplate(template: string, accountName: string, cadence: string): string {
  const now = new Date();
  return template
    .replace(/\{account\}/gi, accountName)
    .replace(/\{cadence\}/gi, cadence.charAt(0).toUpperCase() + cadence.slice(1))
    .replace(/\{date\}/gi, now.toLocaleDateString("en-US"));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
    const dayOfMonth = now.getUTCDate();

    // Fetch enabled schedules with account info
    const { data: schedules, error: schedErr } = await supabase
      .from("report_schedules")
      .select("*, ad_accounts!inner(id, name, is_active)")
      .eq("enabled", true);

    if (schedErr) throw schedErr;

    const generated: string[] = [];

    for (const schedule of schedules || []) {
      const account = (schedule as any).ad_accounts;
      if (!account?.is_active) continue;

      let shouldGenerate = false;

      if (schedule.cadence === "weekly" && dayOfWeek === 1) {
        shouldGenerate = true;
      } else if (schedule.cadence === "monthly" && dayOfMonth === 1) {
        shouldGenerate = true;
      }

      if (!shouldGenerate) continue;

      // Fetch creatives within date range
      const dateRangeDays = schedule.date_range_days || (schedule.cadence === "weekly" ? 7 : 30);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - dateRangeDays);

      const { data: creatives, error: fetchErr } = await supabase
        .from("creatives")
        .select("*")
        .eq("account_id", account.id);
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

      const reportName = resolveTemplate(
        schedule.report_name_template || `{cadence} Report - {account}`,
        account.name,
        schedule.cadence
      );

      const report = {
        report_name: reportName,
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
        date_range_start: startDate.toISOString().split("T")[0],
        date_range_end: now.toISOString().split("T")[0],
        date_range_days: dateRangeDays,
        ...computeDiagnostics(withSpend),
      };

      // Save to app if enabled
      let savedReport: any = null;
      if (schedule.deliver_to_app) {
        const { data, error: insertErr } = await supabase.from("reports").insert(report).select().single();
        if (insertErr) { console.error("Insert error for", account.id, insertErr); continue; }
        savedReport = data;
      }

      // Send to Slack if enabled
      if (schedule.deliver_to_slack) {
        await sendReportToSlack(savedReport || report);
      }

      generated.push(`${account.id}:${schedule.cadence}`);
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
