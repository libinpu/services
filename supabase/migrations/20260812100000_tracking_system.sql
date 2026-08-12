-- Production tracking: secure OTP, customer location snapshot, richer provider GPS, realtime.

-- Booking OTP security + customer location snapshot
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS otp_hash text,
  ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS otp_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_latitude double precision,
  ADD COLUMN IF NOT EXISTS customer_longitude double precision,
  ADD COLUMN IF NOT EXISTS customer_location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS customer_location_at timestamptz;

-- Richer provider location for live tracking
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS speed double precision;

-- Enable Supabase Realtime on core tracking tables (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'provider_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_profiles;
  END IF;
END $$;

-- Valid booking status transitions (backend-enforced via edge functions; documented here)
COMMENT ON COLUMN public.bookings.otp_hash IS 'SHA-256 hash of job OTP — plaintext otp column is legacy/display only';
COMMENT ON COLUMN public.bookings.customer_latitude IS 'Immutable customer service location snapshot at booking time';
