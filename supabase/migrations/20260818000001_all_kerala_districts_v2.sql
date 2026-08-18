-- Ensure all 14 Kerala districts are active in service_zones
-- Uses WHERE NOT EXISTS since there's no unique constraint on district

INSERT INTO public.service_zones (name, state, district, is_active)
SELECT d, 'Kerala', d, true
FROM unnest(ARRAY[
    'Thiruvananthapuram',
    'Kollam',
    'Pathanamthitta',
    'Alappuzha',
    'Kottayam',
    'Idukki',
    'Ernakulam',
    'Thrissur',
    'Palakkad',
    'Malappuram',
    'Kozhikode',
    'Wayanad',
    'Kannur',
    'Kasaragod'
]) AS d
WHERE NOT EXISTS (
    SELECT 1 FROM public.service_zones WHERE district = d
);

-- Mark all Kerala districts as active
UPDATE public.service_zones
SET is_active = true
WHERE state = 'Kerala';

-- Server-side coordinate-to-district helper
CREATE OR REPLACE FUNCTION get_kerala_district(p_lat float8, p_lng float8)
RETURNS text AS $$
DECLARE
  v_district text;
BEGIN
  SELECT t.district INTO v_district
  FROM (VALUES
    ('Thiruvananthapuram'::text, 8.17,  8.76,  76.69, 77.39),
    ('Kollam',                   8.76,  9.28,  76.51, 77.22),
    ('Pathanamthitta',           9.10,  9.67,  76.50, 77.25),
    ('Alappuzha',                9.20,  9.82,  76.27, 76.83),
    ('Kottayam',                 9.34,  9.99,  76.48, 77.20),
    ('Idukki',                   9.64, 10.35,  76.72, 77.40),
    ('Ernakulam',                9.80, 10.37,  76.14, 76.90),
    ('Thrissur',                10.13, 10.79,  75.83, 76.75),
    ('Palakkad',                10.31, 11.22,  75.91, 76.93),
    ('Malappuram',              10.69, 11.37,  75.72, 76.62),
    ('Kozhikode',               11.12, 11.73,  75.52, 76.32),
    ('Wayanad',                 11.41, 11.86,  75.73, 76.44),
    ('Kannur',                  11.69, 12.37,  74.97, 76.06),
    ('Kasaragod',               12.25, 12.80,  74.86, 75.57)
  ) AS t(district, min_lat, max_lat, min_lng, max_lng)
  WHERE p_lat BETWEEN t.min_lat AND t.max_lat
    AND p_lng BETWEEN t.min_lng AND t.max_lng
  LIMIT 1;

  RETURN COALESCE(v_district, 'Kerala');
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_kerala_district(float8, float8) TO authenticated, anon;
