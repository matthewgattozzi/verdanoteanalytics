import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export function useCreatives(filters: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  return useQuery({
    queryKey: ["creatives", qs],
    queryFn: () => apiFetch("creatives", qs ? `?${qs}` : ""),
  });
}

export function useCreativeFilters() {
  return useQuery({
    queryKey: ["creative-filters"],
    queryFn: () => apiFetch("creatives", "filters"),
  });
}

export function useUpdateCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ adId, updates }: { adId: string; updates: Record<string, any> }) =>
      apiFetch("creatives", adId, { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creatives"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Tags updated");
    },
    onError: (e: Error) => {
      toast.error("Error updating tags", { description: e.message });
    },
  });
}

export function useBulkUntag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (adIds: string[]) =>
      apiFetch("creatives", "bulk-untag", { method: "POST", body: JSON.stringify({ ad_ids: adIds }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creatives"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Creatives marked as untagged");
    },
  });
}

export function useAnalyzeCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (adId: string) =>
      apiFetch("analyze-creative", "", { method: "POST", body: JSON.stringify({ ad_id: adId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creatives"] });
      toast.success("AI analysis complete");
    },
    onError: (e: Error) => {
      toast.error("Analysis failed", { description: e.message });
    },
  });
}
