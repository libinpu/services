-- Add a GIN index on provider_profiles.category_ids for fast array containment (@>) queries.
-- Without this, every "find providers by category" query does a full sequential scan.
-- GIN index makes array containment (cs filter in PostgREST = @> operator) O(log n).

CREATE INDEX IF NOT EXISTS idx_provider_profiles_category_ids
  ON public.provider_profiles USING GIN (category_ids);

-- Also index is_online so filtering online-only providers is instant
CREATE INDEX IF NOT EXISTS idx_provider_profiles_is_online
  ON public.provider_profiles (is_online)
  WHERE is_online = true;

-- Index bookings by customer so the customer's booking list loads fast
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings (customer_id, created_at DESC);

-- Index bookings by provider so provider dashboard loads fast  
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id
  ON public.bookings (provider_id, created_at DESC);
