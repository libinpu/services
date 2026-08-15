-- Secure active-job tracking table
CREATE TABLE IF NOT EXISTS public.booking_provider_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.booking_provider_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Insert own booking locations" ON public.booking_provider_locations;
DROP POLICY IF EXISTS "Select booking locations for participants" ON public.booking_provider_locations;

-- Only the assigned provider can write to their booking location
CREATE POLICY "Insert own booking locations" ON public.booking_provider_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = provider_id 
        AND EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND b.provider_id = auth.uid() AND b.status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress')
        )
    );

-- Only booking customer/provider or admin can read booking locations
CREATE POLICY "Select booking locations for participants" ON public.booking_provider_locations
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = provider_id 
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND b.customer_id = auth.uid()
        )
    );

-- Enable Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'booking_provider_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_provider_locations;
  END IF;
END $$;

-- Drop legacy/obsolete public delivery_tracking table
DROP TABLE IF EXISTS public.delivery_tracking CASCADE;
