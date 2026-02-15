-- Add is_public column to reports for controlled public sharing
ALTER TABLE public.reports ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view reports publicly" ON public.reports;

-- Replace with a policy that only allows public access to explicitly shared reports
CREATE POLICY "Public can view shared reports" ON public.reports
  FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);
