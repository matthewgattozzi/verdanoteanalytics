
-- Function to recalculate creative_count and untagged_count for an account
CREATE OR REPLACE FUNCTION public.refresh_account_creative_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _account_id text;
BEGIN
  -- Determine which account_id changed
  _account_id := COALESCE(NEW.account_id, OLD.account_id);

  UPDATE public.ad_accounts
  SET creative_count = (SELECT count(*) FROM public.creatives WHERE account_id = _account_id),
      untagged_count = (SELECT count(*) FROM public.creatives WHERE account_id = _account_id AND tag_source = 'untagged')
  WHERE id = _account_id;

  RETURN NULL;
END;
$$;

-- Trigger on creatives table
CREATE TRIGGER trg_refresh_account_creative_counts
AFTER INSERT OR UPDATE OR DELETE ON public.creatives
FOR EACH ROW
EXECUTE FUNCTION public.refresh_account_creative_counts();

-- Backfill current counts to fix existing mismatches
UPDATE public.ad_accounts a
SET creative_count = sub.total,
    untagged_count = sub.untagged
FROM (
  SELECT account_id,
         count(*) AS total,
         count(*) FILTER (WHERE tag_source = 'untagged') AS untagged
  FROM public.creatives
  GROUP BY account_id
) sub
WHERE a.id = sub.account_id;
