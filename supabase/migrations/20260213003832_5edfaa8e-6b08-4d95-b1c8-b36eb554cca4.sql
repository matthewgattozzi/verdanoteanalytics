
-- Add configurable winner KPI fields to ad_accounts
ALTER TABLE public.ad_accounts
  ADD COLUMN winner_kpi text NOT NULL DEFAULT 'roas',
  ADD COLUMN winner_kpi_direction text NOT NULL DEFAULT 'gte',
  ADD COLUMN winner_kpi_threshold numeric NOT NULL DEFAULT 2.0;

-- Migrate existing winner_roas_threshold values into the new generic threshold
UPDATE public.ad_accounts SET winner_kpi_threshold = winner_roas_threshold;
