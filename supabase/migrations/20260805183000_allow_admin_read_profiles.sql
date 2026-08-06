-- Allow admin users to read all profiles through RLS.
-- This is required for the admin dashboard to display user data.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_admin_or_own_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "select_public_provider_profiles" ON public.profiles;
CREATE POLICY "select_public_provider_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (
    role = 'provider'
    OR public.is_admin()
  );
