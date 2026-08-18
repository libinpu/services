-- Make provider_devices the single source of truth for Expo push tokens.
-- Older provider_profiles.push_token writes are no longer used for dispatching jobs.

ALTER TABLE public.provider_profiles DROP COLUMN IF EXISTS push_token;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_devices_unique_provider_token
  ON public.provider_devices (provider_id, push_token);

CREATE INDEX IF NOT EXISTS idx_provider_devices_updated_at
  ON public.provider_devices (updated_at DESC);

-- Keep older provider_profiles reads from accidentally depending on the deleted column.
-- This migration intentionally does not reintroduce a service-role-only push token field.
