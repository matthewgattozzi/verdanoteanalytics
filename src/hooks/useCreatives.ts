import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

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
      toast({ title: "Tags updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error updating tags", description: e.message, variant: "destructive" });
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
      toast({ title: "Creatives marked as untagged" });
    },
  });
}
