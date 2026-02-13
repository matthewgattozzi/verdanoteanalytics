
-- saved_views: make readable by all authenticated users, writable by builder/employee
DROP POLICY IF EXISTS "Users can view own saved views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can create own saved views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can update own saved views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can delete own saved views" ON public.saved_views;

CREATE POLICY "All authenticated users can view saved views"
  ON public.saved_views FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Builder/employee can create saved views"
  ON public.saved_views FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'builder') OR has_role(auth.uid(), 'employee')));

CREATE POLICY "Builder/employee can update saved views"
  ON public.saved_views FOR UPDATE
  USING (has_role(auth.uid(), 'builder') OR has_role(auth.uid(), 'employee'));

CREATE POLICY "Builder/employee can delete saved views"
  ON public.saved_views FOR DELETE
  USING (has_role(auth.uid(), 'builder') OR has_role(auth.uid(), 'employee'));

-- reports: make readable by all authenticated users (already writable by builder/employee)
DROP POLICY IF EXISTS "Client can view linked reports" ON public.reports;

CREATE POLICY "All authenticated users can view reports"
  ON public.reports FOR SELECT
  USING (auth.uid() IS NOT NULL);
