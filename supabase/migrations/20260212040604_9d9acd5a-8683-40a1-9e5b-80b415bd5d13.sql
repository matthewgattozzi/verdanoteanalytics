
-- Role enum
CREATE TYPE public.app_role AS ENUM ('builder', 'employee', 'client');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- User-account linking (which accounts a client can see)
CREATE TABLE public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own account links" ON public.user_accounts FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to get user's linked account IDs
CREATE OR REPLACE FUNCTION public.get_user_account_ids(_user_id UUID)
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.user_accounts WHERE user_id = _user_id
$$;

-- Builder/employee policies for profiles, roles, user_accounts (manage all)
CREATE POLICY "Builder can manage all profiles" ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'builder'));

CREATE POLICY "Builder can manage all roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'builder'));

CREATE POLICY "Builder can manage all user_accounts" ON public.user_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'builder'));

-- Employee can read all profiles
CREATE POLICY "Employee can read all profiles" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'employee'));

-- Trigger for profile auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update ad_accounts RLS: builder/employee see all, clients see only linked
DROP POLICY "Allow all access to ad_accounts" ON public.ad_accounts;

CREATE POLICY "Builder/employee can manage accounts" ON public.ad_accounts FOR ALL
  USING (
    public.has_role(auth.uid(), 'builder') OR public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Client can view linked accounts" ON public.ad_accounts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'client')
    AND id IN (SELECT public.get_user_account_ids(auth.uid()))
  );

-- Update creatives RLS
DROP POLICY "Allow all access to creatives" ON public.creatives;

CREATE POLICY "Builder/employee can manage creatives" ON public.creatives FOR ALL
  USING (
    public.has_role(auth.uid(), 'builder') OR public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Client can view linked creatives" ON public.creatives FOR SELECT
  USING (
    public.has_role(auth.uid(), 'client')
    AND account_id IN (SELECT public.get_user_account_ids(auth.uid()))
  );

-- Update reports RLS
DROP POLICY "Allow all access to reports" ON public.reports;

CREATE POLICY "Builder/employee can manage reports" ON public.reports FOR ALL
  USING (
    public.has_role(auth.uid(), 'builder') OR public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Client can view linked reports" ON public.reports FOR SELECT
  USING (
    public.has_role(auth.uid(), 'client')
    AND account_id IN (SELECT public.get_user_account_ids(auth.uid()))
  );

-- Settings: only builder
DROP POLICY "Allow all access to settings" ON public.settings;

CREATE POLICY "Builder can manage settings" ON public.settings FOR ALL
  USING (public.has_role(auth.uid(), 'builder'));

-- Sync logs: builder/employee see all, client sees linked
DROP POLICY "Allow all access to sync_logs" ON public.sync_logs;

CREATE POLICY "Builder/employee can manage sync_logs" ON public.sync_logs FOR ALL
  USING (
    public.has_role(auth.uid(), 'builder') OR public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Client can view linked sync_logs" ON public.sync_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'client')
    AND account_id IN (SELECT public.get_user_account_ids(auth.uid()))
  );

-- Name mappings: builder/employee manage, client read linked
DROP POLICY "Allow all access to name_mappings" ON public.name_mappings;

CREATE POLICY "Builder/employee can manage name_mappings" ON public.name_mappings FOR ALL
  USING (
    public.has_role(auth.uid(), 'builder') OR public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Client can view linked name_mappings" ON public.name_mappings FOR SELECT
  USING (
    public.has_role(auth.uid(), 'client')
    AND account_id IN (SELECT public.get_user_account_ids(auth.uid()))
  );
