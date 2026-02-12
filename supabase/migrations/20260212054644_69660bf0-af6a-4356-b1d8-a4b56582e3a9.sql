
-- Daily performance snapshots per creative
CREATE TABLE public.creative_daily_metrics (
  ad_id TEXT NOT NULL REFERENCES public.creatives(ad_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  account_id TEXT NOT NULL,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  purchase_value NUMERIC DEFAULT 0,
  adds_to_cart INTEGER DEFAULT 0,
  cost_per_add_to_cart NUMERIC DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  thumb_stop_rate NUMERIC DEFAULT 0,
  hold_rate NUMERIC DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  video_avg_play_time NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ad_id, date)
);

-- Index for fast date range queries per account
CREATE INDEX idx_daily_metrics_account_date ON public.creative_daily_metrics (account_id, date);
CREATE INDEX idx_daily_metrics_ad_date ON public.creative_daily_metrics (ad_id, date);

-- Enable RLS
ALTER TABLE public.creative_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builder/employee can manage daily_metrics"
  ON public.creative_daily_metrics FOR ALL
  USING (has_role(auth.uid(), 'builder'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Client can view linked daily_metrics"
  ON public.creative_daily_metrics FOR SELECT
  USING (has_role(auth.uid(), 'client'::app_role) AND account_id IN (SELECT get_user_account_ids(auth.uid())));

-- Enable pg_cron and pg_net for scheduled syncs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
