
-- Create report_schedules table for per-account per-cadence configuration
CREATE TABLE public.report_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  enabled boolean NOT NULL DEFAULT true,
  report_name_template text NOT NULL DEFAULT '{cadence} Report - {account}',
  date_range_days integer NOT NULL DEFAULT 7,
  deliver_to_app boolean NOT NULL DEFAULT true,
  deliver_to_slack boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, cadence)
);

-- Enable RLS
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

-- Builder/employee can manage
CREATE POLICY "Builder/employee can manage report_schedules"
  ON public.report_schedules
  FOR ALL
  USING (has_role(auth.uid(), 'builder'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Client can view linked
CREATE POLICY "Client can view linked report_schedules"
  ON public.report_schedules
  FOR SELECT
  USING (has_role(auth.uid(), 'client'::app_role) AND (account_id IN (SELECT get_user_account_ids(auth.uid()))));

-- Trigger for updated_at
CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
