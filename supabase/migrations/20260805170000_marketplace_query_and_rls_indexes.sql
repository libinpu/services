-- Hot-path indexes for PostgREST filters, foreign-key embeds, ordering, and
-- RLS EXISTS checks. All are safe to apply repeatedly.
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status_created
  ON public.bookings (customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_status_created
  ON public.bookings (provider_id, status, created_at DESC)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_pending_unassigned_created
  ON public.bookings (created_at DESC)
  WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_address_id
  ON public.bookings (address_id)
  WHERE address_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id
  ON public.booking_items (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_created
  ON public.chat_messages (booking_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_created
  ON public.reviews (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role, created_at DESC);

-- provider_applications.user_id is already indexed in the RLS repair migration;
-- keep this statement to make deployments from older database snapshots safe.
CREATE INDEX IF NOT EXISTS idx_provider_applications_user_created
  ON public.provider_applications (user_id, created_at DESC);
