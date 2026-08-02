/*
# Add Provider Location and Booking ETA/Distance

## Purpose
Enables a "nearby requests" workflow for service providers:
- Providers go online with their current GPS coordinates.
- Open booking requests are matched to providers by service category.
- Distance (km) between provider and customer is computed and shown.
- On accept, estimated travel time (ETA) is stored and displayed on a live map.

## 1. provider_profiles — new columns
- `latitude` (double precision, nullable) — provider's current latitude when online.
- `longitude` (double precision, nullable) — provider's current longitude when online.
- `last_location_at` (timestamptz, nullable) — when the provider last updated their location.

These are only written by the provider themselves (owner of the row).

## 2. bookings — new columns
- `estimated_eta_mins` (integer, nullable) — estimated travel time in minutes from provider to customer.
- `distance_km` (double precision, nullable) — straight-line distance between provider and customer address.

## 3. Security
- RLS is already enabled on both tables. We add UPDATE policy entries so the provider can write their own
  location columns, and so that both customer and provider can update booking ETA/distance.
- provider_profiles: the existing owner-write policy already covers new columns (policy is row-level, not column-level).
- bookings: the existing UPDATE policy already covers `provider_id = auth.uid() OR customer_id = auth.uid()`,
  so the new columns are writable by both parties.

## 4. Idempotency
All column additions use `DO $$ ... IF NOT EXISTS ... END $$` blocks so the migration can be safely re-run.
*/

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
