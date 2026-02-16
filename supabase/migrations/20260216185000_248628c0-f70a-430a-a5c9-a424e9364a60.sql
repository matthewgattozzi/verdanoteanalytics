
ALTER TABLE public.ad_accounts
  ADD COLUMN kill_scale_kpi text NOT NULL DEFAULT 'roas',
  ADD COLUMN kill_scale_kpi_direction text NOT NULL DEFAULT 'gte';
