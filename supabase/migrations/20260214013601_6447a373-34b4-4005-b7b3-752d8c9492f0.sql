-- Add resumable sync state tracking
ALTER TABLE public.sync_logs
  ADD COLUMN IF NOT EXISTS current_phase integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_state jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index for the continuation cron to find incomplete syncs quickly
CREATE INDEX IF NOT EXISTS idx_sync_logs_running ON public.sync_logs (status) WHERE status = 'running';