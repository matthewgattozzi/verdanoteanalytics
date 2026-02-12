export function determineFunnel(creative: any): "TOF" | "MOF" | "BOF" {
  const name = `${creative.campaign_name || ""} ${creative.adset_name || ""}`.toLowerCase();
  if (/tof|prospecting|awareness|top.?of.?funnel/.test(name)) return "TOF";
  if (/mof|retarget|middle.?of.?funnel|consideration/.test(name)) return "MOF";
  return "BOF";
}
