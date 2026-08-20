-- Kerala-first trust signals, loyalty wallet, before/after job photos,
-- home-care subscriptions, maintenance reminders and neighborhood stats.

-- ---------------------------------------------------------------------------
-- 1. Provider trust signals
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS verified_aadhaar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_police boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aadhaar_url text,
  ADD COLUMN IF NOT EXISTS area_served text;

-- ---------------------------------------------------------------------------
-- 2. Loyalty wallet
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user
  ON public.loyalty_transactions (user_id, created_at DESC);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "select_own_loyalty_transactions" ON public.loyalty_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Points are awarded server-side when a booking is completed: 5% of the final
-- cost, 1 point = ₹1 on redemption.
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    v_points := GREATEST(floor(COALESCE(NEW.final_cost, NEW.estimated_cost, 0) * 0.05)::integer, 0);
    IF v_points > 0 THEN
      INSERT INTO loyalty_transactions (user_id, booking_id, points, reason)
      VALUES (NEW.customer_id, NEW.id, v_points, 'booking_completed');
      UPDATE profiles SET loyalty_points = loyalty_points + v_points
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_loyalty_points ON public.bookings;
CREATE TRIGGER trg_award_loyalty_points
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_points();

-- Redemption is capped at the caller's balance and recorded atomically.
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_booking_id uuid,
  p_points integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_redeem integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Invalid points amount';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM bookings WHERE id = p_booking_id AND customer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT loyalty_points INTO v_balance FROM profiles WHERE id = auth.uid() FOR UPDATE;
  v_redeem := LEAST(p_points, COALESCE(v_balance, 0));
  IF v_redeem <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE profiles SET loyalty_points = loyalty_points - v_redeem WHERE id = auth.uid();
  INSERT INTO loyalty_transactions (user_id, booking_id, points, reason)
  VALUES (auth.uid(), p_booking_id, -v_redeem, 'redeemed_at_checkout');
  RETURN v_redeem;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_points(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2b. Emergency bookings (priority pricing shown upfront)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_emergency boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_fee numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_used integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. Before/after job photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('before', 'after')),
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_photos_booking
  ON public.booking_photos (booking_id, phase, created_at);

ALTER TABLE public.booking_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booking_photos" ON public.booking_photos;
CREATE POLICY "select_booking_photos" ON public.booking_photos FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "insert_booking_photos" ON public.booking_photos;
CREATE POLICY "insert_booking_photos" ON public.booking_photos FOR INSERT
  TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id AND b.provider_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "booking_photos_read" ON storage.objects;
CREATE POLICY "booking_photos_read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'booking-photos');

DROP POLICY IF EXISTS "booking_photos_write" ON storage.objects;
CREATE POLICY "booking_photos_write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'booking-photos' AND owner = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Home Care subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ml text NOT NULL,
  description_en text,
  description_ml text,
  price numeric(10,2) NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  included_services integer NOT NULL DEFAULT 0,
  discount_percent integer NOT NULL DEFAULT 0,
  perks_en text[] NOT NULL DEFAULT '{}',
  perks_ml text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_subscription_plans" ON public.subscription_plans;
CREATE POLICY "read_subscription_plans" ON public.subscription_plans FOR SELECT
  TO authenticated USING (is_active OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  services_used integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
  ON public.user_subscriptions (user_id, status);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "select_own_subscriptions" ON public.user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "insert_own_subscriptions" ON public.user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "update_own_subscriptions" ON public.user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.subscription_plans
  (code, name_en, name_ml, description_en, description_ml, price, billing_period,
   included_services, discount_percent, perks_en, perks_ml, sort_order)
VALUES
  ('home_care_monthly', 'Home Care Monthly', 'ഹോം കെയർ പ്രതിമാസം',
   'Two included services every month plus priority booking',
   'എല്ലാ മാസവും രണ്ട് സേവനങ്ങൾ, മുൻഗണനാ ബുക്കിംഗ്',
   199, 'monthly', 2, 10,
   ARRAY['2 services included', 'Priority booking', '10% off extra jobs'],
   ARRAY['2 സേവനങ്ങൾ ഉൾപ്പെടുന്നു', 'മുൻഗണനാ ബുക്കിംഗ്', 'അധിക ജോലികൾക്ക് 10% ഇളവ്'],
   1),
  ('home_care_yearly', 'Home Care Yearly', 'ഹോം കെയർ വാർഷികം',
   'Full-year upkeep with 30 included services and free AC checkups',
   'വർഷം മുഴുവൻ പരിപാലനം, 30 സേവനങ്ങൾ, സൗജന്യ എസി പരിശോധന',
   1999, 'yearly', 30, 15,
   ARRAY['30 services included', 'Free AC checkups', '15% off extra jobs'],
   ARRAY['30 സേവനങ്ങൾ ഉൾപ്പെടുന്നു', 'സൗജന്യ എസി പരിശോധന', 'അധിക ജോലികൾക്ക് 15% ഇളവ്'],
   2)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Maintenance reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES public.service_subcategories(id) ON DELETE SET NULL,
  title text NOT NULL,
  interval_months integer NOT NULL DEFAULT 6,
  last_service_at timestamptz,
  next_due_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_due
  ON public.maintenance_reminders (user_id, next_due_at)
  WHERE is_active;

ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manage_own_reminders" ON public.maintenance_reminders;
CREATE POLICY "manage_own_reminders" ON public.maintenance_reminders FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Neighborhood booking stats + provider discovery with trust signals
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_provider_completed
  ON public.bookings (provider_id, status, created_at DESC);

DROP FUNCTION IF EXISTS public.find_nearby_providers(uuid, double precision, double precision, integer);

CREATE FUNCTION public.find_nearby_providers(
  p_subcategory_id uuid,
  p_customer_latitude double precision,
  p_customer_longitude double precision,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  provider_id uuid,
  display_name text,
  avatar_url text,
  rating_avg numeric,
  rating_count integer,
  jobs_completed integer,
  experience_years integer,
  is_verified boolean,
  verified_aadhaar boolean,
  verified_police boolean,
  area_served text,
  locality_bookings integer,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_radius_km constant double precision := 10;
  v_location_max_age constant interval := interval '5 minutes';
  v_accuracy_max_m constant double precision := 80;
  v_lat_delta double precision;
  v_lng_delta double precision;
  v_area text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_customer_latitude NOT BETWEEN -90 AND 90
     OR p_customer_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid service coordinates';
  END IF;

  SELECT category_id INTO v_category_id
  FROM service_subcategories
  WHERE id = p_subcategory_id AND is_active;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Service is not available';
  END IF;

  -- Locality of the caller, used for the "families near you booked" signal.
  SELECT a.area INTO v_area
  FROM addresses a
  WHERE a.user_id = auth.uid() AND a.area IS NOT NULL
  ORDER BY a.created_at DESC
  LIMIT 1;

  -- Bounding-box prefilter keeps the precise Haversine calculation small.
  v_lat_delta := v_radius_km / 111.045;
  v_lng_delta := v_radius_km / GREATEST(111.045 * cos(radians(p_customer_latitude)), 0.01);

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      pp.rating_avg,
      pp.rating_count,
      pp.jobs_completed,
      pp.experience_years,
      pp.is_verified,
      pp.verified_aadhaar,
      pp.verified_police,
      pp.area_served,
      haversine_distance_km(p_customer_latitude, p_customer_longitude, pp.latitude, pp.longitude) AS distance
    FROM profiles p
    JOIN provider_profiles pp ON pp.id = p.id
    WHERE p.role = 'provider'
      AND p.is_active
      AND pp.is_verified
      AND pp.background_check_status = 'approved'
      AND pp.is_online
      AND v_category_id = ANY(pp.category_ids)
      AND pp.latitude BETWEEN p_customer_latitude - v_lat_delta AND p_customer_latitude + v_lat_delta
      AND pp.longitude BETWEEN p_customer_longitude - v_lng_delta AND p_customer_longitude + v_lng_delta
      AND pp.last_location_at >= now() - v_location_max_age
      AND (pp.location_accuracy IS NULL OR pp.location_accuracy <= v_accuracy_max_m)
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.provider_id = p.id
          AND b.status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation')
      )
  )
  SELECT
    c.id, c.full_name, c.avatar_url, c.rating_avg, c.rating_count, c.jobs_completed,
    c.experience_years, c.is_verified, c.verified_aadhaar, c.verified_police, c.area_served,
    COALESCE((
      SELECT count(DISTINCT b.customer_id)
      FROM bookings b
      JOIN addresses a ON a.id = b.address_id
      WHERE b.provider_id = c.id
        AND b.status = 'completed'
        AND v_area IS NOT NULL
        AND a.area = v_area
    ), 0)::integer,
    round(c.distance::numeric, 2)
  FROM candidates c
  WHERE c.distance <= v_radius_km
  ORDER BY c.distance ASC, c.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END;
$$;

REVOKE ALL ON FUNCTION public.find_nearby_providers(uuid, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_providers(uuid, double precision, double precision, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
