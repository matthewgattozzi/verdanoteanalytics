import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncProgress {
  status: "idle" | "syncing" | "completed" | "failed";
  progress: number;
  total: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
}

interface IncrementalSyncOptions {
  accountId?: string;
  since?: Date;
  onProgress?: (progress: SyncProgress) => void;
}

// Check if we need a full sync or incremental
export function useSyncStatus(accountId?: string) {
  return useQuery({
    queryKey: ["sync-status", accountId],
    queryFn: async () => {
      const { data: lastSync } = await supabase
        .from("sync_logs")
        .select("started_at, status, sync_state")
        .eq(accountId ? "account_id" : "account_id", accountId || "*")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      const lastSyncTime = lastSync?.started_at
        ? new Date(lastSync.started_at)
        : null;
      const hoursSinceLastSync = lastSyncTime
        ? (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)
        : Infinity;

      return {
        lastSync: lastSyncTime,
        hoursSinceLastSync,
        needsFullSync: hoursSinceLastSync > 24 || !lastSync,
        canIncremental: hoursSinceLastSync <= 24 && lastSync?.status === "completed",
      };
    },
    staleTime: 60000, // 1 minute
  });
}

// Optimized sync with incremental support
export function useOptimizedSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: IncrementalSyncOptions = {}) => {
      const { accountId, since, onProgress } = options;

      // Start sync
      onProgress?.({
        status: "syncing",
        progress: 0,
        total: 100,
        currentStep: "Initializing sync...",
      });

      // Step 1: Sync accounts metadata (fast)
      onProgress?.({
        status: "syncing",
        progress: 10,
        total: 100,
        currentStep: "Fetching account data...",
      });

      const syncResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            account_id: accountId,
            sync_type: since ? "incremental" : "full",
            since: since?.toISOString(),
          }),
        }
      );

      if (!syncResponse.ok) {
        throw new Error("Sync failed to start");
      }

      const syncResult = await syncResponse.json();

      // Step 2: Poll for progress
      const pollInterval = setInterval(async () => {
        const { data: logs } = await supabase
          .from("sync_logs")
          .select("*")
          .eq("id", syncResult.sync_id)
          .single();

        if (logs) {
          const progress = logs.creatives_fetched
            ? Math.round((logs.creatives_upserted! / logs.creatives_fetched) * 100)
            : 0;

          onProgress?.({
            status: logs.status as any,
            progress,
            total: logs.creatives_fetched || 100,
            currentStep: `Phase ${logs.current_phase}`,
            estimatedTimeRemaining: undefined,
          });

          if (logs.status === "completed" || logs.status === "failed") {
            clearInterval(pollInterval);
          }
        }
      }, 2000);

      // Wait for completion
      return new Promise((resolve, reject) => {
        const checkComplete = setInterval(async () => {
          const { data: logs } = await supabase
            .from("sync_logs")
            .select("status")
            .eq("id", syncResult.sync_id)
            .single();

          if (logs?.status === "completed") {
            clearInterval(checkComplete);
            clearInterval(pollInterval);
            resolve(syncResult);
          } else if (logs?.status === "failed") {
            clearInterval(checkComplete);
            clearInterval(pollInterval);
            reject(new Error("Sync failed"));
          }
        }, 2000);

        // Timeout after 30 minutes
        setTimeout(() => {
          clearInterval(checkComplete);
          clearInterval(pollInterval);
          reject(new Error("Sync timeout"));
        }, 30 * 60 * 1000);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["daily-trends"] });
      queryClient.invalidateQueries({ queryKey: ["sync-history"] });
      toast.success("Sync completed successfully");
    },
    onError: (error) => {
      toast.error("Sync failed", {
        description: error.message,
      });
    },
  });
}

// Background sync that doesn't block UI
export function useBackgroundSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            sync_type: "incremental",
            background: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Background sync failed to start");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Background sync started", {
        description: "Data will update automatically when complete",
      });

      const checkComplete = setInterval(async () => {
        const { data: logs } = await supabase
          .from("sync_logs")
          .select("status")
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (logs?.status === "completed") {
          queryClient.invalidateQueries({ queryKey: ["creatives"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          clearInterval(checkComplete);
        }
      }, 10000);

      setTimeout(() => clearInterval(checkComplete), 30 * 60 * 1000);
    },
  });
}

// Smart sync that chooses full vs incremental
export function useSmartSync() {
  const { data: syncStatus } = useSyncStatus();
  const optimizedSync = useOptimizedSync();
  const backgroundSync = useBackgroundSync();

  const sync = async (options: { accountId?: string; forceFull?: boolean } = {}) => {
    const { accountId, forceFull } = options;

    if (forceFull || syncStatus?.needsFullSync) {
      return optimizedSync.mutateAsync({
        accountId,
        onProgress: (progress) => {
          console.log("Sync progress:", progress);
        },
      });
    } else {
      return backgroundSync.mutateAsync();
    }
  };

  return {
    sync,
    isSyncing: optimizedSync.isPending || backgroundSync.isPending,
    syncStatus,
  };
}
