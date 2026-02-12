
-- Add per-account sync settings columns to ad_accounts
ALTER TABLE public.ad_accounts 
ADD COLUMN date_range_days integer NOT NULL DEFAULT 30,
ADD COLUMN winner_roas_threshold numeric NOT NULL DEFAULT 2.0,
ADD COLUMN iteration_spend_threshold numeric NOT NULL DEFAULT 50;
