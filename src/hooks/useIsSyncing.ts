import { useEffect, useRef } from "react";
import { useSyncHistory } from "@/hooks/useSyncApi";
import { toast } from "sonner";

/** Returns true when any sync is currently running. Also toasts when a sync finishes. */
export function useIsSyncing() {
  const { data: logs } = useSyncHistory();
  const wasSyncing = useRef(false);

  const isSyncing = (logs || []).some((l: any) => l.status === "running" || l.status === "queued");

  useEffect(() => {
    if (wasSyncing.current && !isSyncing && logs?.length) {
      const latest = logs[0] as any;
      if (latest.status === "completed") {
        toast.success("Sync finished", {
          description: latest.creatives_upserted != null
            ? `${latest.creatives_upserted} creatives updated.`
            : undefined,
        });
      } else if (latest.status === "completed_with_errors") {
        toast.warning("Sync finished with errors", {
          description: latest.creatives_upserted != null
            ? `${latest.creatives_upserted} creatives updated. Some API errors occurred.`
            : "Some API errors occurred during sync.",
        });
      } else if (latest.status === "failed") {
        toast.error("Sync failed", {
          description: latest.api_errors || "Check sync history for details.",
        });
      } else if (latest.status === "cancelled") {
        toast.info("Sync cancelled");
      }
    }
    wasSyncing.current = isSyncing;
  }, [isSyncing, logs]);

  return isSyncing;
}
