import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMutationWithToast } from "./useMutationWithToast";

export function useSync() {
  return useMutationWithToast({
    mutationFn: (params: { account_id?: string; sync_type?: string }) =>
      apiFetch("sync", "", { method: "POST", body: JSON.stringify(params) }),
    invalidateKeys: [["accounts"], ["creatives"], ["all-creatives"], ["daily-trends"], ["sync-history"]],
    successMessage: "Sync started",
    errorMessage: "Sync failed",
  });
}

export function useCancelSync() {
  return useMutationWithToast({
    mutationFn: () => apiFetch("sync", "cancel", { method: "POST" }),
    invalidateKeys: [["sync-history"]],
    successMessage: "Sync cancelled",
    errorMessage: "Failed to cancel sync",
  });
}

export function useSyncHistory(accountId?: string) {
  return useQuery({
    queryKey: ["sync-history", accountId],
    queryFn: () => apiFetch("sync", `history${accountId ? `?account_id=${accountId}` : ""}`),
    refetchInterval: (query) => {
      const logs = query.state.data as any[] | undefined;
      return logs?.some((l: any) => l.status === "running" || l.status === "queued") ? 2000 : false;
    },
  });
}
