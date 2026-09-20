-- Catalog seed from src/data (doctors, centers, articles).
-- Uses stable UUIDs so local bookings can resolve providers after migration.

CREATE OR REPLACE FUNCTION public.stable_uuid(seed text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-4' ||
    substr(md5(seed), 13, 3) || '-a' ||
    substr(md5(seed), 16, 3) || '-' ||
    substr(md5(seed), 19, 12)
  )::uuid;
$$;

INSERT INTO public.organizations (id, name, type)
VALUES ('00000000-0000-4000-a000-000000000000', 'eMedicalls', 'healthcare_network')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.specializations (name, slug) VALUES ('Dermatologist', 'dermatologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Cardiologist', 'cardiologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Pediatrician', 'pediatrician') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Neurologist', 'neurologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Orthopedist', 'orthopedist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Pulmonologist', 'pulmonologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Gynecologist', 'gynecologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('ENT Specialist', 'ent-specialist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Dentist', 'dentist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Endocrinologist', 'endocrinologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Gastroenterologist', 'gastroenterologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('General Physician', 'general-physician') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Immunologist', 'immunologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Nutritionist', 'nutritionist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Ophthalmologist', 'ophthalmologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Physiotherapist', 'physiotherapist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Psychiatrist', 'psychiatrist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Sexologist', 'sexologist') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.specializations (name, slug) VALUES ('Urologist', 'urologist') ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.apollo-delhi'),
  '00000000-0000-4000-a000-000000000000',
  'Apollo Spectra Hospital',
  'hospital',
  '19 Kailash Colony, Delhi',
  'Delhi',
  '+91 11 2692 5858',
  '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
  4.7,
  'apollo-delhi'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.fortis-delhi'),
  '00000000-0000-4000-a000-000000000000',
  'Fortis Escorts Heart Institute',
  'hospital',
  'Okhla Road, New Delhi',
  'Delhi',
  '+91 11 4713 5000',
  '/img/clinic/martha-dominguez-de-gouveia-KF-h9HMxRKg-unsplash.jpg',
  4.6,
  'fortis-delhi'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.max-clinic-delhi'),
  '00000000-0000-4000-a000-000000000000',
  'Max Medcentre Clinic',
  'clinic',
  '12 Golf Links, Delhi',
  'Delhi',
  '+91 11 4199 8888',
  '/img/clinic/adhy-savala-zbpgmGe27p8-unsplash.jpg',
  4.5,
  'max-clinic-delhi'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.healthfirst-mumbai'),
  '00000000-0000-4000-a000-000000000000',
  'HealthFirst Medical Center',
  'clinic',
  '22 Linking Road, Mumbai',
  'Mumbai',
  '+91 22 2640 1122',
  '/img/clinic/akram-huseyn-V_0ES17m9Tc-unsplash.jpg',
  4.8,
  'healthfirst-mumbai'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.lilavati-mumbai'),
  '00000000-0000-4000-a000-000000000000',
  'Lilavati Hospital',
  'hospital',
  'Bandra West, Mumbai',
  'Mumbai',
  '+91 22 2675 1000',
  '/img/clinic/sander-sammy-38Un6Oi5beE-unsplash.jpg',
  4.7,
  'lilavati-mumbai'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.manipal-bangalore'),
  '00000000-0000-4000-a000-000000000000',
  'Manipal Hospital',
  'hospital',
  '98 HAL Airport Road, Bengaluru',
  'Bengaluru',
  '+91 80 2502 4444',
  '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
  4.6,
  'manipal-bangalore'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.cloudnine-bangalore'),
  '00000000-0000-4000-a000-000000000000',
  'Cloudnine Clinic',
  'clinic',
  '5 MG Road, Bengaluru',
  'Bengaluru',
  '+91 80 4199 9999',
  '/img/clinic/martha-dominguez-de-gouveia-KF-h9HMxRKg-unsplash.jpg',
  4.4,
  'cloudnine-bangalore'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  public.stable_uuid('healthhero.center.apollo-chennai'),
  '00000000-0000-4000-a000-000000000000',
  'Apollo Clinic Teynampet',
  'clinic',
  '88 Anna Salai, Chennai',
  'Chennai',
  '+91 44 2829 3333',
  '/img/clinic/adhy-savala-zbpgmGe27p8-unsplash.jpg',
  4.5,
  'apollo-chennai'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;

INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000000',
  'doctor:1',
  'doctor',
  'Dr.',
  'Priya',
  'Sharma',
  'Dr. Priya Sharma',
  'Dr. Priya Sharma is a consultant dermatologist specialising in medical and cosmetic skin care. She is known for early detection of skin conditions, laser treatments, and personalised skincare plans.',
  15,
  1200,
  4.8,
  218,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000001', s.id, true
FROM public.specializations s
WHERE s.slug = 'dermatologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000000',
  'doctor:2',
  'doctor',
  'Dr.',
  'Arjun',
  'Mehta',
  'Dr. Arjun Mehta',
  'Dr. Arjun Mehta is a consultant cardiologist focused on heart health and preventive cardiology. He specialises in interventional cardiology and cardiac rehabilitation.',
  12,
  2000,
  4.6,
  156,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000002', s.id, true
FROM public.specializations s
WHERE s.slug = 'cardiologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000003',
  '00000000-0000-4000-a000-000000000000',
  'doctor:3',
  'doctor',
  'Dr.',
  'Ananya',
  'Reddy',
  'Dr. Ananya Reddy',
  'Dr. Ananya Reddy is a compassionate paediatrician with a focus on child development, vaccinations, and preventive care. She creates a warm environment for her young patients.',
  10,
  900,
  4.9,
  203,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000003', s.id, true
FROM public.specializations s
WHERE s.slug = 'pediatrician'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000004',
  '00000000-0000-4000-a000-000000000000',
  'doctor:4',
  'doctor',
  'Dr.',
  'Rajesh',
  'Sharma',
  'Dr. Rajesh Sharma',
  'Dr. Rajesh Sharma is a renowned neurologist with expertise in treating complex neurological disorders. He is known for his patient-centred approach and advanced diagnostic techniques.',
  18,
  1500,
  4.7,
  178,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000004', s.id, true
FROM public.specializations s
WHERE s.slug = 'neurologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000005',
  '00000000-0000-4000-a000-000000000000',
  'doctor:5',
  'doctor',
  'Dr.',
  'Kavya',
  'Iyer',
  'Dr. Kavya Iyer',
  'Dr. Kavya Iyer is an orthopaedic specialist focused on musculoskeletal health, sports injuries, and joint replacement surgeries. She combines modern techniques with compassionate care.',
  14,
  1600,
  4.5,
  142,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000005', s.id, true
FROM public.specializations s
WHERE s.slug = 'orthopedist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000006',
  '00000000-0000-4000-a000-000000000000',
  'doctor:6',
  'doctor',
  'Dr.',
  'Deepak',
  'Menon',
  'Dr. Deepak Menon',
  'Dr. Deepak Menon is a pulmonologist specialising in respiratory diseases, asthma management, and lung health. He is committed to providing evidence-based treatment plans.',
  15,
  1300,
  4.8,
  165,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000006', s.id, true
FROM public.specializations s
WHERE s.slug = 'pulmonologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000007',
  '00000000-0000-4000-a000-000000000000',
  'doctor:7',
  'doctor',
  'Dr.',
  'Neha',
  'Kapoor',
  'Dr. Neha Kapoor',
  'Dr. Neha Kapoor is an experienced gynaecologist specialising in women''s health, prenatal care, and minimally invasive surgeries. She provides compassionate and comprehensive care.',
  20,
  1400,
  4.9,
  245,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000007', s.id, true
FROM public.specializations s
WHERE s.slug = 'gynecologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000008',
  '00000000-0000-4000-a000-000000000000',
  'doctor:8',
  'doctor',
  'Dr.',
  'Arjun',
  'Nair',
  'Dr. Arjun Nair',
  'Dr. Arjun Nair is an ENT specialist with expertise in ear, nose, and throat disorders. He offers advanced treatments for hearing loss, sinus issues, and throat infections.',
  11,
  1000,
  4.7,
  132,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000008', s.id, true
FROM public.specializations s
WHERE s.slug = 'ent-specialist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000009',
  '00000000-0000-4000-a000-000000000000',
  'doctor:9',
  'doctor',
  'Dr.',
  'Sneha',
  'Joshi',
  'Dr. Sneha Joshi',
  'Dr. Sneha Joshi provides comprehensive dental care with a focus on preventive dentistry and smile design.',
  11,
  800,
  4.7,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000009', s.id, true
FROM public.specializations s
WHERE s.slug = 'dentist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000010',
  '00000000-0000-4000-a000-000000000000',
  'doctor:10',
  'doctor',
  'Dr.',
  'Vivek',
  'Menon',
  'Dr. Vivek Menon',
  'Dr. Vivek Menon specialises in diabetes, thyroid disorders, and hormonal health.',
  14,
  1600,
  4.8,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000010', s.id, true
FROM public.specializations s
WHERE s.slug = 'endocrinologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000011',
  '00000000-0000-4000-a000-000000000000',
  'doctor:11',
  'doctor',
  'Dr.',
  'Lina',
  'D’Souza',
  'Dr. Lina D’Souza',
  'Dr. Lina D’Souza treats digestive and liver conditions with a calm, evidence-based approach.',
  13,
  1400,
  4.6,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000011', s.id, true
FROM public.specializations s
WHERE s.slug = 'gastroenterologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000012',
  '00000000-0000-4000-a000-000000000000',
  'doctor:12',
  'doctor',
  'Dr.',
  'Arun',
  'Iyer',
  'Dr. Arun Iyer',
  'Dr. Arun Iyer is a trusted family physician for everyday care, fever, and preventive checkups.',
  16,
  600,
  4.9,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000012', s.id, true
FROM public.specializations s
WHERE s.slug = 'general-physician'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000013',
  '00000000-0000-4000-a000-000000000000',
  'doctor:13',
  'doctor',
  'Dr.',
  'Meera',
  'Shah',
  'Dr. Meera Shah',
  'Dr. Meera Shah helps patients manage allergies, asthma, and immune-related conditions.',
  12,
  1800,
  4.7,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000013', s.id, true
FROM public.specializations s
WHERE s.slug = 'immunologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000014',
  '00000000-0000-4000-a000-000000000000',
  'doctor:14',
  'doctor',
  'Dr.',
  'Kabir',
  'Sethi',
  'Dr. Kabir Sethi',
  'Dr. Kabir Sethi designs practical nutrition plans for weight, energy, and chronic conditions.',
  9,
  500,
  4.5,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000014', s.id, true
FROM public.specializations s
WHERE s.slug = 'nutritionist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000015',
  '00000000-0000-4000-a000-000000000000',
  'doctor:15',
  'doctor',
  'Dr.',
  'Anika',
  'Bose',
  'Dr. Anika Bose',
  'Dr. Anika Bose provides complete eye care, from routine vision checks to surgical consults.',
  13,
  1200,
  4.8,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000015', s.id, true
FROM public.specializations s
WHERE s.slug = 'ophthalmologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000016',
  '00000000-0000-4000-a000-000000000000',
  'doctor:16',
  'doctor',
  'Dr.',
  'Rohan',
  'Gill',
  'Dr. Rohan Gill',
  'Dr. Rohan Gill specialises in sports rehab, back pain, and post-surgery physiotherapy.',
  10,
  700,
  4.6,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000016', s.id, true
FROM public.specializations s
WHERE s.slug = 'physiotherapist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000017',
  '00000000-0000-4000-a000-000000000000',
  'doctor:17',
  'doctor',
  'Dr.',
  'Sara',
  'Qureshi',
  'Dr. Sara Qureshi',
  'Dr. Sara Qureshi offers confidential care for anxiety, depression, and sleep concerns.',
  15,
  1800,
  4.9,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000017', s.id, true
FROM public.specializations s
WHERE s.slug = 'psychiatrist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000018',
  '00000000-0000-4000-a000-000000000000',
  'doctor:18',
  'doctor',
  'Dr.',
  'Imran',
  'Ali',
  'Dr. Imran Ali',
  'Dr. Imran Ali provides discreet consultations for sexual health and related concerns.',
  11,
  1300,
  4.4,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000018', s.id, true
FROM public.specializations s
WHERE s.slug = 'sexologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000019',
  '00000000-0000-4000-a000-000000000000',
  'doctor:19',
  'doctor',
  'Dr.',
  'Tara',
  'Nair',
  'Dr. Tara Nair',
  'Dr. Tara Nair treats kidney, bladder, and prostate conditions with a patient-first approach.',
  14,
  1500,
  4.7,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000019', s.id, true
FROM public.specializations s
WHERE s.slug = 'urologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000020',
  '00000000-0000-4000-a000-000000000000',
  'doctor:20',
  'doctor',
  'Dr.',
  'Rhea',
  'Malhotra',
  'Dr. Rhea Malhotra',
  'Dr. Rhea Malhotra focuses on acne, pigmentation, and everyday skin health.',
  11,
  1100,
  4.7,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000020', s.id, true
FROM public.specializations s
WHERE s.slug = 'dermatologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000021',
  '00000000-0000-4000-a000-000000000000',
  'doctor:21',
  'doctor',
  'Dr.',
  'Farhan',
  'Siddiqui',
  'Dr. Farhan Siddiqui',
  'Dr. Farhan Siddiqui specialises in preventive cardiology and long-term heart-risk management.',
  15,
  2100,
  4.8,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000021', s.id, true
FROM public.specializations s
WHERE s.slug = 'cardiologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000022',
  '00000000-0000-4000-a000-000000000000',
  'doctor:22',
  'doctor',
  'Dr.',
  'Diya',
  'Nair',
  'Dr. Diya Nair',
  'Dr. Diya Nair provides warm, practical care for infants and school-age children.',
  9,
  1000,
  4.8,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000022', s.id, true
FROM public.specializations s
WHERE s.slug = 'pediatrician'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000023',
  '00000000-0000-4000-a000-000000000000',
  'doctor:23',
  'doctor',
  'Dr.',
  'Vikram',
  'Rao',
  'Dr. Vikram Rao',
  'Dr. Vikram Rao treats headaches, seizures, and nerve disorders with a clear, stepwise plan.',
  13,
  2200,
  4.6,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000023', s.id, true
FROM public.specializations s
WHERE s.slug = 'neurologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000024',
  '00000000-0000-4000-a000-000000000000',
  'doctor:24',
  'doctor',
  'Dr.',
  'Ishita',
  'Kulkarni',
  'Dr. Ishita Kulkarni',
  'Dr. Ishita Kulkarni helps patients recover from joint pain, fractures, and sports injuries.',
  12,
  1600,
  4.7,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000024', s.id, true
FROM public.specializations s
WHERE s.slug = 'orthopedist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000025',
  '00000000-0000-4000-a000-000000000000',
  'doctor:25',
  'doctor',
  'Dr.',
  'Sameer',
  'Khan',
  'Dr. Sameer Khan',
  'Dr. Sameer Khan manages asthma, sleep apnea, and chronic cough with practical follow-up.',
  10,
  1400,
  4.5,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000025', s.id, true
FROM public.specializations s
WHERE s.slug = 'pulmonologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000026',
  '00000000-0000-4000-a000-000000000000',
  'doctor:26',
  'doctor',
  'Dr.',
  'Anita',
  'Desai',
  'Dr. Anita Desai',
  'Dr. Anita Desai offers thoughtful women’s health care from annual visits to fertility questions.',
  14,
  1300,
  4.8,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000026', s.id, true
FROM public.specializations s
WHERE s.slug = 'gynecologist'
ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  '00000000-0000-4000-a000-000000000027',
  '00000000-0000-4000-a000-000000000000',
  'doctor:27',
  'doctor',
  'Dr.',
  'Mathew',
  'Varghese',
  'Dr. Mathew Varghese',
  'Dr. Mathew Varghese treats sinus, throat, and hearing concerns with a conservative first approach.',
  16,
  1200,
  4.6,
  0,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;
INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT '00000000-0000-4000-a000-000000000027', s.id, true
FROM public.specializations s
WHERE s.slug = 'ent-specialist'
ON CONFLICT DO NOTHING;

INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.healthy-heart'),
  'How to maintain a healthy heart',
  'healthy-heart',
  'Cardiology',
  '',
  '',
  '',
  '{}'::jsonb,
  5,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.better-sleep'),
  'Tips for better sleep quality',
  'better-sleep',
  'Sleep',
  '',
  '',
  '',
  '{}'::jsonb,
  4,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.blood-pressure'),
  'Understanding blood pressure',
  'blood-pressure',
  'Cardiology',
  '',
  '',
  '',
  '{}'::jsonb,
  6,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.healthy-eating'),
  'Healthy eating habits',
  'healthy-eating',
  'Nutrition',
  '',
  '',
  '',
  '{}'::jsonb,
  3,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.daily-nutrition'),
  'Daily nutrition guide for energy',
  'daily-nutrition',
  'Nutrition',
  '',
  '',
  '',
  '{}'::jsonb,
  6,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.everyday-stress'),
  'Managing everyday stress',
  'everyday-stress',
  'Wellbeing',
  '',
  '',
  '',
  '{}'::jsonb,
  5,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.desk-stretches'),
  'Simple stretches for desk workers',
  'desk-stretches',
  'Movement',
  '',
  '',
  '',
  '{}'::jsonb,
  4,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  public.stable_uuid('healthhero.article.hydration-habits'),
  'Hydration habits that actually stick',
  'hydration-habits',
  'Nutrition',
  '',
  '',
  '',
  '{}'::jsonb,
  3,
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;
