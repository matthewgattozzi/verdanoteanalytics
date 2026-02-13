
-- Add iteration diagnostic counts to reports table
ALTER TABLE public.reports
ADD COLUMN diag_weak_hook integer NOT NULL DEFAULT 0,
ADD COLUMN diag_weak_body integer NOT NULL DEFAULT 0,
ADD COLUMN diag_weak_cta integer NOT NULL DEFAULT 0,
ADD COLUMN diag_weak_hook_body integer NOT NULL DEFAULT 0,
ADD COLUMN diag_landing_page integer NOT NULL DEFAULT 0,
ADD COLUMN diag_all_weak integer NOT NULL DEFAULT 0,
ADD COLUMN diag_weak_cta_image integer NOT NULL DEFAULT 0,
ADD COLUMN diag_total_diagnosed integer NOT NULL DEFAULT 0;
