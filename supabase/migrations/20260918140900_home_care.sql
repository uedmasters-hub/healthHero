-- Home care
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 11: HOME CARE MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Home care service catalog
CREATE TABLE IF NOT EXISTS home_care_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(100), -- nursing, physiotherapy, eldercare, postoperative, etc.
  base_price      NUMERIC(10,2),
  currency        VARCHAR(3) DEFAULT 'INR',
  duration_hours  NUMERIC(4,1),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Caregivers
CREATE TABLE IF NOT EXISTS caregivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  specialization  VARCHAR(100),
  certification   VARCHAR(200),
  experience_years INT,
  rating_avg      NUMERIC(3,2) DEFAULT 0.00,
  rating_count    INT DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caregivers_specialization ON caregivers (specialization);

-- Home care visits
CREATE TABLE IF NOT EXISTS home_care_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  caregiver_id    UUID NOT NULL REFERENCES caregivers(id) ON DELETE RESTRICT,
  service_id      UUID NOT NULL REFERENCES home_care_services(id) ON DELETE RESTRICT,
  status          home_care_visit_status NOT NULL DEFAULT 'scheduled',
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME NOT NULL,
  duration_hours  NUMERIC(4,1) NOT NULL DEFAULT 1,
  address_line1   VARCHAR(255) NOT NULL,
  address_line2   VARCHAR(255),
  city            VARCHAR(100) NOT NULL,
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  special_instructions TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_care_patient ON home_care_visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_home_care_caregiver ON home_care_visits (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_home_care_date ON home_care_visits (scheduled_date);

-- Home care tasks (per visit)
CREATE TABLE IF NOT EXISTS home_care_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        UUID NOT NULL REFERENCES home_care_visits(id) ON DELETE CASCADE,
  task_name       VARCHAR(255) NOT NULL,
  description     TEXT,
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_care_tasks_visit ON home_care_tasks (visit_id);

-- Home care visit notes
CREATE TABLE IF NOT EXISTS home_care_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        UUID NOT NULL REFERENCES home_care_visits(id) ON DELETE CASCADE,
  caregiver_id    UUID NOT NULL REFERENCES caregivers(id),
  note_text       TEXT NOT NULL,
  vitals          JSONB, -- optional vitals captured during visit
  photos          TEXT[], -- optional photo documentation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_care_notes_visit ON home_care_notes (visit_id);
