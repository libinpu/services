/*
# Fix RLS policies for the profiles table

## Overview
Re-establishes strict owner-scoped Row Level Security on the `profiles` table
so each authenticated user can only access and modify their own profile row.

## Changes
1. Re-enables RLS and forces it (`FORCE ROW LEVEL SECURITY`) so the table owner
   role cannot bypass policies — every role is subject to the policies.
2. Drops and recreates three policies:
   - `select_own_profile` — authenticated users can SELECT only rows where
     `profiles.id = auth.uid()`.
   - `insert_own_profile` — authenticated users can INSERT a row only when
     `profiles.id = auth.uid()` (WITH CHECK).
   - `update_own_profile` — authenticated users can UPDATE only their own row
     (USING + WITH CHECK both enforce `auth.uid() = id`).
3. No DELETE policy — users cannot delete their own profile row (handled by
   the `ON DELETE CASCADE` FK to `auth.users` when the auth account is removed).

## Security
- All three policies are scoped `TO authenticated` only.
- No `TO anon` / `USING (true)` — anonymous (unauthenticated) requests see zero
  rows and cannot insert or update.
- No cross-user access: every policy checks `auth.uid() = id`, so a user can
  never read, insert, or update another user's profile.
*/
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);