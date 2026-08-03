-- Create a helper function to securely check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow admins to read all profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin());

-- Allow admins to update any profile
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.is_admin());

-- Allow admins to delete any profile
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (public.is_admin());

-- Allow admins to select all provider profiles
DROP POLICY IF EXISTS "admin_select_provider_profiles" ON provider_profiles;
CREATE POLICY "admin_select_provider_profiles" ON provider_profiles FOR SELECT
  TO authenticated USING (public.is_admin());

-- Allow admins to update any provider profile
DROP POLICY IF EXISTS "admin_update_provider_profiles" ON provider_profiles;
CREATE POLICY "admin_update_provider_profiles" ON provider_profiles FOR UPDATE
  TO authenticated USING (public.is_admin());

-- Allow admins to delete any provider profile
DROP POLICY IF EXISTS "admin_delete_provider_profiles" ON provider_profiles;
CREATE POLICY "admin_delete_provider_profiles" ON provider_profiles FOR DELETE
  TO authenticated USING (public.is_admin());

-- Allow admins to read all bookings
DROP POLICY IF EXISTS "admin_select_bookings" ON bookings;
CREATE POLICY "admin_select_bookings" ON bookings FOR SELECT
  TO authenticated USING (public.is_admin());

-- Allow admins to update all bookings
DROP POLICY IF EXISTS "admin_update_bookings" ON bookings;
CREATE POLICY "admin_update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (public.is_admin());

-- Allow admins to delete all bookings
DROP POLICY IF EXISTS "admin_delete_bookings" ON bookings;
CREATE POLICY "admin_delete_bookings" ON bookings FOR DELETE
  TO authenticated USING (public.is_admin());