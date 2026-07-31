/*
# Add Category Groups and Expand Service Categories

## Purpose
Introduces a `service_category_groups` table so categories can be organized into
trustable groups (e.g. "Home Repairs", "Vehicle Services", "Education", etc.).
Also adds new categories for Education, Vehicle Services, and other service types
to broaden the service catalog.

## New Tables
- `service_category_groups`
  - `id` (uuid, PK)
  - `name_en` (text) — group name in English
  - `name_ml` (text) — group name in Malayalam
  - `icon_name` (text) — lucide icon name for the group
  - `color_theme` (text) — color theme key ('blue', 'teal', 'amber', etc.)
  - `sort_order` (integer, default 0)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now())

## Modified Tables
- `service_categories`
  - Adds `group_id` (uuid, FK -> service_category_groups.id, nullable)
  - Existing categories are assigned to appropriate groups

## Security
- RLS enabled on `service_category_groups`
- SELECT policy for anon + authenticated (public catalog data)
- No INSERT/UPDATE/DELETE for client apps (admin-managed)

## New Categories Added
- Education Tutoring (icon: GraduationCap, group: Education)
- Vehicle Repair (icon: Car, group: Vehicle Services)
- Bike Service (icon: Bike, group: Vehicle Services)
- Driving Lessons (icon: Car, group: Vehicle Services)
- Computer Repair (icon: Laptop, group: Home Repairs)
- Tailoring (icon: Scissors, group: Home Services)
- Gardening (icon: Leaf, group: Home Services)
*/

-- 1. Create service_category_groups table
CREATE TABLE IF NOT EXISTS service_category_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ml text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Layers',
  color_theme text NOT NULL DEFAULT 'blue',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_category_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_category_groups" ON service_category_groups;
CREATE POLICY "anon_select_category_groups" ON service_category_groups FOR SELECT
  TO anon, authenticated USING (true);

-- 2. Add group_id column to service_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_categories' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE service_categories ADD COLUMN group_id uuid REFERENCES service_category_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Seed category groups
INSERT INTO service_category_groups (name_en, name_ml, icon_name, color_theme, sort_order)
VALUES
  ('Home Repairs', 'വീട് അറ്റകെടുപ്പ്', 'Wrench', 'blue', 1),
  ('Vehicle Services', 'വാഹന സേവനങ്ങൾ', 'Car', 'teal', 2),
  ('Education', 'വിദ്യാഭ്യാസം', 'GraduationCap', 'amber', 3),
  ('Home Services', 'വീട്ട് സേവനങ്ങൾ', 'Sparkles', 'blue', 4),
  ('Personal Care', 'വ്യക്തിപരമായ പരിചരണം', 'Heart', 'teal', 5)
ON CONFLICT DO NOTHING;

-- 4. Assign existing categories to groups
UPDATE service_categories SET group_id = (
  SELECT id FROM service_category_groups WHERE name_en = 'Home Repairs'
) WHERE name_en IN ('Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Appliance Repair');

UPDATE service_categories SET group_id = (
  SELECT id FROM service_category_groups WHERE name_en = 'Home Services'
) WHERE name_en IN ('AC Repair', 'Cleaning', 'Pest Control');

UPDATE service_categories SET group_id = (
  SELECT id FROM service_category_groups WHERE name_en = 'Personal Care'
) WHERE name_en = 'Salon at Home';

-- 5. Add new categories
INSERT INTO service_categories (name_en, name_ml, icon_name, sort_order, is_active, group_id)
VALUES
  ('Tutoring', 'ട്യൂഷന്', 'GraduationCap', 10, true, (SELECT id FROM service_category_groups WHERE name_en = 'Education')),
  ('Vehicle Repair', 'വാഹന അറ്റകെടുപ്പ്', 'Car', 11, true, (SELECT id FROM service_category_groups WHERE name_en = 'Vehicle Services')),
  ('Bike Service', 'ബൈക്ക് സേവനം', 'Bike', 12, true, (SELECT id FROM service_category_groups WHERE name_en = 'Vehicle Services')),
  ('Driving Lessons', 'ഡ്രൈവിംഗ് പാഠങ്ങൾ', 'Car', 13, true, (SELECT id FROM service_category_groups WHERE name_en = 'Vehicle Services')),
  ('Computer Repair', 'കമ്പ്യൂട്ടർ റിപ്പയർ', 'Laptop', 14, true, (SELECT id FROM service_category_groups WHERE name_en = 'Home Repairs')),
  ('Tailoring', 'തയ്യൽ', 'Scissors', 15, true, (SELECT id FROM service_category_groups WHERE name_en = 'Home Services')),
  ('Gardening', 'പൂന്തോട്ട പരിപാലനം', 'Leaf', 16, true, (SELECT id FROM service_category_groups WHERE name_en = 'Home Services'))
ON CONFLICT DO NOTHING;

-- 6. Add a few subcategories for the new categories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'General Tutoring', 'പൊതുവായ ട്യൂഷന്', 'Home tutoring for school students', 'സ്കൂൾ വിദ്യാർത്ഥികൾക്കായി വീട്ടിൽ ട്യൂഷൻ', 300, 250, 500, 60, true
FROM service_categories c WHERE c.name_en = 'Tutoring'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'General Tutoring');

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'General Service', 'പൊതുവായ സേവനം', 'General vehicle service and inspection', 'പൊതുവായ വാഹന സേവനവും പരിശോധനയും', 500, 400, 1200, 90, true
FROM service_categories c WHERE c.name_en = 'Vehicle Repair'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'General Service');

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'General Service', 'പൊതുവായ സേവനം', 'General bike service and repair', 'പൊതുവായ ബൈക്ക് സേവനവും അറ്റകെടുപ്പും', 300, 250, 800, 60, true
FROM service_categories c WHERE c.name_en = 'Bike Service'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'General Service');

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Beginner Course', 'തുടക്കക്കാർക്കായ കോഴ്സ്', 'Driving lessons for beginners', 'തുടക്കക്കാർക്കായി ഡ്രൈവിംഗ് പാഠങ്ങൾ', 2000, 1500, 3500, 120, true
FROM service_categories c WHERE c.name_en = 'Driving Lessons'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'Beginner Course');

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'General Repair', 'പൊതുവായ അറ്റകെടുപ്പ്', 'Computer and laptop repair', 'കമ്പ്യൂട്ടർ, ലാപ്ടോപ് അറ്റകെടുപ്പ്', 400, 300, 1000, 60, true
FROM service_categories c WHERE c.name_en = 'Computer Repair'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'General Repair');

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'General Tailoring', 'പൊതുവായ തയ്യൽ', 'Custom tailoring and alterations', 'ഇഷ്ടാനുസൃത തയ്യലും മാറ്റങ്ങളും', 150, 100, 500, 45, true
FROM service_categories c WHERE c.name_en = 'Tailoring'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'General Tailoring');

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Garden Maintenance', 'പൂന്തോട്ട പരിപാലനം', 'Garden care and landscaping', 'പൂന്തോട്ട പരിചരണവും ലാൻഡ്സ്കേപ്പിംഗും', 300, 200, 800, 60, true
FROM service_categories c WHERE c.name_en = 'Gardening'
AND NOT EXISTS (SELECT 1 FROM service_subcategories s WHERE s.category_id = c.id AND s.name_en = 'Garden Maintenance');
