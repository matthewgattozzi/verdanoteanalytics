
-- Create performance_stories table for client-facing narrative content
CREATE TABLE public.performance_stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE public.performance_stories ENABLE ROW LEVEL SECURITY;

-- Builder/employee can manage stories
CREATE POLICY "Builder/employee can manage performance_stories"
ON public.performance_stories
FOR ALL
USING (has_role(auth.uid(), 'builder'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Client can view stories for linked accounts
CREATE POLICY "Client can view linked performance_stories"
ON public.performance_stories
FOR SELECT
USING (has_role(auth.uid(), 'client'::app_role) AND account_id IN (SELECT get_user_account_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_performance_stories_updated_at
BEFORE UPDATE ON public.performance_stories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
