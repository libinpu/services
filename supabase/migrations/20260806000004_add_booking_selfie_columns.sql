ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS start_selfie_url text,
  ADD COLUMN IF NOT EXISTS end_selfie_url text;
