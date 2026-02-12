import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch("settings"),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, string>) =>
      apiFetch("settings", "", { method: "PUT", body: JSON.stringify(settings) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: Error) => {
      toast({ title: "Error saving settings", description: e.message, variant: "destructive" });
    },
  });
}

export function useTestMeta() {
  return useMutation({
    mutationFn: (token?: string) =>
      apiFetch("settings", "test-meta", { method: "POST", body: JSON.stringify({ token }) }),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch("accounts"),
  });
}

export function useAddAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (account: { id: string; name: string }) =>
      apiFetch("accounts", "", { method: "POST", body: JSON.stringify(account) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast({ title: "Account added" });
    },
    onError: (e: Error) => {
      toast({ title: "Error adding account", description: e.message, variant: "destructive" });
    },
  });
}

export function useToggleAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch("accounts", id, { method: "PUT", body: JSON.stringify({ is_active }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch("accounts", id, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast({ title: "Account removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Error removing account", description: e.message, variant: "destructive" });
    },
  });
}

export function useUploadMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, mappings }: { accountId: string; mappings: any[] }) =>
      apiFetch("accounts", `${accountId}/name-mappings`, { method: "POST", body: JSON.stringify({ mappings }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast({ title: "Mappings uploaded", description: `Matched ${data.matched} creatives, ${data.unmatchedCodes} codes pending.` });
    },
    onError: (e: Error) => {
      toast({ title: "Upload error", description: e.message, variant: "destructive" });
    },
  });
}

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { account_id?: string; sync_type?: string }) =>
      apiFetch("sync", "", { method: "POST", body: JSON.stringify(params) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["creatives"] });
      toast({ title: "Sync completed" });
    },
    onError: (e: Error) => {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useSyncHistory(accountId?: string) {
  return useQuery({
    queryKey: ["sync-history", accountId],
    queryFn: () => apiFetch("sync", `history${accountId ? `?account_id=${accountId}` : ""}`),
  });
}
