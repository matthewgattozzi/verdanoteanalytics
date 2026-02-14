import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMutationWithToast } from "./useMutationWithToast";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => apiFetch("settings") });
}

export function useSaveSettings() {
  return useMutationWithToast({
    mutationFn: (settings: Record<string, string>) =>
      apiFetch("settings", "", { method: "PUT", body: JSON.stringify(settings) }),
    invalidateKeys: [["settings"]],
    successMessage: "Settings saved",
    errorMessage: "Error saving settings",
  });
}

export function useTestMeta() {
  return useMutation({
    mutationFn: (token?: string) =>
      apiFetch("settings", "test-meta", { method: "POST", body: JSON.stringify({ token }) }),
  });
}

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: () => apiFetch("accounts") });
}

export function useAddAccount() {
  return useMutationWithToast({
    mutationFn: (account: { id: string; name: string }) =>
      apiFetch("accounts", "", { method: "POST", body: JSON.stringify(account) }),
    invalidateKeys: [["accounts"]],
    successMessage: "Account added",
    errorMessage: "Error adding account",
  });
}

export function useToggleAccount() {
  return useMutationWithToast({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch("accounts", id, { method: "PUT", body: JSON.stringify({ is_active }) }),
    invalidateKeys: [["accounts"]],
  });
}

export function useRenameAccount() {
  return useMutationWithToast({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("ad_accounts").update({ name }).eq("id", id);
      if (error) throw error;
    },
    invalidateKeys: [["accounts"]],
    successMessage: "Account renamed",
    errorMessage: "Error renaming account",
  });
}

export function useUpdateAccountSettings() {
  return useMutationWithToast({
    mutationFn: ({ id, ...settings }: { id: string; date_range_days?: number; winner_roas_threshold?: number; iteration_spend_threshold?: number; winner_kpi?: string; winner_kpi_direction?: string; winner_kpi_threshold?: number; scale_threshold?: number; kill_threshold?: number; company_description?: string | null; primary_kpi?: string | null; secondary_kpis?: string | null; company_pdf_url?: string | null; creative_analysis_prompt?: string | null; insights_prompt?: string | null; report_schedule?: string }) =>
      apiFetch("accounts", id, { method: "PUT", body: JSON.stringify(settings) }),
    invalidateKeys: [["accounts"]],
    successMessage: "Account settings saved",
    errorMessage: "Error saving account settings",
  });
}

export function useDeleteAccount() {
  return useMutationWithToast({
    mutationFn: (id: string) => apiFetch("accounts", id, { method: "DELETE" }),
    invalidateKeys: [["accounts"]],
    successMessage: "Account removed",
    errorMessage: "Error removing account",
  });
}

export function useUploadMappings() {
  return useMutationWithToast({
    mutationFn: ({ accountId, mappings }: { accountId: string; mappings: any[] }) =>
      apiFetch("accounts", `${accountId}/name-mappings`, { method: "POST", body: JSON.stringify({ mappings }) }),
    invalidateKeys: [["accounts"]],
    successMessage: "Mappings uploaded",
    successDescription: (data: any) => `Matched ${data.matched} creatives, ${data.unmatchedCodes} codes pending.`,
    errorMessage: "Upload error",
  });
}

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
      return logs?.some((l: any) => l.status === "running") ? 2000 : false;
    },
  });
}

export function useReports() {
  return useQuery({ queryKey: ["reports"], queryFn: () => apiFetch("reports") });
}

export function useGenerateReport() {
  return useMutationWithToast({
    mutationFn: (params: { report_name: string; account_id?: string; date_start?: string; date_end?: string }) =>
      apiFetch("reports", "", { method: "POST", body: JSON.stringify(params) }),
    invalidateKeys: [["reports"]],
    successMessage: "Report generated",
    errorMessage: "Error generating report",
  });
}

export function useDeleteReport() {
  return useMutationWithToast({
    mutationFn: (id: string) => apiFetch("reports", id, { method: "DELETE" }),
    invalidateKeys: [["reports"]],
    successMessage: "Report deleted",
    errorMessage: "Error deleting report",
  });
}

export function useSendReportToSlack() {
  return useMutationWithToast({
    mutationFn: (id: string) => apiFetch("reports", `slack/${id}`, { method: "POST" }),
    successMessage: "Report sent to Slack",
    errorMessage: "Error sending to Slack",
  });
}

// Report schedules hooks
export function useReportSchedules() {
  return useQuery({
    queryKey: ["report-schedules"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.from("report_schedules").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertReportSchedule() {
  return useMutationWithToast({
    mutationFn: async (schedule: {
      account_id: string; cadence: string; enabled: boolean;
      report_name_template?: string; date_range_days?: number;
      deliver_to_app?: boolean; deliver_to_slack?: boolean;
    }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("report_schedules")
        .upsert(schedule, { onConflict: "account_id,cadence" })
        .select().single();
      if (error) throw error;
      return data;
    },
    invalidateKeys: [["report-schedules"]],
    successMessage: "Schedule updated",
    errorMessage: "Error updating schedule",
  });
}

// User management hooks
export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => apiFetch("user-management") });
}

export function useCreateUser() {
  return useMutationWithToast({
    mutationFn: (user: { email: string; password: string; role: string; display_name?: string; account_ids?: string[] }) =>
      apiFetch("user-management", "", { method: "POST", body: JSON.stringify(user) }),
    invalidateKeys: [["users"]],
    successMessage: "User created",
    errorMessage: "Error creating user",
  });
}

export function useUpdateUser() {
  return useMutationWithToast({
    mutationFn: ({ userId, ...data }: { userId: string; role?: string; account_ids?: string[]; display_name?: string }) =>
      apiFetch("user-management", userId, { method: "PUT", body: JSON.stringify(data) }),
    invalidateKeys: [["users"]],
    successMessage: "User updated",
    errorMessage: "Error updating user",
  });
}

export function useDeleteUser() {
  return useMutationWithToast({
    mutationFn: (userId: string) => apiFetch("user-management", userId, { method: "DELETE" }),
    invalidateKeys: [["users"]],
    successMessage: "User deleted",
    errorMessage: "Error deleting user",
  });
}
