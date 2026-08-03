-- Add location columns to provider_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_profiles' AND column_name = 'latitude') THEN
    ALTER TABLE provider_profiles ADD COLUMN latitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_profiles' AND column_name = 'longitude') THEN
    ALTER TABLE provider_profiles ADD COLUMN longitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_profiles' AND column_name = 'last_location_at') THEN
    ALTER TABLE provider_profiles ADD COLUMN last_location_at timestamptz;
  END IF;
END $$;

-- Add ETA and distance columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'estimated_eta_mins') THEN
    ALTER TABLE bookings ADD COLUMN estimated_eta_mins integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'distance_km') THEN
    ALTER TABLE bookings ADD COLUMN distance_km double precision;
  END IF;
END $$;

-- Add index on bookings status for faster nearby-requests polling
CREATE INDEX IF NOT EXISTS idx_bookings_status_pending ON bookings (status) WHERE status = 'pending';