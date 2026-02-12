
ALTER TABLE public.ad_accounts
  ADD COLUMN creative_analysis_prompt text DEFAULT NULL,
  ADD COLUMN insights_prompt text DEFAULT NULL;
