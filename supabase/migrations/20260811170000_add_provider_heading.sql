-- Preserve a provider's GPS bearing so the live marker can face its travel direction.
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS heading double precision;
