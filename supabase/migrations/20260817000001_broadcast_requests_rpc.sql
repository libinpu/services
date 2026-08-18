-- Broadcast requests to all eligible providers in 10 km
CREATE OR REPLACE FUNCTION broadcast_booking_requests(p_booking_id uuid)
RETURNS json AS $$
DECLARE
    v_booking record;
    v_cat_id uuid;
    v_provider_count int := 0;
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

    IF v_booking.customer_latitude IS NULL OR v_booking.customer_longitude IS NULL THEN
        RETURN json_build_object('error', 'Customer GPS location required');
    END IF;

    v_cat_id := v_booking.category_id;

    -- 2. Insert into booking_provider_requests for all eligible providers
    -- Conditions:
    -- a. is_online = true
    -- b. category_id in category_ids
    -- c. last_location_at within 5 minutes
    -- d. location_accuracy <= 80 (or your configured threshold)
    -- e. distance <= 10 km
    -- f. Not in an active job
    
    INSERT INTO public.booking_provider_requests (booking_id, provider_id, distance_km, status)
    SELECT p_booking_id, p.id, haversine_distance_km(v_booking.customer_latitude, v_booking.customer_longitude, pp.latitude, pp.longitude), 'pending'
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
    ON CONFLICT (booking_id, provider_id) DO NOTHING;

    GET DIAGNOSTICS v_provider_count = ROW_COUNT;

    -- 3. If no provider found
    IF v_provider_count = 0 THEN
        -- We do NOT cancel the booking immediately if we just want to say "Searching..." 
        -- but if the requirement is to show "No nearby professional available", we can either cancel or leave as pending.
        -- We will leave it as 'pending' but return a count of 0.
        RETURN json_build_object('success', true, 'message', 'No nearby professional available', 'count', 0, 'status', 'pending');
    END IF;

    RETURN json_build_object('success', true, 'count', v_provider_count, 'status', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.broadcast_booking_requests(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
