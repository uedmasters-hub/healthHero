-- ICD-10, CPT, specialization, consent seeds
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 22: SEED DATA (ICD-10 & CPT ESSENTIALS)
-- ██████████████████████████████████████████████████████████████████████████████

-- Common ICD-10 codes
INSERT INTO icd10_codes (code, description, category) VALUES
('A09', 'Infectious gastroenteritis and colitis', 'Infectious'),
('E11.9', 'Type 2 diabetes mellitus without complications', 'Endocrine'),
('E78.5', 'Hyperlipidemia, unspecified', 'Endocrine'),
('E03.9', 'Hypothyroidism, unspecified', 'Endocrine'),
('I10', 'Essential (primary) hypertension', 'Circulatory'),
('I25.10', 'Atherosclerotic heart disease', 'Circulatory'),
('J06.9', 'Acute upper respiratory infection, unspecified', 'Respiratory'),
('J18.9', 'Pneumonia, unspecified organism', 'Respiratory'),
('K21.0', 'Gastro-esophageal reflux disease with esophagitis', 'Digestive'),
('K59.00', 'Constipation, unspecified', 'Digestive'),
('M54.5', 'Low back pain', 'Musculoskeletal'),
('M17.11', 'Primary osteoarthritis, right knee', 'Musculoskeletal'),
('N39.0', 'Urinary tract infection', 'Genitourinary'),
('R05.9', 'Cough, unspecified', 'Symptoms'),
('R51.9', 'Headache, unspecified', 'Symptoms'),
('Z00.00', 'Encounter for general adult medical examination', 'Encounters'),
('Z23', 'Encounter for immunization', 'Encounters'),
('F32.1', 'Major depressive disorder, single episode, moderate', 'Mental'),
('F41.1', 'Generalized anxiety disorder', 'Mental'),
('L40.9', 'Psoriasis, unspecified', 'Skin')
ON CONFLICT (code) DO NOTHING;

-- Common CPT codes
INSERT INTO cpt_codes (code, description, category, rvu_work) VALUES
('99213', 'Office visit, established patient, low complexity', 'Evaluation & Management', 1.30),
('99214', 'Office visit, established patient, moderate complexity', 'Evaluation & Management', 2.00),
('99215', 'Office visit, established patient, high complexity', 'Evaluation & Management', 2.60),
('99203', 'Office visit, new patient, low complexity', 'Evaluation & Management', 1.60),
('99204', 'Office visit, new patient, moderate complexity', 'Evaluation & Management', 2.60),
('99285', 'Emergency department visit, high complexity', 'Evaluation & Management', 6.40),
('99291', 'Critical care, first hour', 'Critical Care', 8.10),
('36415', 'Collection of venous blood by venipuncture', 'Laboratory', 0.40),
('80053', 'Comprehensive metabolic panel', 'Laboratory', 0.70),
('85025', 'Complete blood count (CBC) with differential', 'Laboratory', 0.50),
('71046', 'Chest X-ray, 2 views', 'Radiology', 0.70),
('73030', 'X-ray, shoulder, minimum 2 views', 'Radiology', 0.60),
('93000', 'Electrocardiogram, 12-lead', 'Cardiology', 0.80),
('93306', 'Transthoracic echocardiography', 'Cardiology', 2.50),
('90471', 'Immunization administration, first vaccine', 'Preventive', 0.30)
ON CONFLICT (code) DO NOTHING;

-- Common specializations
INSERT INTO specializations (name, slug) VALUES
('General Physician', 'general-physician'),
('Cardiologist', 'cardiologist'),
('Dermatologist', 'dermatologist'),
('Pediatrician', 'pediatrician'),
('Orthopedist', 'orthopedist'),
('Neurologist', 'neurologist'),
('Gynecologist', 'gynecologist'),
('ENT Specialist', 'ent-specialist'),
('Psychiatrist', 'psychiatrist'),
('Endocrinologist', 'endocrinologist'),
('Gastroenterologist', 'gastroenterologist'),
('Pulmonologist', 'pulmonologist'),
('Urologist', 'urologist'),
('Ophthalmologist', 'ophthalmologist'),
('Dentist', 'dentist'),
('Nutritionist', 'nutritionist'),
('Physiotherapist', 'physiotherapist'),
('Immunologist', 'immunologist'),
('Sexologist', 'sexologist')
ON CONFLICT (slug) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS consent_types_name_idx ON consent_types (name);

INSERT INTO consent_types (name, description, category) VALUES
('Treatment Consent', 'Consent for medical treatment and procedures', 'treatment'),
('Data Sharing Consent', 'Consent to share medical data with other providers', 'data_sharing'),
('Research Participation', 'Consent to use de-identified data for research', 'research'),
('Telehealth Consent', 'Consent for telehealth/virtual consultation', 'treatment'),
('Insurance Claim Authorization', 'Authorization to submit insurance claims', 'data_sharing'),
('Emergency Treatment Consent', 'Implied consent for emergency treatment', 'treatment')
ON CONFLICT (name) DO NOTHING;


-- ██████████████████████████████████████████████████████████████████████████████
