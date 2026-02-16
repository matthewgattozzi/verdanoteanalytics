-- Performance indexes for common query patterns

-- Creatives by account + spend (most common query: sorted by spend)
CREATE INDEX IF NOT EXISTS idx_creatives_account_spend 
ON public.creatives(account_id, spend DESC);

-- Creatives by account + created_at for pagination
CREATE INDEX IF NOT EXISTS idx_creatives_account_created 
ON public.creatives(account_id, created_at DESC);

-- Sync logs: concurrency guard and history lookups
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_started 
ON public.sync_logs(status, started_at DESC);

-- Media refresh logs: concurrency check
CREATE INDEX IF NOT EXISTS idx_media_refresh_logs_status 
ON public.media_refresh_logs(status);

-- Daily metrics: ad_id + date lookups
CREATE INDEX IF NOT EXISTS idx_daily_metrics_ad_date 
ON public.creative_daily_metrics(ad_id, date DESC);

-- Partial index: null thumbnails for enrichment pipeline
CREATE INDEX IF NOT EXISTS idx_creatives_null_thumbnail 
ON public.creatives(account_id, spend DESC) 
WHERE thumbnail_url IS NULL;

-- Partial index: untagged creatives (common filter)
CREATE INDEX IF NOT EXISTS idx_creatives_untagged 
ON public.creatives(account_id) 
WHERE tag_source = 'untagged';
