
-- Add missing metric columns from Meta Ads export
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS cpc numeric DEFAULT 0;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS frequency numeric DEFAULT 0;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS adds_to_cart integer DEFAULT 0;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS cost_per_add_to_cart numeric DEFAULT 0;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS video_avg_play_time numeric DEFAULT 0;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS result_type text DEFAULT NULL;
