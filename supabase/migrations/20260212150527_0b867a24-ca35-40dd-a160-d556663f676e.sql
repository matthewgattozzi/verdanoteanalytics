
CREATE TABLE public.saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved views"
ON public.saved_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved views"
ON public.saved_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved views"
ON public.saved_views FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved views"
ON public.saved_views FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_views_updated_at
BEFORE UPDATE ON public.saved_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
