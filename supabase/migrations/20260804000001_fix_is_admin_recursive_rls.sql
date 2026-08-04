/*
# Fix: is_admin() causes recursive RLS → 500 errors on login

## Problem
The `is_admin()` function uses SECURITY DEFINER but still hits RLS when it
SELECT's from `profiles` — because FORCE ROW LEVEL SECURITY means even the
function owner (postgres) is subject to policies. This creates infinite recursion:

  SELECT from profiles → triggers RLS → policy calls is_admin() →
  is_admin() SELECTs from profiles → triggers RLS → ... → 500 / 504

## Fix
Rewrite `is_admin()` to query `auth.users.raw_app_meta_data` instead of
`profiles`, which has no RLS. Alternatively, query profiles via a
`SET LOCAL row_security = off` inside the function body.

We use the `raw_app_meta_data` approach because:
- auth.users is not subject to RLS (it lives in the auth schema)
- admin role is stored in both places; reading from auth is safe & fast

NOTE: If you set admin role only in `profiles.role`, use the second approach
(SET LOCAL row_security = off inside the function).
*/

-- Drop and recreate the function with row security disabled inside
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  -- Temporarily bypass RLS to read the profiles table without recursion
  SET LOCAL row_security = off;
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
