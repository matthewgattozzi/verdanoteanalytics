
-- Settings: key-value store for app configuration
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('meta_access_token', ''),
  ('gemini_api_key', ''),
  ('date_range_days', '30'),
  ('sync_frequency', 'manual'),
  ('winner_roas_threshold', '2.0'),
  ('iteration_spend_threshold', '50'),
  ('app_password', '');

-- Ad accounts: connected Meta ad accounts
CREATE TABLE public.ad_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  creative_count INTEGER NOT NULL DEFAULT 0,
  untagged_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creatives: individual ads with performance + tag data
CREATE TABLE public.creatives (
  ad_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  unique_code TEXT,
  ad_name TEXT NOT NULL,
  -- Performance fields
  spend NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  thumb_stop_rate NUMERIC DEFAULT 0,
  hold_rate NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  purchase_value NUMERIC DEFAULT 0,
  -- Tag fields
  ad_type TEXT,
  person TEXT,
  style TEXT,
  product TEXT,
  hook TEXT,
  theme TEXT,
  tag_source TEXT NOT NULL DEFAULT 'untagged' CHECK (tag_source IN ('parsed', 'csv_match', 'manual', 'untagged')),
  -- Meta context
  ad_status TEXT DEFAULT 'UNKNOWN',
  campaign_name TEXT,
  adset_name TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  -- AI analysis
  ai_analysis TEXT,
  ai_hook_analysis TEXT,
  ai_visual_notes TEXT,
  ai_cta_notes TEXT,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzed', 'failed', 'skipped')),
  analyzed_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Name mappings: CSV-uploaded tag lookups per account
CREATE TABLE public.name_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  unique_code TEXT NOT NULL,
  ad_type TEXT,
  person TEXT,
  style TEXT,
  product TEXT,
  hook TEXT,
  theme TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, unique_code)
);

-- Sync logs: audit trail for sync operations
CREATE TABLE public.sync_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'manual' CHECK (sync_type IN ('initial', 'manual', 'bulk')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'completed_with_errors', 'failed')),
  creatives_fetched INTEGER DEFAULT 0,
  creatives_upserted INTEGER DEFAULT 0,
  tags_parsed INTEGER DEFAULT 0,
  tags_csv_matched INTEGER DEFAULT 0,
  tags_manual_preserved INTEGER DEFAULT 0,
  tags_untagged INTEGER DEFAULT 0,
  api_errors TEXT DEFAULT '[]',
  meta_api_calls INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Reports: snapshot reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT,
  report_name TEXT NOT NULL,
  total_spend NUMERIC DEFAULT 0,
  blended_roas NUMERIC DEFAULT 0,
  average_cpa NUMERIC DEFAULT 0,
  average_ctr NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  win_rate_tof NUMERIC DEFAULT 0,
  win_rate_mof NUMERIC DEFAULT 0,
  win_rate_bof NUMERIC DEFAULT 0,
  creative_count INTEGER DEFAULT 0,
  tags_parsed_count INTEGER DEFAULT 0,
  tags_csv_count INTEGER DEFAULT 0,
  tags_manual_count INTEGER DEFAULT 0,
  tags_untagged_count INTEGER DEFAULT 0,
  top_performers TEXT DEFAULT '[]',
  bottom_performers TEXT DEFAULT '[]',
  date_range_start DATE,
  date_range_end DATE,
  date_range_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_creatives_account ON public.creatives(account_id);
CREATE INDEX idx_creatives_ad_type ON public.creatives(ad_type);
CREATE INDEX idx_creatives_person ON public.creatives(person);
CREATE INDEX idx_creatives_style ON public.creatives(style);
CREATE INDEX idx_creatives_hook ON public.creatives(hook);
CREATE INDEX idx_creatives_theme ON public.creatives(theme);
CREATE INDEX idx_creatives_tag_source ON public.creatives(tag_source);
CREATE INDEX idx_creatives_ad_status ON public.creatives(ad_status);
CREATE INDEX idx_creatives_product ON public.creatives(product);
CREATE INDEX idx_name_mappings_account ON public.name_mappings(account_id);
CREATE INDEX idx_sync_logs_account_started ON public.sync_logs(account_id, started_at DESC);

-- Enable RLS (permissive for this single-user app with password gate)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.name_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Permissive policies (app is password-gated, not per-user)
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ad_accounts" ON public.ad_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to creatives" ON public.creatives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to name_mappings" ON public.name_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sync_logs" ON public.sync_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON public.ad_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_creatives_updated_at BEFORE UPDATE ON public.creatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_name_mappings_updated_at BEFORE UPDATE ON public.name_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
