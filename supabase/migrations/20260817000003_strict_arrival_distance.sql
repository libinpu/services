-- Update mark_booking_arrived to enforce strict 50m distance and consecutive readings
CREATE OR REPLACE FUNCTION public.mark_booking_arrived(
    p_booking_id uuid,
    p_latitude numeric,
    p_longitude numeric,
    p_accuracy numeric,
    p_consecutive_readings integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking record;
    v_dist_meters numeric;
    v_otp text;
    v_otp_hash text;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Booking not found');
    END IF;

    IF v_booking.provider_id != auth.uid() THEN
        RETURN json_build_object('error', 'Forbidden');
    END IF;

    IF v_booking.status != 'on_the_way' THEN
        RETURN json_build_object('error', 'Job must be on the way to mark arrived');
    END IF;

    IF p_accuracy IS NOT NULL AND p_accuracy > 80 THEN
        RETURN json_build_object('error', 'GPS accuracy too low for arrival (must be <= 80m)');
    END IF;

    IF p_consecutive_readings < 3 THEN
        RETURN json_build_object('error', 'Insufficient consecutive arrival readings. Require at least 3.');
    END IF;

    -- Calculate distance
    IF v_booking.customer_latitude IS NOT NULL AND v_booking.customer_longitude IS NOT NULL AND p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        v_dist_meters := haversine_distance_km(
            v_booking.customer_latitude, v_booking.customer_longitude,
            p_latitude, p_longitude
        ) * 1000;

        IF v_dist_meters > 50 THEN
            RETURN json_build_object('error', 'Too far from customer to mark arrived (' || ROUND(v_dist_meters) || 'm). Must be within 50m.', 'distanceMeters', v_dist_meters);
        END IF;
    END IF;

    -- Generate OTP
    v_otp := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_otp_hash := encode(digest(v_otp, 'sha256'), 'hex');

    UPDATE public.bookings
    SET status = 'arrived',
        otp = v_otp,
        otp_hash = v_otp_hash,
        otp_expires_at = NOW() + INTERVAL '15 minutes',
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN json_build_object('success', true, 'status', 'arrived');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_booking_arrived(uuid, numeric, numeric, numeric, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
