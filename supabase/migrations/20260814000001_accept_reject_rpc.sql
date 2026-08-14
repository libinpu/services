-- RPC: accept_booking
-- Provider accepts an assigned booking → on_the_way
CREATE OR REPLACE FUNCTION public.accept_booking(p_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_active_count integer;
BEGIN
  -- Fetch the booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found');
  END IF;

  -- Only the assigned provider may accept
  IF v_booking.provider_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('error', 'Forbidden');
  END IF;

  -- Must be in assigned state
  IF v_booking.status <> 'assigned' THEN
    RETURN json_build_object('error', 'Booking is not awaiting acceptance');
  END IF;

  -- Provider must not already have an active job
  SELECT COUNT(*) INTO v_active_count
  FROM bookings
  WHERE provider_id = auth.uid()
    AND status IN ('accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation')
    AND id <> p_booking_id;

  IF v_active_count > 0 THEN
    RETURN json_build_object('error', 'You already have an active job');
  END IF;

  -- Accept: transition to on_the_way
  UPDATE bookings
  SET status = 'on_the_way', updated_at = now()
  WHERE id = p_booking_id;

  RETURN json_build_object('success', true, 'status', 'on_the_way');
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_booking(uuid) TO authenticated;

-- RPC: reject_booking
-- Provider rejects an assigned booking → back to pending (auto-assign may retry)
CREATE OR REPLACE FUNCTION public.reject_booking(p_booking_id uuid, p_reason text DEFAULT 'Provider rejected the job')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found');
  END IF;

  IF v_booking.provider_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('error', 'Forbidden');
  END IF;

  IF v_booking.status <> 'assigned' THEN
    RETURN json_build_object('error', 'Booking is not awaiting acceptance');
  END IF;

  UPDATE bookings
  SET
    status = 'pending',
    provider_id = NULL,
    cancellation_reason = p_reason,
    updated_at = now()
  WHERE id = p_booking_id;

  RETURN json_build_object('success', true, 'status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_booking(uuid, text) TO authenticated;
