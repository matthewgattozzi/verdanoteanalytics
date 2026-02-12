import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 100;

export function useCreatives(filters: Record<string, string> = {}, page = 0) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(page * PAGE_SIZE));
  const qs = params.toString();
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ["creatives", qs],
    queryFn: async () => {
      const result = await apiFetch("creatives", qs ? `?${qs}` : "");
      // Handle both old format (array) and new format ({ data, total })
      if (Array.isArray(result)) {
        return { data: result, total: result.length };
      }
      return result;
    },
  });
}

export const CREATIVES_PAGE_SIZE = PAGE_SIZE;

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

export function useBulkAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (limit?: number) =>
      apiFetch("analyze-creative", "", { method: "POST", body: JSON.stringify({ bulk: true, limit: limit || 20 }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["creatives"] });
      toast.success(`Analyzed ${data.analyzed} creatives`, {
        description: data.errors > 0 ? `${data.errors} errors occurred` : undefined,
      });
    },
    onError: (e: Error) => {
      toast.error("Bulk analysis failed", { description: e.message });
    },
  });
}
