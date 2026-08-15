-- Atomic acceptance of a booking request
CREATE OR REPLACE FUNCTION atomic_accept_booking(p_booking_id uuid)
RETURNS json AS $$
DECLARE
    v_booking record;
    v_provider_id uuid;
BEGIN
    v_provider_id := auth.uid();
    
    -- 1. Lock the booking row for update to prevent concurrent modifications
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Booking not found');
    END IF;

    -- 2. Verify booking is still pending
    IF v_booking.status != 'pending' THEN
        RETURN json_build_object('error', 'Booking is no longer available', 'status', v_booking.status);
    END IF;

    -- 3. Verify provider request exists and is pending
    IF NOT EXISTS (
        SELECT 1 FROM public.booking_provider_requests
        WHERE booking_id = p_booking_id 
          AND provider_id = v_provider_id
          AND status = 'pending'
          AND expires_at > NOW()
    ) THEN
        RETURN json_build_object('error', 'Request not found, expired, or already processed');
    END IF;

    -- 4. Mark this request as accepted
    UPDATE public.booking_provider_requests
    SET status = 'accepted', responded_at = NOW()
    WHERE booking_id = p_booking_id AND provider_id = v_provider_id;

    -- 5. Mark all other requests for this booking as lost
    UPDATE public.booking_provider_requests
    SET status = 'lost', responded_at = NOW()
    WHERE booking_id = p_booking_id AND provider_id != v_provider_id AND status = 'pending';

    -- 6. Update booking
    UPDATE public.bookings
    SET status = 'assigned',
        provider_id = v_provider_id,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN json_build_object('success', true, 'status', 'assigned');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.atomic_accept_booking(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
