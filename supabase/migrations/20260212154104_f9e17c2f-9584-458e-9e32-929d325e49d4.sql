
-- Table for storing AI analysis history
CREATE TABLE public.ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id text REFERENCES public.ad_accounts(id),
  title text NOT NULL DEFAULT 'Analysis',
  analysis text NOT NULL,
  creative_count integer NOT NULL DEFAULT 0,
  total_spend numeric NOT NULL DEFAULT 0,
  date_range_start date,
  date_range_end date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON public.ai_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Business context settings per account
ALTER TABLE public.ad_accounts
  ADD COLUMN company_description text,
  ADD COLUMN primary_kpi text DEFAULT 'Purchase ROAS > 1.5x',
  ADD COLUMN secondary_kpis text DEFAULT 'CTR, Hook Rate, Volume';
