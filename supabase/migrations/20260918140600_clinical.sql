-- EHR, ICD-10, CPT, health records
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 8: CLINICAL DOCUMENTATION & EHR
-- ██████████████████████████████████████████████████████████████████████████████

-- ICD-10 diagnosis codes (reference table)
CREATE TABLE IF NOT EXISTS icd10_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(10) UNIQUE NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(200),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icd10_code ON icd10_codes (code);
CREATE INDEX IF NOT EXISTS idx_icd10_desc ON icd10_codes USING gin (description gin_trgm_ops);

-- CPT procedure codes (reference table)
CREATE TABLE IF NOT EXISTS cpt_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(10) UNIQUE NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(200),
  rvu_work        NUMERIC(6,2),
  rvu_practice    NUMERIC(6,2),
  rvu_malpractice NUMERIC(6,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpt_code ON cpt_codes (code);

-- Patient diagnoses (linking patients to ICD-10 codes)
CREATE TABLE IF NOT EXISTS patient_diagnoses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  icd10_code_id UUID REFERENCES icd10_codes(id) ON DELETE RESTRICT,
  diagnosis_date  DATE NOT NULL,
  resolved_date   DATE,
  status          VARCHAR(30) NOT NULL DEFAULT 'active',
  severity        severity_enum,
  diagnosed_by    UUID REFERENCES providers(id),
  notes           TEXT,
  is_chronic      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient ON patient_diagnoses (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_icd ON patient_diagnoses (icd10_code_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_status ON patient_diagnoses (patient_id, status);

-- Patient allergies
CREATE TABLE IF NOT EXISTS patient_allergies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  allergen        VARCHAR(255) NOT NULL,
  allergy_type    VARCHAR(50), -- drug, food, environmental, other
  severity        allergy_severity_enum NOT NULL DEFAULT 'moderate',
  reaction        TEXT,
  onset_date      DATE,
  status          VARCHAR(30) NOT NULL DEFAULT 'active',
  recorded_by     UUID REFERENCES providers(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient ON patient_allergies (patient_id);

-- Patient medications (current and historical)
CREATE TABLE IF NOT EXISTS patient_medications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  medication_name VARCHAR(255) NOT NULL,
  generic_name    VARCHAR(255),
  dosage VARCHAR(100) NOT NULL DEFAULT 'as prescribed',
  frequency       VARCHAR(100),
  route           VARCHAR(50), -- oral, topical, injection, etc.
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  prescribed_by   UUID REFERENCES providers(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'active',
  indication      TEXT,
  side_effects    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_medications_patient ON patient_medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_status ON patient_medications (patient_id, status);

-- Patient vaccinations
CREATE TABLE IF NOT EXISTS patient_vaccinations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  vaccine_name    VARCHAR(255) NOT NULL,
  cvx_code        VARCHAR(10), -- CDC vaccine code
  dose_number     INT,
  total_doses     INT,
  administration_date DATE NOT NULL,
  expiration_date DATE,
  lot_number      VARCHAR(50),
  manufacturer    VARCHAR(200),
  site            VARCHAR(50), -- left arm, right arm, etc.
  administered_by UUID REFERENCES providers(id),
  center_id       UUID REFERENCES healthcare_centers(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_vaccinations_patient ON patient_vaccinations (patient_id);

-- Patient surgeries / procedures
CREATE TABLE IF NOT EXISTS patient_surgeries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  procedure_name  VARCHAR(255) NOT NULL,
  cpt_code_id     UUID REFERENCES cpt_codes(id),
  surgery_date    DATE NOT NULL,
  hospital_id     UUID REFERENCES healthcare_centers(id),
  surgeon_name    VARCHAR(200),
  surgeon_id      UUID REFERENCES providers(id),
  anesthesia_type VARCHAR(50),
  outcome         TEXT,
  complications   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_surgeries_patient ON patient_surgeries (patient_id);

-- Patient conditions (chronic/ongoing)
CREATE TABLE IF NOT EXISTS patient_conditions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  condition_name  VARCHAR(255) NOT NULL,
  icd10_code_id   UUID REFERENCES icd10_codes(id),
  diagnosed_date  DATE,
  status          VARCHAR(30) NOT NULL DEFAULT 'active',
  severity        severity_enum,
  managing_provider_id UUID REFERENCES providers(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient ON patient_conditions (patient_id);

-- Medical documents (attachments, reports, images)
CREATE TABLE IF NOT EXISTS medical_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  uploaded_by     UUID REFERENCES public.users(id),
  document_type   VARCHAR(50) NOT NULL, -- lab_report, prescription, imaging, discharge_summary, other
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  file_url TEXT NOT NULL DEFAULT '',
  file_size_bytes BIGINT,
  mime_type       VARCHAR(100),
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON medical_documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_app ON medical_documents (appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_type ON medical_documents (document_type);
