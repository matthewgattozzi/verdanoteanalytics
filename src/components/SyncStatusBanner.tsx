import { useIsSyncing } from "@/hooks/useIsSyncing";
import { useSyncHistory, useCancelSync } from "@/hooks/useSyncApi";
import { useAccounts } from "@/hooks/useAccountsApi";
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

  const runningLog = (logs || []).find((l: any) => l.status === "running") || (logs || []).find((l: any) => l.status === "queued");

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
  const currentPhase = runningLog?.current_phase ?? 0;
  const isQueued = runningLog?.status === "queued";
  const queuedCount = (logs || []).filter((l: any) => l.status === "queued").length;

  const phaseLabels: Record<number, string> = {
    1: "Fetching ads",
    2: "Loading insights",
    3: "Saving creatives",
    4: "Daily metrics",
    5: "Tagging",
    6: "Finalizing",
  };
  const phaseLabel = isQueued ? "Queued" : (phaseLabels[currentPhase] || "Starting");

  // Phase-based progress: 6 phases, each ~16.7%
  const hasMetrics = fetched > 0 || upserted > 0;
  const phaseProgress = Math.max(5, ((currentPhase - 1) / 6) * 100);
  const progressPercent = hasMetrics
    ? Math.min(95, phaseProgress + (upserted / Math.max(fetched, 1)) * (100 / 6))
    : Math.min(90, phaseProgress);

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
            Syncing {accountName} — <span className="text-primary">{phaseLabel}</span>
            {queuedCount > 0 && !isQueued && <span className="text-muted-foreground"> (+{queuedCount} queued)</span>}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeStr}
            </span>
            <span className="font-mono text-[10px]">Phase {currentPhase}/6</span>
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
