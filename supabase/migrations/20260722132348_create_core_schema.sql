/*
# Seva — Core Schema for Service Marketplace

## Overview
Creates the foundational schema for a local-service marketplace connecting customers with verified service professionals.
Designed for Thrissur district at launch, with `service_zones` table so new regions (Ernakulam, Palakkad, etc.) can be added as data rows — no schema rebuild.

## New Tables

1. **service_zones** — Geographic regions the app operates in (Thrissur at launch; expand later).
   - `id`, `name`, `state`, `district`, `is_active`, `created_at`

2. **service_categories** — Top-level service types (Plumbing, Electrical, etc.).
   - `id`, `name_en`, `name_ml`, `icon_name`, `sort_order`, `is_active`, `created_at`

3. **service_subcategories** — Sub-services under each category (Tap repair, Pipe leakage, etc.).
   - `id`, `category_id` (FK → service_categories), `name_en`, `name_ml`, `description_en`, `description_ml`, `base_price`, `estimated_price_min`, `estimated_price_max`, `estimated_time_mins`, `is_active`, `created_at`

4. **profiles** — Extends `auth.users` with app-specific data. `role` distinguishes customer vs provider.
   - `id` (= auth.users.id, FK), `role` ('customer' | 'provider' | 'admin'), `full_name`, `phone`, `email`, `avatar_url`, `preferred_language` ('ml' | 'en'), `zone_id` (FK → service_zones, nullable), `is_active`, `created_at`, `updated_at`

5. **provider_profiles** — Extra data for service professionals.
   - `id` (= profiles.id, FK), `category_ids` (uuid[]), `specializations` (text[]), `experience_years`, `is_verified`, `background_check_status` ('pending' | 'approved' | 'rejected'), `rating_avg`, `rating_count`, `jobs_completed`, `is_online`, `price_per_hour`, `zone_id` (FK → service_zones), `bio_en`, `bio_ml`, `id_proof_url`, `address_proof_url`, `police_verification_url`, `created_at`, `updated_at`

6. **addresses** — Saved addresses for customers (Home, Work, custom).
   - `id`, `user_id` (FK → profiles), `label`, `address_line`, `area`, `city`, `district`, `state`, `pincode`, `latitude`, `longitude`, `is_in_service_zone`, `created_at`

7. **bookings** — Core booking record linking customer, provider, subcategory, address, and status.
   - `id`, `customer_id` (FK → profiles), `provider_id` (FK → profiles), `subcategory_id` (FK → service_subcategories), `address_id` (FK → addresses), `zone_id` (FK → service_zones), `status` ('pending' | 'accepted' | 'on_the_way' | 'arrived' | 'in_progress' | 'awaiting_confirmation' | 'completed' | 'cancelled' | 'rejected'), `scheduled_at`, `booking_mode` ('auto' | 'manual'), `estimated_cost`, `final_cost`, `payment_method` ('cash' | 'upi' | 'card' | 'wallet'), `payment_status` ('pending' | 'paid' | 'failed'), `otp`, `otp_verified`, `started_at`, `completed_at`, `cancelled_at`, `cancellation_reason`, `created_at`, `updated_at`

8. **booking_items** — Itemized charges for a booking (base service + any extra work).
   - `id`, `booking_id` (FK → bookings), `description_en`, `description_ml`, `amount`, `is_approved_by_customer`, `created_at`

9. **reviews** — Customer feedback for providers.
   - `id`, `booking_id` (FK → bookings), `customer_id` (FK → profiles), `provider_id` (FK → profiles), `rating` (1–5), `tags` (text[]), `comment`, `photo_url`, `created_at`

10. **chat_messages** — In-app chat between customer and provider for a booking.
    - `id`, `booking_id` (FK → bookings), `sender_id` (FK → profiles), `message`, `created_at`

11. **wallets** — Customer wallet for credits/referral rewards.
    - `id`, `user_id` (FK → profiles), `balance`, `created_at`, `updated_at`

12. **wallet_transactions** — Wallet credit/debit ledger.
    - `id`, `wallet_id` (FK → wallets), `type` ('credit' | 'debit'), `amount`, `description`, `booking_id` (FK → bookings, nullable), `created_at`

13. **offers** — Promo banners shown on home screen.
    - `id`, `title_en`, `title_ml`, `description_en`, `description_ml`, `image_url`, `discount_text_en`, `discount_text_ml`, `is_active`, `sort_order`, `created_at`

## Security
- RLS enabled on ALL tables.
- `profiles`, `addresses`, `bookings`, `booking_items`, `reviews`, `chat_messages`, `wallets`, `wallet_transactions` → owner-scoped (authenticated, auth.uid() check).
- `service_zones`, `service_categories`, `service_subcategories`, `offers` → public read (anon + authenticated), no writes from client.
- `provider_profiles` → public read (customers browse providers), write restricted to the provider owner.

## Important Notes
1. `service_zones` table is the region-expansion mechanism — adding a new district is an INSERT, not a schema change.
2. `profiles.role` lets the same auth system serve customer app, provider app, and admin panel.
3. `bookings.otp` is generated server-side and shared verbally by the customer to the provider on arrival.
4. `booking_items.is_approved_by_customer` enforces the "extra charges must be approved" rule.
5. `provider_profiles.background_check_status` powers the "verified" badge trust signal.
*/

-- 1. service_zones
CREATE TABLE IF NOT EXISTS service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_service_zones" ON service_zones;
CREATE POLICY "public_read_service_zones" ON service_zones FOR SELECT
  TO anon, authenticated USING (true);

-- 2. service_categories
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ml text NOT NULL,
  icon_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_service_categories" ON service_categories;
CREATE POLICY "public_read_service_categories" ON service_categories FOR SELECT
  TO anon, authenticated USING (true);

-- 3. service_subcategories
CREATE TABLE IF NOT EXISTS service_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ml text NOT NULL,
  description_en text,
  description_ml text,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  estimated_price_min numeric(10,2) NOT NULL DEFAULT 0,
  estimated_price_max numeric(10,2) NOT NULL DEFAULT 0,
  estimated_time_mins int NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_service_subcategories" ON service_subcategories;
CREATE POLICY "public_read_service_subcategories" ON service_subcategories FOR SELECT
  TO anon, authenticated USING (true);

-- 4. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin')),
  full_name text,
  phone text,
  email text,
  avatar_url text,
  preferred_language text NOT NULL DEFAULT 'ml' CHECK (preferred_language IN ('ml', 'en')),
  zone_id uuid REFERENCES service_zones(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. provider_profiles
CREATE TABLE IF NOT EXISTS provider_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  category_ids uuid[] NOT NULL DEFAULT '{}',
  specializations text[] NOT NULL DEFAULT '{}',
  experience_years int NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  background_check_status text NOT NULL DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  rating_avg numeric(3,2) NOT NULL DEFAULT 0.00,
  rating_count int NOT NULL DEFAULT 0,
  jobs_completed int NOT NULL DEFAULT 0,
  is_online boolean NOT NULL DEFAULT false,
  price_per_hour numeric(10,2) NOT NULL DEFAULT 0,
  zone_id uuid REFERENCES service_zones(id),
  bio_en text,
  bio_ml text,
  id_proof_url text,
  address_proof_url text,
  police_verification_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_provider_profiles" ON provider_profiles;
CREATE POLICY "public_read_provider_profiles" ON provider_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "update_own_provider_profile" ON provider_profiles;
CREATE POLICY "update_own_provider_profile" ON provider_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_provider_profile" ON provider_profiles;
CREATE POLICY "insert_own_provider_profile" ON provider_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- 6. addresses
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  address_line text NOT NULL,
  area text,
  city text,
  district text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  is_in_service_zone boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_addresses" ON addresses;
CREATE POLICY "select_own_addresses" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_addresses" ON addresses;
CREATE POLICY "insert_own_addresses" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_addresses" ON addresses;
CREATE POLICY "update_own_addresses" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_addresses" ON addresses;
CREATE POLICY "delete_own_addresses" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 7. bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subcategory_id uuid NOT NULL REFERENCES service_subcategories(id) ON DELETE RESTRICT,
  address_id uuid REFERENCES addresses(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES service_zones(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled', 'rejected')),
  scheduled_at timestamptz,
  booking_mode text NOT NULL DEFAULT 'auto' CHECK (booking_mode IN ('auto', 'manual')),
  estimated_cost numeric(10,2) NOT NULL DEFAULT 0,
  final_cost numeric(10,2),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'wallet')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  otp text,
  otp_verified boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookings" ON bookings;
CREATE POLICY "select_own_bookings" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "insert_own_bookings" ON bookings;
CREATE POLICY "insert_own_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "update_own_bookings" ON bookings;
CREATE POLICY "update_own_bookings" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = provider_id);

-- 8. booking_items
CREATE TABLE IF NOT EXISTS booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  description_en text NOT NULL,
  description_ml text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  is_approved_by_customer boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_booking_items" ON booking_items;
CREATE POLICY "select_own_booking_items" ON booking_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_items.booking_id AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid()))
  );

DROP POLICY IF EXISTS "insert_own_booking_items" ON booking_items;
CREATE POLICY "insert_own_booking_items" ON booking_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_items.booking_id AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid()))
  );

DROP POLICY IF EXISTS "update_own_booking_items" ON booking_items;
CREATE POLICY "update_own_booking_items" ON booking_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_items.booking_id AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid()))
  );

-- 9. reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags text[] NOT NULL DEFAULT '{}',
  comment text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reviews" ON reviews;
CREATE POLICY "select_own_reviews" ON reviews FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

-- 10. chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = chat_messages.booking_id AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid()))
  );

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = chat_messages.booking_id AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid()))
  );

-- 11. wallets
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet" ON wallets;
CREATE POLICY "select_own_wallet" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallet" ON wallets;
CREATE POLICY "insert_own_wallet" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallet" ON wallets;
CREATE POLICY "update_own_wallet" ON wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 12. wallet_transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric(10,2) NOT NULL,
  description text,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet_transactions" ON wallet_transactions;
CREATE POLICY "select_own_wallet_transactions" ON wallet_transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_wallet_transactions" ON wallet_transactions;
CREATE POLICY "insert_own_wallet_transactions" ON wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid())
  );

-- 13. offers
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_ml text NOT NULL,
  description_en text,
  description_ml text,
  image_url text,
  discount_text_en text,
  discount_text_ml text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_offers" ON offers;
CREATE POLICY "public_read_offers" ON offers FOR SELECT
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON service_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_chat_booking ON chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_zone ON provider_profiles(zone_id);