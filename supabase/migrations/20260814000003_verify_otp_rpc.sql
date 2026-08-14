-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify OTP and mark booking as in_progress
CREATE OR REPLACE FUNCTION verify_booking_otp(p_booking_id uuid, p_otp text)
RETURNS json AS $$
DECLARE
    v_booking record;
    v_entered_hash text;
    v_is_valid boolean := false;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Booking not found');
    END IF;

    IF v_booking.provider_id != auth.uid() THEN
        RETURN json_build_object('error', 'Forbidden');
    END IF;

    IF v_booking.status != 'arrived' THEN
        RETURN json_build_object('error', 'Invalid job state for OTP verification');
    END IF;

    IF v_booking.otp_verified THEN
        RETURN json_build_object('error', 'OTP already used');
    END IF;

    IF COALESCE(v_booking.otp_attempts, 0) >= 5 THEN
        RETURN json_build_object('error', 'Too many OTP attempts');
    END IF;

    IF v_booking.otp_expires_at IS NOT NULL AND v_booking.otp_expires_at < NOW() THEN
        RETURN json_build_object('error', 'OTP expired');
    END IF;

    v_entered_hash := encode(digest(p_otp, 'sha256'), 'hex');

    IF v_booking.otp_hash IS NOT NULL THEN
        v_is_valid := (v_entered_hash = v_booking.otp_hash);
    ELSIF v_booking.otp IS NOT NULL AND p_otp ~ '^\d{4}$' THEN
        v_is_valid := (p_otp = v_booking.otp);
    END IF;

    IF NOT v_is_valid THEN
        UPDATE public.bookings
        SET otp_attempts = COALESCE(otp_attempts, 0) + 1,
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        RETURN json_build_object('error', 'Incorrect OTP');
    END IF;

    UPDATE public.bookings
    SET otp_verified = true,
        status = 'in_progress',
        started_at = NOW(),
        otp_hash = null,
        otp = null,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN json_build_object('success', true, 'status', 'in_progress');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
