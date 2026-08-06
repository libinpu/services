-- Allow admin users to read all bookings through RLS.
-- This fixes the admin dashboard request list when admin accounts are subject to owner-scoped booking policies.

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookings" ON public.bookings;
CREATE POLICY "select_own_bookings" ON public.bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "update_own_bookings" ON public.bookings;
CREATE POLICY "update_own_bookings" ON public.bookings FOR UPDATE
  TO authenticated USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.is_admin()
  );
