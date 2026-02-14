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
