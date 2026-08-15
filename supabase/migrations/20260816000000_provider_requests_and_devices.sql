-- 1. Create booking_provider_requests table
CREATE TABLE IF NOT EXISTS public.booking_provider_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired, lost, cancelled
    distance_km numeric,
    created_at timestamptz DEFAULT NOW(),
    expires_at timestamptz DEFAULT NOW() + interval '5 minutes',
    responded_at timestamptz,
    CONSTRAINT unique_booking_provider UNIQUE (booking_id, provider_id),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'lost', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_provider_requests_booking_id ON public.booking_provider_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_provider_requests_provider_id ON public.booking_provider_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_provider_requests_status ON public.booking_provider_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_provider_requests_created_at ON public.booking_provider_requests(created_at);

-- RLS for booking_provider_requests
ALTER TABLE public.booking_provider_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own requests"
    ON public.booking_provider_requests
    FOR SELECT
    USING (auth.uid() = provider_id);

CREATE POLICY "Customers can view requests for their bookings"
    ON public.booking_provider_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = booking_provider_requests.booking_id
            AND bookings.customer_id = auth.uid()
        )
    );

-- Providers can only update their own requests (e.g. to reject, but acceptance is handled securely via Edge Function)
CREATE POLICY "Providers can update their own requests"
    ON public.booking_provider_requests
    FOR UPDATE
    USING (auth.uid() = provider_id);

-- 2. Create provider_devices table for secure push tokens
CREATE TABLE IF NOT EXISTS public.provider_devices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token text NOT NULL,
    device_model text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    CONSTRAINT unique_provider_token UNIQUE (provider_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_provider_devices_provider_id ON public.provider_devices(provider_id);

-- RLS for provider_devices (strictly private to the provider)
ALTER TABLE public.provider_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their own devices"
    ON public.provider_devices
    FOR ALL
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

-- 3. Migrate existing push tokens from provider_profiles securely
INSERT INTO public.provider_devices (provider_id, push_token)
SELECT id, push_token
FROM public.provider_profiles
WHERE push_token IS NOT NULL
ON CONFLICT DO NOTHING;

-- Revoke public access to push_token column in provider_profiles if we can (optional, but a good practice)
-- Instead of complex column grants, we just expect clients to stop reading/writing push_token to provider_profiles.
