import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useMediaRefreshLogs() {
  return useQuery({
    queryKey: ["media-refresh-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("media_refresh_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: (query) => {
      const logs = query.state.data as any[] | undefined;
      return logs?.some((l: any) => l.status === "running") ? 2000 : false;
    },
  });
}

/** Returns true when any media refresh is currently running. Toasts on completion. */
export function useIsRefreshingMedia() {
  const { data: logs } = useMediaRefreshLogs();
  const wasRefreshing = useRef(false);

  const isRefreshing = (logs || []).some((l: any) => l.status === "running");

  useEffect(() => {
    if (wasRefreshing.current && !isRefreshing && logs?.length) {
      const latest = logs[0] as any;
      if (latest.status === "completed") {
        const thumbs = latest.thumbs_cached ?? 0;
        const videos = latest.videos_cached ?? 0;
        toast.success("Media refresh finished", {
          description: `${thumbs} thumbnails, ${videos} videos cached.`,
        });
      } else if (latest.status === "failed") {
        toast.error("Media refresh failed", {
          description: "Check logs for details.",
        });
      }
    }
    wasRefreshing.current = isRefreshing;
  }, [isRefreshing, logs]);

  return isRefreshing;
}
