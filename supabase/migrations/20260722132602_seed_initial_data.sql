/*
# Seed Initial Data for Seva

## Overview
Populates service_zones, service_categories, service_subcategories, and offers with launch data for Thrissur district.

## Data Inserted
1. **service_zones**: 1 row — Thrissur district, Kerala
2. **service_categories**: 9 rows — Plumbing, Electrical, AC Repair, Carpentry, Painting, Cleaning, Pest Control, Appliance Repair, Salon at Home
3. **service_subcategories**: 25+ rows across all categories with Malayalam names, descriptions, price ranges, and estimated times
4. **offers**: 3 promo banners for the home screen carousel
*/

-- Service Zone: Thrissur
INSERT INTO service_zones (name, state, district, is_active)
VALUES ('Thrissur', 'Kerala', 'Thrissur', true)
ON CONFLICT DO NOTHING;

-- Service Categories
INSERT INTO service_categories (name_en, name_ml, icon_name, sort_order, is_active) VALUES
('Plumbing', 'പ്ലംബിംഗ്', 'Wrench', 1, true),
('Electrical', 'ഇലക്ട്രിക്കൽ', 'Zap', 2, true),
('AC Repair', 'എസി റിപ്പയർ', 'Wind', 3, true),
('Carpentry', 'കാർപ്പൻട്രി', 'Hammer', 4, true),
('Painting', 'പെയിന്റിംഗ്', 'Paintbrush', 5, true),
('Cleaning', 'ക്ലീനിംഗ്', 'Sparkles', 6, true),
('Pest Control', 'പെസ്റ്റ് കൺട്രോൾ', 'Bug', 7, true),
('Appliance Repair', 'അപ്ലയൻസ് റിപ്പയർ', 'Refrigerator', 8, true),
('Salon at Home', 'വീട്ടിൽ സലൂൺ', 'Scissors', 9, true)
ON CONFLICT DO NOTHING;

-- Plumbing subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Tap Repair', 'ടാപ്പ് റിപ്പയർ', 'Fix leaking or broken taps', 'ചോർന്ന അല്ലെങ്കിൽ പൊട്ടിയ ടാപ്പുകൾ നന്നാക്കുക', 150, 100, 300, 45, true FROM service_categories c WHERE c.name_en = 'Plumbing'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Pipe Leakage', 'പൈപ്പ് ലീക്കേജ്', 'Repair leaking pipes and joints', 'ചോർന്ന പൈപ്പുകളും ജോയിന്റുകളും നന്നാക്കുക', 200, 150, 500, 60, true FROM service_categories c WHERE c.name_en = 'Plumbing'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Bathroom Fitting', 'ബാത്ത്റൂം ഫിറ്റിംഗ്', 'Install or repair bathroom fixtures', 'ബാത്ത്റൂം ഫിക്സറുകൾ ഇൻസ്റ്റാൾ ചെയ്യുക അല്ലെങ്കിൽ നന്നാക്കുക', 300, 200, 800, 90, true FROM service_categories c WHERE c.name_en = 'Plumbing'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'New Installation', 'പുതിയ ഇൻസ്റ്റലേഷൻ', 'Full plumbing installation for new construction', 'പുതിയ കെട്ടിടത്തിന് പൂർണ്ണ പ്ലംബിംഗ് ഇൻസ്റ്റലേഷൻ', 500, 500, 2000, 180, true FROM service_categories c WHERE c.name_en = 'Plumbing'
ON CONFLICT DO NOTHING;

-- Electrical subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Switch & Socket Repair', 'സ്വിച്ച് റിപ്പയർ', 'Fix faulty switches and sockets', 'കേടായ സ്വിച്ചുകളും സോക്കറ്റുകളും നന്നാക്കുക', 150, 100, 400, 45, true FROM service_categories c WHERE c.name_en = 'Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Fan Installation', 'ഫാൻ ഇൻസ്റ്റലേഷൻ', 'Install or repair ceiling fans', 'സീലിംഗ് ഫാനുകൾ ഇൻസ്റ്റാൾ ചെയ്യുക അല്ലെങ്കിൽ നന്നാക്കുക', 250, 200, 500, 60, true FROM service_categories c WHERE c.name_en = 'Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Light Fitting', 'ലൈറ്റ് ഫിറ്റിംഗ്', 'Install or repair light fixtures', 'ലൈറ്റ് ഫിക്സറുകൾ ഇൻസ്റ്റാൾ ചെയ്യുക അല്ലെങ്കിൽ നന്നാക്കുക', 200, 150, 600, 60, true FROM service_categories c WHERE c.name_en = 'Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Wiring & Rewiring', 'വയറിംഗ്', 'Full or partial house wiring', 'പൂർണ്ണ അല്ലെങ്കിൽ ഭാഗിക വയറിംഗ്', 500, 500, 3000, 240, true FROM service_categories c WHERE c.name_en = 'Electrical'
ON CONFLICT DO NOTHING;

-- AC Repair subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'AC Service', 'എസി സർവീസ്', 'General AC servicing and cleaning', 'പൊതുവായ എസി സർവീസും ക്ലീനിംഗും', 400, 300, 600, 90, true FROM service_categories c WHERE c.name_en = 'AC Repair'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Gas Refilling', 'ഗ്യാസ് റീഫിലിംഗ്', 'AC gas refill and pressure check', 'എസി ഗ്യാസ് റീഫിൽ, പ്രഷർ ചെക്ക്', 1500, 1200, 2500, 90, true FROM service_categories c WHERE c.name_en = 'AC Repair'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'AC Installation', 'എസി ഇൻസ്റ്റലേഷൻ', 'Install new AC unit', 'പുതിയ എസി യൂണിറ്റ് ഇൻസ്റ്റാൾ ചെയ്യുക', 1500, 1000, 2500, 120, true FROM service_categories c WHERE c.name_en = 'AC Repair'
ON CONFLICT DO NOTHING;

-- Carpentry subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Furniture Repair', 'ഫർണിച്ചർ റിപ്പയർ', 'Repair wooden furniture', 'മരപ്പണി ഫർണിച്ചർ നന്നാക്കുക', 250, 200, 800, 90, true FROM service_categories c WHERE c.name_en = 'Carpentry'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Door Repair', 'ഡോർ റിപ്പയർ', 'Fix doors, hinges, and locks', 'ഡോറുകൾ, ഹിഞ്ചുകൾ, ലോക്കുകൾ നന്നാക്കുക', 200, 150, 500, 60, true FROM service_categories c WHERE c.name_en = 'Carpentry'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Custom Woodwork', 'കസ്റ്റം വുഡ്വർക്ക്', 'Custom shelves, cabinets, and woodwork', 'കസ്റ്റം ഷെൽഫുകൾ, ക്യാബിനറ്റുകൾ, മരപ്പണി', 500, 500, 5000, 240, true FROM service_categories c WHERE c.name_en = 'Carpentry'
ON CONFLICT DO NOTHING;

-- Painting subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Interior Painting', 'ഇന്റീരിയർ പെയിന്റിംഗ്', 'Paint interior walls and ceilings', 'അകത്തെ ഭിത്തികളും മേൽക്കൂരയും പെയിന്റ് ചെയ്യുക', 15, 15, 25, 480, true FROM service_categories c WHERE c.name_en = 'Painting'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Exterior Painting', 'എക്സ്റ്റീരിയർ പെയിന്റിംഗ്', 'Paint exterior walls', 'പുറംഭിത്തികൾ പെയിന്റ് ചെയ്യുക', 20, 20, 35, 480, true FROM service_categories c WHERE c.name_en = 'Painting'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Waterproofing', 'വാട്ടർപ്രൂഫിംഗ്', 'Waterproof coating for walls and terrace', 'ഭിത്തികൾക്കും ടെറസിനും വാട്ടർപ്രൂഫിംഗ്', 30, 30, 50, 240, true FROM service_categories c WHERE c.name_en = 'Painting'
ON CONFLICT DO NOTHING;

-- Cleaning subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Deep Home Cleaning', 'ഡീപ് ക്ലീനിംഗ്', 'Full deep cleaning of home', 'വീട് പൂർണ്ണമായി വൃത്തിയാക്കൽ', 2000, 1500, 4000, 240, true FROM service_categories c WHERE c.name_en = 'Cleaning'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Bathroom Cleaning', 'ബാത്ത്റൂം ക്ലീനിംഗ്', 'Deep clean bathrooms', 'ബാത്ത്റൂമുകൾ വൃത്തിയാക്കൽ', 300, 200, 500, 90, true FROM service_categories c WHERE c.name_en = 'Cleaning'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Kitchen Cleaning', 'കിച്ചൺ ക്ലീനിംഗ്', 'Deep clean kitchen and appliances', 'അടുക്കളയും ഉപകരണങ്ങളും വൃത്തിയാക്കൽ', 500, 400, 800, 120, true FROM service_categories c WHERE c.name_en = 'Cleaning'
ON CONFLICT DO NOTHING;

-- Pest Control subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Cockroach & Ant Control', 'പ്രാണി നിയന്ത്രണം', 'Treatment for cockroaches and ants', 'പാറാൻ, ഉറുമ്പ് നിയന്ത്രണം', 500, 400, 800, 60, true FROM service_categories c WHERE c.name_en = 'Pest Control'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Termite Control', 'തേയില ഈച്ച നിയന്ത്രണം', 'Termite treatment and prevention', 'തേയില ഈച്ച നിയന്ത്രണം', 1000, 800, 2000, 120, true FROM service_categories c WHERE c.name_en = 'Pest Control'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Rodent Control', 'എലി നിയന്ത്രണം', 'Rat and rodent control treatment', 'എലി നിയന്ത്രണ ചികിത്സ', 800, 600, 1500, 90, true FROM service_categories c WHERE c.name_en = 'Pest Control'
ON CONFLICT DO NOTHING;

-- Appliance Repair subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Washing Machine Repair', 'വാഷിംഗ് മെഷീൻ റിപ്പയർ', 'Repair washing machine issues', 'വാഷിംഗ് മെഷീൻ നന്നാക്കുക', 300, 250, 800, 90, true FROM service_categories c WHERE c.name_en = 'Appliance Repair'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Refrigerator Repair', 'ഫ്രിഡ്ജ് റിപ്പയർ', 'Repair refrigerator issues', 'ഫ്രിഡ്ജ് നന്നാക്കുക', 300, 250, 800, 90, true FROM service_categories c WHERE c.name_en = 'Appliance Repair'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Water Heater Repair', 'വാട്ടർ ഹീറ്റർ റിപ്പയർ', 'Repair geyser and water heater', 'ഗീസർ, വാട്ടർ ഹീറ്റർ നന്നാക്കുക', 300, 250, 600, 60, true FROM service_categories c WHERE c.name_en = 'Appliance Repair'
ON CONFLICT DO NOTHING;

-- Salon at Home subcategories
INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Haircut at Home', 'വീട്ടിൽ ഹെയർകട്ട്', 'Professional haircut at home', 'വീട്ടിൽ പ്രൊഫഷണൽ ഹെയർകട്ട്', 200, 150, 300, 30, true FROM service_categories c WHERE c.name_en = 'Salon at Home'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Facial at Home', 'വീട്ടിൽ ഫേഷ്യൽ', 'Facial treatment at home', 'വീട്ടിൽ ഫേഷ്യൽ ട്രീറ്റ്മെന്റ്', 500, 400, 800, 60, true FROM service_categories c WHERE c.name_en = 'Salon at Home'
ON CONFLICT DO NOTHING;

INSERT INTO service_subcategories (category_id, name_en, name_ml, description_en, description_ml, base_price, estimated_price_min, estimated_price_max, estimated_time_mins, is_active)
SELECT c.id, 'Beard Trim & Shave', 'ബിയർഡ് ട്രിം & ഷേവ്', 'Beard grooming at home', 'വീട്ടിൽ ബിയർഡ് ഗ്രൂമിംഗ്', 150, 100, 250, 30, true FROM service_categories c WHERE c.name_en = 'Salon at Home'
ON CONFLICT DO NOTHING;

-- Offers
INSERT INTO offers (title_en, title_ml, description_en, description_ml, discount_text_en, discount_text_ml, is_active, sort_order) VALUES
('First Booking Offer', 'ആദ്യ ബുക്കിംഗ് ഓഫർ', 'Get 50% off on your first booking', 'നിങ്ങളുടെ ആദ്യ ബുക്കിംഗിൽ 50% കിഴിവ്', '50% OFF', '50% കിഴിവ്', true, 1),
('AC Service Combo', 'എസി സർവീസ് കോമ്പോ', 'Book 2 AC services and get 20% off', '2 എസി സർവീസ് ബുക്ക് ചെയ്താൽ 20% കിഴിവ്', '20% OFF', '20% കിഴിവ്', true, 2),
('Refer & Earn', 'റഫർ & ഇാൺ', 'Refer a friend and both get ₹100 credit', 'സുഹൃത്തിനെ റഫർ ചെയ്ത് രണ്ടുപേർക്കും ₹100 ക്രെഡിറ്റ്', '₹100 CREDIT', '₹100 ക്രെഡിറ്റ്', true, 3)
ON CONFLICT DO NOTHING;