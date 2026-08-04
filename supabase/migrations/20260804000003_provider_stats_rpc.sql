-- Create a Postgres function to return a provider's booking counts in a single RPC call.
-- This replaces 3 separate booking-count queries from the dashboard header stats section.
-- Called as: supabase.rpc('get_provider_stats', { p_provider_id: '...' })

CREATE OR REPLACE FUNCTION public.get_provider_stats(p_provider_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'pending_count',   COUNT(*) FILTER (WHERE status = 'pending'),
    'active_count',    COUNT(*) FILTER (WHERE status IN ('accepted','on_the_way','arrived','in_progress','awaiting_confirmation')),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_count', COUNT(*) FILTER (WHERE status IN ('cancelled','rejected')),
    'total_count',     COUNT(*)
  )
  FROM bookings
  WHERE provider_id = p_provider_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_stats(uuid) TO authenticated;

-- Add index supporting the stats function (composite on provider+status for fast count)
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status
  ON public.bookings (provider_id, status);
