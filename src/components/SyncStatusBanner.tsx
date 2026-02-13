import { useIsSyncing } from "@/hooks/useIsSyncing";
import { useSyncHistory, useAccounts, useCancelSync } from "@/hooks/useApi";
import { Loader2, Clock, X, Download, UploadCloud } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function SyncStatusBanner() {
  const isSyncing = useIsSyncing();
  const { data: logs } = useSyncHistory();
  const { data: accounts } = useAccounts();
  const cancelSync = useCancelSync();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const runningLog = (logs || []).find((l: any) => l.status === "running");

  useEffect(() => {
    if (isSyncing && runningLog) {
      const start = new Date(runningLog.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => clearInterval(intervalRef.current);
    } else {
      setElapsed(0);
    }
  }, [isSyncing, runningLog?.id]);

  if (!isSyncing) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${String(secs).padStart(2, "0")}s` : `${secs}s`;

  const accountId = runningLog?.account_id || "";
  const accountName = (accounts || []).find((a: any) => a.id === accountId)?.name || accountId;
  const fetched = runningLog?.creatives_fetched ?? 0;
  const upserted = runningLog?.creatives_upserted ?? 0;

  // Animated progress — pulse between 15% and 85% based on elapsed time
  // If we have fetched/upserted data, show a more meaningful bar
  const hasMetrics = fetched > 0 || upserted > 0;
  const progressPercent = hasMetrics
    ? Math.min(90, Math.max(10, (upserted / Math.max(fetched, 1)) * 80 + 10))
    : Math.min(80, 5 + elapsed * 0.8);

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg mb-4 overflow-hidden animate-fade-in">
      {/* Progress bar */}
      <div className="h-1 bg-primary/10 w-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-out relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        </div>
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Syncing {accountName}…
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeStr}
            </span>
            {fetched > 0 && (
              <span className="inline-flex items-center gap-1">
                <Download className="h-3 w-3" />
                {fetched} fetched
              </span>
            )}
            {upserted > 0 && (
              <span className="inline-flex items-center gap-1">
                <UploadCloud className="h-3 w-3" />
                {upserted} upserted
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          onClick={() => cancelSync.mutate()}
          disabled={cancelSync.isPending}
          title="Cancel sync"
        >
          {cancelSync.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          <span className="ml-1 text-xs">Cancel</span>
        </Button>
      </div>
    </div>
  );
}
