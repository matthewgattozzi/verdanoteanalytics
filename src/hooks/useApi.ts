import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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
      toast.success("Settings saved");
    },
    onError: (e: Error) => {
      toast.error("Error saving settings", { description: e.message });
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
      toast.success("Account added");
    },
    onError: (e: Error) => {
      toast.error("Error adding account", { description: e.message });
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

export function useRenameAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("ad_accounts")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account renamed");
    },
    onError: (e: Error) => {
      toast.error("Error renaming account", { description: e.message });
    },
  });
}

export function useUpdateAccountSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...settings }: { id: string; date_range_days?: number; winner_roas_threshold?: number; iteration_spend_threshold?: number; winner_kpi?: string; winner_kpi_direction?: string; winner_kpi_threshold?: number; scale_threshold?: number; kill_threshold?: number; company_description?: string | null; primary_kpi?: string | null; secondary_kpis?: string | null; company_pdf_url?: string | null; creative_analysis_prompt?: string | null; insights_prompt?: string | null; report_schedule?: string }) =>
      apiFetch("accounts", id, { method: "PUT", body: JSON.stringify(settings) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account settings saved");
    },
    onError: (e: Error) => {
      toast.error("Error saving account settings", { description: e.message });
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
      toast.success("Account removed");
    },
    onError: (e: Error) => {
      toast.error("Error removing account", { description: e.message });
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
      toast.success("Mappings uploaded", { description: `Matched ${data.matched} creatives, ${data.unmatchedCodes} codes pending.` });
    },
    onError: (e: Error) => {
      toast.error("Upload error", { description: e.message });
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
      qc.invalidateQueries({ queryKey: ["all-creatives"] });
      qc.invalidateQueries({ queryKey: ["daily-trends"] });
      qc.invalidateQueries({ queryKey: ["sync-history"] });
      toast.success("Sync completed");
    },
    onError: (e: Error) => {
      toast.error("Sync failed", { description: e.message });
    },
  });
}

export function useSyncHistory(accountId?: string) {
  return useQuery({
    queryKey: ["sync-history", accountId],
    queryFn: () => apiFetch("sync", `history${accountId ? `?account_id=${accountId}` : ""}`),
    refetchInterval: (query) => {
      const logs = query.state.data as any[] | undefined;
      const hasRunning = logs?.some((l: any) => l.status === "running");
      return hasRunning ? 3000 : false;
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiFetch("reports"),
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { report_name: string; account_id?: string }) =>
      apiFetch("reports", "", { method: "POST", body: JSON.stringify(params) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report generated");
    },
    onError: (e: Error) => {
      toast.error("Error generating report", { description: e.message });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch("reports", id, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report deleted");
    },
    onError: (e: Error) => {
      toast.error("Error deleting report", { description: e.message });
    },
  });
}

export function useSendReportToSlack() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch("reports", `slack/${id}`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Report sent to Slack");
    },
    onError: (e: Error) => {
      toast.error("Error sending to Slack", { description: e.message });
    },
  });
}

// Report schedules hooks
export function useReportSchedules() {
  return useQuery({
    queryKey: ["report-schedules"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("report_schedules")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertReportSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: {
      account_id: string;
      cadence: string;
      enabled: boolean;
      report_name_template?: string;
      date_range_days?: number;
      deliver_to_app?: boolean;
      deliver_to_slack?: boolean;
    }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("report_schedules")
        .upsert(schedule, { onConflict: "account_id,cadence" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-schedules"] });
      toast.success("Schedule updated");
    },
    onError: (e: Error) => {
      toast.error("Error updating schedule", { description: e.message });
    },
  });
}

// User management hooks (builder only)
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("user-management"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: { email: string; password: string; role: string; display_name?: string; account_ids?: string[] }) =>
      apiFetch("user-management", "", { method: "POST", body: JSON.stringify(user) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    },
    onError: (e: Error) => {
      toast.error("Error creating user", { description: e.message });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: { userId: string; role?: string; account_ids?: string[]; display_name?: string }) =>
      apiFetch("user-management", userId, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: (e: Error) => {
      toast.error("Error updating user", { description: e.message });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch("user-management", userId, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: (e: Error) => {
      toast.error("Error deleting user", { description: e.message });
    },
  });
}

