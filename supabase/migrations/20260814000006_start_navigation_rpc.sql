-- Transition booking from accepted → on_the_way (provider starts navigation)
CREATE OR REPLACE FUNCTION public.start_navigation(p_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking record;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Booking not found');
    END IF;

    IF v_booking.provider_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('error', 'Forbidden');
    END IF;

    IF v_booking.status <> 'accepted' THEN
        RETURN json_build_object('error', 'Booking must be in accepted state', 'current', v_booking.status);
    END IF;

    UPDATE public.bookings
    SET status = 'on_the_way', updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN json_build_object('success', true, 'status', 'on_the_way');
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_navigation(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
