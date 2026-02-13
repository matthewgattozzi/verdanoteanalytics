import { useSyncHistory } from "@/hooks/useApi";

/** Returns true when any sync is currently running (across all accounts). */
export function useIsSyncing() {
  const { data: logs } = useSyncHistory();
  return (logs || []).some((l: any) => l.status === "running");
}
