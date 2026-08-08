-- 20260808140000_consolidate_rls_policies.sql
-- Consolidate admin and owner profiles RLS policies to reduce overhead.

-- 1. Profiles Table Policies Consolidated
DROP POLICY IF EXISTS "select_admin_or_own_profiles" ON public.profiles;
DROP POLICY IF EXISTS "select_public_provider_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_admin_read_profiles" ON public.profiles;

CREATE POLICY "select_profiles_consolidated" ON public.profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR role = 'provider'
    OR public.is_admin()
  );

-- 2. Bookings Table Policies Consolidated
DROP POLICY IF EXISTS "select_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "allow_admin_read_bookings" ON public.bookings;
DROP POLICY IF EXISTS "provider_read_assigned_bookings" ON public.bookings;

CREATE POLICY "select_bookings_consolidated" ON public.bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.is_admin()
  );
