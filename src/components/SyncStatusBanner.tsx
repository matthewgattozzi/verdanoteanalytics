import { useIsSyncing } from "@/hooks/useIsSyncing";
import { useSyncHistory } from "@/hooks/useApi";
import { Loader2, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function SyncStatusBanner() {
  const isSyncing = useIsSyncing();
  const { data: logs } = useSyncHistory();
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
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const accountId = runningLog?.account_id || "";
  const fetched = runningLog?.creatives_fetched ?? 0;
  const upserted = runningLog?.creatives_upserted ?? 0;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-4 flex items-center gap-3 animate-fade-in">
      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Sync in progress…
        </p>
        <p className="text-xs text-muted-foreground">
          {fetched > 0 && <span>{fetched} fetched · {upserted} upserted · </span>}
          <Clock className="inline h-3 w-3 -mt-0.5 mr-0.5" />
          {timeStr}
        </p>
      </div>
    </div>
  );
}
