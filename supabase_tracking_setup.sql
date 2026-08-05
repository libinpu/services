-- Create delivery_tracking table
CREATE TABLE public.delivery_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    driver_id UUID NOT NULL, -- Assuming driver_id links to auth.users or similar
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;

-- Create an index for faster lookups by delivery_id
CREATE INDEX idx_delivery_tracking_delivery_id ON public.delivery_tracking(delivery_id);

-- Optional: Set up Row Level Security (RLS)
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated read access (adjust based on your auth setup)
CREATE POLICY "Allow public read access"
  ON public.delivery_tracking
  FOR SELECT
  USING (true);

-- Allow authenticated users (drivers) to update their location
CREATE POLICY "Allow authenticated insert/update"
  ON public.delivery_tracking
  FOR ALL
  USING (auth.role() = 'authenticated');
