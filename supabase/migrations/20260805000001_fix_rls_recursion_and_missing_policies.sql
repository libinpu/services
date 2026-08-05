/*
# Fix RLS recursion (57014) and missing provider_applications policies

## Root cause
Migration 20260801103000 added admin RLS policies that call is_admin(), which
SELECTs from profiles. Because profiles has FORCE ROW LEVEL SECURITY, that inner
SELECT re-triggers RLS → admin policy → is_admin() → infinite recursion →
PostgreSQL error 57014 (statement timeout) → Supabase 500.

This affects every authenticated query touching profiles, provider_applications,
provider_profiles, or bookings (all have admin policies calling is_admin()).

Concurrent polling from customer + provider dashboards amplifies the failure rate
when both users are active simultaneously.

## Fix
1. Rewrite is_admin() to bypass RLS inside the function body (SET LOCAL row_security = off).
2. Ensure provider_applications exists with owner-scoped policies so providers
   don't rely solely on the admin policy path.
3. Allow authenticated users to read provider profile rows (marketplace/booking joins).
4. Allow booking participants to read the address linked to their booking.
*/

-- 1. Fix is_admin() — must bypass RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  SET LOCAL row_security = off;
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. provider_applications table (may already exist in remote DB)
CREATE TABLE IF NOT EXISTS public.provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_ids uuid[] NOT NULL DEFAULT '{}',
  specializations text[] NOT NULL DEFAULT '{}',
  experience_years int NOT NULL DEFAULT 0,
  bio_en text,
  bio_ml text,
  id_proof_url text,
  certificate_url text,
  address_proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_provider_applications_user_id
  ON public.provider_applications (user_id, created_at DESC);

-- Owner-scoped policies — providers read/write their own application without hitting is_admin()
DROP POLICY IF EXISTS "select_own_provider_application" ON public.provider_applications;
CREATE POLICY "select_own_provider_application" ON public.provider_applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_provider_application" ON public.provider_applications;
CREATE POLICY "insert_own_provider_application" ON public.provider_applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pending_provider_application" ON public.provider_applications;
CREATE POLICY "update_own_pending_provider_application" ON public.provider_applications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow customers to read provider profiles (needed for booking list/detail nested joins)
DROP POLICY IF EXISTS "select_public_provider_profiles" ON public.profiles;
CREATE POLICY "select_public_provider_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (role = 'provider');

-- 4. Allow booking participants to read the service address
DROP POLICY IF EXISTS "select_addresses_for_booking_participants" ON public.addresses;
CREATE POLICY "select_addresses_for_booking_participants" ON public.addresses FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.address_id = addresses.id
        AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );
