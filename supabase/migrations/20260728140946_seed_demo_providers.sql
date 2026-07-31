/*
# Seed Demo Provider Accounts and Profiles

Creates 5 demo provider accounts and their provider profiles.
*/

DO $$
DECLARE
  v_uid1 uuid := gen_random_uuid();
  v_uid2 uuid := gen_random_uuid();
  v_uid3 uuid := gen_random_uuid();
  v_uid4 uuid := gen_random_uuid();
  v_uid5 uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_uid1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rajesh@seva.demo', crypt('demo123456', gen_salt('bf')), now(), '{"role":"provider"}'::jsonb, '{"full_name":"Rajesh Kumar"}'::jsonb, now(), now()),
    (v_uid2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'suresh@seva.demo', crypt('demo123456', gen_salt('bf')), now(), '{"role":"provider"}'::jsonb, '{"full_name":"Suresh Pillai"}'::jsonb, now(), now()),
    (v_uid3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anil@seva.demo', crypt('demo123456', gen_salt('bf')), now(), '{"role":"provider"}'::jsonb, '{"full_name":"Anil Menon"}'::jsonb, now(), now()),
    (v_uid4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vijayan@seva.demo', crypt('demo123456', gen_salt('bf')), now(), '{"role":"provider"}'::jsonb, '{"full_name":"Vijayan Nair"}'::jsonb, now(), now()),
    (v_uid5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mohan@seva.demo', crypt('demo123456', gen_salt('bf')), now(), '{"role":"provider"}'::jsonb, '{"full_name":"Mohan Das"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, role, full_name, phone, email, preferred_language, is_active)
  VALUES
    (v_uid1, 'provider', 'Rajesh Kumar', '+919876543210', 'rajesh@seva.demo', 'en', true),
    (v_uid2, 'provider', 'Suresh Pillai', '+919876543211', 'suresh@seva.demo', 'ml', true),
    (v_uid3, 'provider', 'Anil Menon', '+919876543212', 'anil@seva.demo', 'ml', true),
    (v_uid4, 'provider', 'Vijayan Nair', '+919876543213', 'vijayan@seva.demo', 'en', true),
    (v_uid5, 'provider', 'Mohan Das', '+919876543214', 'mohan@seva.demo', 'ml', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO provider_profiles (id, category_ids, specializations, experience_years, is_verified, background_check_status, rating_avg, rating_count, jobs_completed, is_online, price_per_hour, bio_en, bio_ml)
  VALUES
    (v_uid1, ARRAY['38e6e768-29ed-4708-9a23-6263ff010069']::uuid[], ARRAY['Pipe Repair','Tap Fitting','Drainage']::text[], 8, true, 'approved', 4.8, 127, 145, true, 250, 'Experienced plumber with 8+ years in residential and commercial plumbing.', '8 വർഷത്തെ അനുഭവമുള്ള പ്ലംബർ.'),
    (v_uid2, ARRAY['57387944-9510-49f0-9a09-a6be58b438b1']::uuid[], ARRAY['Wiring','Switch Repair','Short Circuit']::text[], 12, true, 'approved', 4.9, 203, 198, true, 300, 'Licensed electrician with 12+ years of experience.', '12 വർഷത്തെ അനുഭവമുള്ള ലൈസൻസ്ഡ് ഇലക്ട്രീഷ്യൻ.'),
    (v_uid3, ARRAY['5282bcf6-1005-40ff-89f7-dc7a906ff0e6']::uuid[], ARRAY['AC Service','Gas Refill','Cooling Issues']::text[], 6, true, 'approved', 4.7, 89, 102, true, 350, 'AC repair specialist for all brands and models.', 'എല്ലാ ബ്രാൻഡുകൾക്കുമുള്ള AC റിപ്പയർ വിദഗ്ദ്ധൻ.'),
    (v_uid4, ARRAY['0d292717-03b4-4e03-b253-23c49cdff503']::uuid[], ARRAY['Furniture Repair','Door Fitting','Woodwork']::text[], 10, true, 'approved', 4.8, 156, 167, true, 280, 'Master carpenter with expertise in furniture and woodwork.', 'ഫർണിച്ചർ, വുഡ്വർക്കിൽ വിദഗ്ദ്ധനായ കാർപ്പന്റർ.'),
    (v_uid5, ARRAY['3215c0d6-1832-425d-afea-a4ac0bf906d4']::uuid[], ARRAY['Interior Painting','Wall Painting','Waterproofing']::text[], 7, true, 'approved', 4.6, 78, 91, true, 220, 'Professional painter for interior and exterior walls.', 'പ്രൊഫഷണൽ പെയിന്റർ.')
  ON CONFLICT (id) DO NOTHING;
END $$;
