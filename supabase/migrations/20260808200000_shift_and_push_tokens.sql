-- Add push_token and shift_started_at to provider_profiles
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS shift_started_at TIMESTAMPTZ;

-- Index for quickly finding on-shift providers
CREATE INDEX IF NOT EXISTS idx_provider_profiles_is_online
  ON provider_profiles (is_online)
  WHERE is_online = true;

-- Allow providers to update their own push_token and shift fields
DROP POLICY IF EXISTS "Providers can update own push_token and shift" ON provider_profiles;
CREATE POLICY "Providers can update own push_token and shift"
  ON provider_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
