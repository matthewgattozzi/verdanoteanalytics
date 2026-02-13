
-- Add report schedule preference and last scheduled report timestamp to ad_accounts
ALTER TABLE public.ad_accounts
ADD COLUMN report_schedule text NOT NULL DEFAULT 'none',
ADD COLUMN last_scheduled_report_at timestamp with time zone;

-- Enable pg_cron and pg_net extensions for scheduled function invocation
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
