-- Insert all 14 Kerala districts into service_zones

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
