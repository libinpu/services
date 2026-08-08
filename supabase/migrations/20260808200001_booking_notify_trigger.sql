-- Migration: Postgres trigger to call send-job-notification edge function on new booking
-- Uses pg_net (built into Supabase) to make an async HTTP call to the edge function.

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function that fires after a new booking is inserted
CREATE OR REPLACE FUNCTION notify_providers_on_new_booking()
RETURNS TRIGGER AS 
DECLARE
  edge_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only act on new pending bookings
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  edge_url := current_setting('app.supabase_url', true) || '/functions/v1/send-job-notification';
  service_role_key := current_setting('app.service_role_key', true);

  -- Async HTTP POST to edge function via pg_net
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to bookings table
DROP TRIGGER IF EXISTS on_booking_created ON bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_providers_on_new_booking();

-- Store app settings that the trigger function reads
-- (Run this once in the Supabase SQL editor with your actual values)
-- ALTER DATABASE postgres SET app.supabase_url = 'https://wrozyadpfcktedltxhox.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
