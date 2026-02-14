
-- Create media_refresh_logs table for tracking media refresh progress
CREATE TABLE public.media_refresh_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'running',
  current_phase integer NOT NULL DEFAULT 0,
  thumbs_total integer DEFAULT 0,
  thumbs_cached integer DEFAULT 0,
  thumbs_failed integer DEFAULT 0,
  videos_total integer DEFAULT 0,
  videos_cached integer DEFAULT 0,
  videos_failed integer DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  api_errors text DEFAULT '[]',
  duration_ms integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.media_refresh_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies matching sync_logs pattern
CREATE POLICY "Builder/employee can manage media_refresh_logs"
  ON public.media_refresh_logs FOR ALL
  USING (has_role(auth.uid(), 'builder'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Client can view linked media_refresh_logs"
  ON public.media_refresh_logs FOR SELECT
  USING (has_role(auth.uid(), 'client'::app_role) AND (account_id IN (SELECT get_user_account_ids(auth.uid()) AS get_user_account_ids)));
