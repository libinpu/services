-- Haversine distance function in kilometers
CREATE OR REPLACE FUNCTION haversine_distance_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
RETURNS numeric AS $$
DECLARE
    radius_earth_km constant numeric := 6371;
    dlat numeric;
    dlon numeric;
    a numeric;
    c numeric;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
    c := 2 * asin(sqrt(a));
    RETURN radius_earth_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-assign nearest eligible provider
CREATE OR REPLACE FUNCTION auto_assign_provider(p_booking_id uuid)
RETURNS json AS $$
DECLARE
    v_booking record;
    v_cat_id uuid;
    v_provider_id uuid;
    v_distance_km numeric;
    v_eta_mins int;
BEGIN
    -- 1. Get booking details
    SELECT b.*, s.category_id 
    INTO v_booking
    FROM public.bookings b
    JOIN public.service_subcategories s ON s.id = b.subcategory_id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Booking not found');
    END IF;

    IF v_booking.status != 'pending' THEN
        RETURN json_build_object('message', 'Booking already processed', 'status', v_booking.status);
    END IF;

    IF v_booking.provider_id IS NOT NULL THEN
        RETURN json_build_object('success', true, 'status', 'assigned', 'providerId', v_booking.provider_id);
    END IF;

    IF v_booking.customer_latitude IS NULL OR v_booking.customer_longitude IS NULL THEN
        RETURN json_build_object('error', 'Customer GPS location required');
    END IF;

    v_cat_id := v_booking.category_id;

    -- 2. Find nearest eligible provider
    -- Conditions:
    -- a. is_online = true
    -- b. category_id in category_ids
    -- c. last_location_at within 5 minutes
    -- d. location_accuracy <= 80
    -- e. distance <= 10 km
    -- f. Not in an active job
    SELECT p.id, haversine_distance_km(v_booking.customer_latitude, v_booking.customer_longitude, pp.latitude, pp.longitude) as dist
    INTO v_provider_id, v_distance_km
    FROM public.profiles p
    JOIN public.provider_profiles pp ON pp.id = p.id
    WHERE p.role = 'provider'
      AND pp.is_online = true
      AND v_cat_id = ANY(pp.category_ids)
      AND pp.last_location_at >= (NOW() - INTERVAL '5 minutes')
      AND pp.location_accuracy <= 80
      AND pp.latitude IS NOT NULL
      AND pp.longitude IS NOT NULL
      AND haversine_distance_km(v_booking.customer_latitude, v_booking.customer_longitude, pp.latitude, pp.longitude) <= 10
      AND NOT EXISTS (
          SELECT 1 FROM public.bookings b2 
          WHERE b2.provider_id = p.id 
            AND b2.status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation')
      )
    ORDER BY dist ASC
    LIMIT 1;

    -- 3. If no provider found, cancel booking
    IF v_provider_id IS NULL THEN
        UPDATE public.bookings
        SET status = 'cancelled',
            cancellation_reason = 'No nearby professional available within 10 km',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        RETURN json_build_object('success', false, 'message', 'No nearby professional available', 'status', 'cancelled');
    END IF;

    -- 4. Provider found, assign them
    v_eta_mins := GREATEST(5, ROUND((v_distance_km / 25.0) * 60.0));

    UPDATE public.bookings
    SET provider_id = v_provider_id,
        status = 'assigned',
        distance_km = v_distance_km,
        estimated_eta_mins = v_eta_mins,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN json_build_object('success', true, 'status', 'assigned', 'providerId', v_provider_id, 'distanceKm', v_distance_km, 'etaMins', v_eta_mins);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
