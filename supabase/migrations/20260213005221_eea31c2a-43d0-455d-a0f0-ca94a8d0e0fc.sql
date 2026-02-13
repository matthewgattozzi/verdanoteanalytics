
ALTER TABLE public.ad_accounts
  ADD COLUMN scale_threshold numeric NOT NULL DEFAULT 2.0,
  ADD COLUMN kill_threshold numeric NOT NULL DEFAULT 1.0;

-- Initialize from existing winner_kpi_threshold
UPDATE public.ad_accounts 
SET scale_threshold = winner_kpi_threshold,
    kill_threshold = winner_kpi_threshold * 0.5;
