
ALTER TABLE public.saved_views ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Backfill existing views with sequential order based on creation date
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM public.saved_views
)
UPDATE public.saved_views SET sort_order = ordered.rn FROM ordered WHERE saved_views.id = ordered.id;
