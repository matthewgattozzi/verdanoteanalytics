import { useIsRefreshingMedia, useMediaRefreshLogs } from "@/hooks/useMediaRefreshStatus";
import { useAccounts } from "@/hooks/useAccountsApi";
import { Loader2, Clock, Image } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function MediaRefreshBanner() {
  const isRefreshing = useIsRefreshingMedia();
  const { data: logs } = useMediaRefreshLogs();
  const { data: accounts } = useAccounts();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const runningLog = (logs || []).find((l: any) => l.status === "running");

  useEffect(() => {
    if (isRefreshing && runningLog) {
      const start = new Date(runningLog.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => clearInterval(intervalRef.current);
    } else {
      setElapsed(0);
    }
  }, [isRefreshing, runningLog?.id]);

  if (!isRefreshing || !runningLog) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${String(secs).padStart(2, "0")}s` : `${secs}s`;

  const accountId = runningLog.account_id || "";
  const accountName = accountId === "all"
    ? "All accounts"
    : (accounts || []).find((a: any) => a.id === accountId)?.name || accountId;

  const currentPhase = runningLog.current_phase ?? 0;
  const thumbsTotal = runningLog.thumbs_total ?? 0;
  const thumbsCached = runningLog.thumbs_cached ?? 0;
  const videosTotal = runningLog.videos_total ?? 0;
  const videosCached = runningLog.videos_cached ?? 0;

  const phaseLabels: Record<number, string> = {
    1: "Discovering media",
    2: "Caching thumbnails",
    3: "Caching videos",
  };
  const phaseLabel = phaseLabels[currentPhase] || "Starting";

  // Progress: phase 1 = 5%, phase 2 = 5-60% based on thumbs, phase 3 = 60-95% based on videos
  let progressPercent = 5;
  if (currentPhase === 2) {
    const thumbProgress = thumbsTotal > 0 ? (thumbsCached / thumbsTotal) : 0;
    progressPercent = 5 + thumbProgress * 55;
  } else if (currentPhase === 3) {
    const videoProgress = videosTotal > 0 ? (videosCached / videosTotal) : 0;
    progressPercent = 60 + videoProgress * 35;
  }
  progressPercent = Math.min(95, progressPercent);

  return (
    <div className="bg-accent/50 border border-accent rounded-lg mb-4 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-accent w-full overflow-hidden">
        <div
          className="h-full bg-primary/70 transition-all duration-1000 ease-out relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        </div>
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        <Image className="h-4 w-4 text-primary flex-shrink-0 animate-pulse" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Refreshing media for {accountName} — <span className="text-primary">{phaseLabel}</span>
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeStr}
            </span>
            <span className="font-mono text-[10px]">Phase {Math.min(currentPhase, 3)}/3</span>
            {thumbsTotal > 0 && (
              <span>{thumbsCached}/{thumbsTotal} thumbs</span>
            )}
            {videosTotal > 0 && (
              <span>{videosCached}/{videosTotal} videos</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
