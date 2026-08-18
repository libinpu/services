-- Customer-facing provider discovery.  The client never reads provider GPS or
-- filters a provider directory; eligibility, distance, and the 10km limit are
-- enforced here.
CREATE INDEX IF NOT EXISTS idx_provider_profiles_nearby_lookup
  ON public.provider_profiles (is_online, last_location_at, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_active_provider
  ON public.bookings (provider_id)
  WHERE status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation');

CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  p_subcategory_id uuid,
  p_customer_latitude double precision,
  p_customer_longitude double precision,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  provider_id uuid,
  display_name text,
  avatar_url text,
  rating_avg numeric,
  rating_count integer,
  jobs_completed integer,
  experience_years integer,
  is_verified boolean,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_radius_km constant double precision := 10;
  v_location_max_age constant interval := interval '5 minutes';
  v_accuracy_max_m constant double precision := 80;
  v_lat_delta double precision;
  v_lng_delta double precision;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_customer_latitude NOT BETWEEN -90 AND 90
     OR p_customer_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid service coordinates';
  END IF;

  SELECT category_id INTO v_category_id
  FROM service_subcategories
  WHERE id = p_subcategory_id AND is_active;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Service is not available';
  END IF;

  -- Bounding-box prefilter keeps the precise Haversine calculation small.
  v_lat_delta := v_radius_km / 111.045;
  v_lng_delta := v_radius_km / GREATEST(111.045 * cos(radians(p_customer_latitude)), 0.01);

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      pp.rating_avg,
      pp.rating_count,
      pp.jobs_completed,
      pp.experience_years,
      pp.is_verified,
      haversine_distance_km(p_customer_latitude, p_customer_longitude, pp.latitude, pp.longitude) AS distance
    FROM profiles p
    JOIN provider_profiles pp ON pp.id = p.id
    WHERE p.role = 'provider'
      AND p.is_active
      AND pp.is_verified
      AND pp.background_check_status = 'approved'
      AND pp.is_online
      AND v_category_id = ANY(pp.category_ids)
      AND pp.latitude BETWEEN p_customer_latitude - v_lat_delta AND p_customer_latitude + v_lat_delta
      AND pp.longitude BETWEEN p_customer_longitude - v_lng_delta AND p_customer_longitude + v_lng_delta
      AND pp.last_location_at >= now() - v_location_max_age
      AND (pp.location_accuracy IS NULL OR pp.location_accuracy <= v_accuracy_max_m)
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.provider_id = p.id
          AND b.status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation')
      )
  )
  SELECT id, full_name, avatar_url, rating_avg, rating_count, jobs_completed,
         experience_years, is_verified, round(distance::numeric, 2)
  FROM candidates
  WHERE distance <= v_radius_km
  ORDER BY distance ASC, id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END;
$$;

REVOKE ALL ON FUNCTION public.find_nearby_providers(uuid, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_providers(uuid, double precision, double precision, integer) TO authenticated;

-- Customers no longer get a table-wide provider directory (or live GPS) via RLS.
DROP POLICY IF EXISTS "public_read_provider_profiles" ON public.provider_profiles;
CREATE POLICY "select_own_or_admin_provider_profiles" ON public.provider_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "select_profiles_consolidated" ON public.profiles;
CREATE POLICY "select_own_or_admin_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

NOTIFY pgrst, 'reload schema';
