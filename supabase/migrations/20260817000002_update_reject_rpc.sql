-- Update reject_booking to work with booking_provider_requests
CREATE OR REPLACE FUNCTION public.reject_booking(p_booking_id uuid, p_reason text DEFAULT 'Provider rejected the job')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  -- Verify the request exists for this provider
  IF NOT EXISTS (
    SELECT 1 FROM public.booking_provider_requests
    WHERE booking_id = p_booking_id AND provider_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN json_build_object('error', 'Request not found or already processed');
  END IF;

  -- Mark the request as rejected
  UPDATE public.booking_provider_requests
  SET status = 'rejected', responded_at = NOW()
  WHERE booking_id = p_booking_id AND provider_id = auth.uid();

  -- We do not change the bookings status, because it should stay 'pending' for other providers to accept
  RETURN json_build_object('success', true, 'status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_booking(uuid, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
