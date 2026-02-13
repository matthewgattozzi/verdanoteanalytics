
-- Allow anonymous (unauthenticated) users to read reports
CREATE POLICY "Anyone can view reports publicly"
  ON public.reports FOR SELECT
  USING (true);
