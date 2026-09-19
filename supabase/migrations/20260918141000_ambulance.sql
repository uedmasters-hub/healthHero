-- Ambulance and emergency
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 12: AMBULANCE & EMERGENCY SERVICES
-- ██████████████████████████████████████████████████████████████████████████████

-- Ambulance fleet
CREATE TABLE IF NOT EXISTS ambulances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
  vehicle_number  VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type    VARCHAR(50) NOT NULL, -- basic, als, bls, neonatal, cardiac
  is_equipped     BOOLEAN NOT NULL DEFAULT true,
  status          ambulance_status NOT NULL DEFAULT 'available',
  current_latitude  NUMERIC(9,6),
  current_longitude NUMERIC(9,6),
  last_location_update TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambulances_org ON ambulances (org_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances (status);
CREATE INDEX IF NOT EXISTS idx_ambulances_location ON ambulances (current_latitude, current_longitude);

-- Emergency dispatch calls
CREATE TABLE IF NOT EXISTS emergency_dispatches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  patient_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ambulance_id    UUID REFERENCES ambulances(id) ON DELETE SET NULL,
  triage_level    triage_level NOT NULL DEFAULT 'urgent',
  chief_complaint TEXT NOT NULL,
  pickup_address  VARCHAR(500) NOT NULL,
  pickup_latitude NUMERIC(9,6),
  pickup_longitude NUMERIC(9,6),
  destination_center_id UUID REFERENCES healthcare_centers(id),
  destination_address VARCHAR(500),
  status          VARCHAR(30) NOT NULL DEFAULT 'dispatched',
  dispatched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  en_route_at     TIMESTAMPTZ,
  on_scene_at     TIMESTAMPTZ,
  transporting_at TIMESTAMPTZ,
  at_hospital_at  TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_dispatches_caller ON emergency_dispatches (caller_id);
CREATE INDEX IF NOT EXISTS idx_emergency_dispatches_status ON emergency_dispatches (status);
CREATE INDEX IF NOT EXISTS idx_emergency_dispatches_date ON emergency_dispatches (dispatched_at);

-- GPS tracking log for ambulances
CREATE TABLE IF NOT EXISTS ambulance_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_id    UUID NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
  dispatch_id     UUID REFERENCES emergency_dispatches(id) ON DELETE SET NULL,
  latitude        NUMERIC(9,6) NOT NULL,
  longitude       NUMERIC(9,6) NOT NULL,
  speed_kmh       NUMERIC(5,1),
  heading         NUMERIC(5,1),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambulance_tracking_ambulance ON ambulance_tracking (ambulance_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_tracking_time ON ambulance_tracking (recorded_at);

-- Emergency department visits
CREATE TABLE IF NOT EXISTS emergency_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id     UUID REFERENCES emergency_dispatches(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  center_id       UUID NOT NULL REFERENCES healthcare_centers(id) ON DELETE RESTRICT,
  triage_level    triage_level NOT NULL,
  chief_complaint TEXT,
  arrival_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triage_time     TIMESTAMPTZ,
  provider_id     UUID REFERENCES providers(id),
  bed_id          UUID REFERENCES beds(id),
  disposition     VARCHAR(50), -- admitted, discharged, transferred, left_without_being_seen
  disposition_time TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_visits_patient ON emergency_visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_visits_center ON emergency_visits (center_id);
CREATE INDEX IF NOT EXISTS idx_emergency_visits_triage ON emergency_visits (triage_level);

-- Hospital admissions (from ED or direct)
CREATE TABLE IF NOT EXISTS admissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  center_id       UUID NOT NULL REFERENCES healthcare_centers(id) ON DELETE RESTRICT,
  admitting_provider_id UUID NOT NULL REFERENCES providers(id),
  emergency_visit_id UUID REFERENCES emergency_visits(id) ON DELETE SET NULL,
  admission_type  VARCHAR(30) NOT NULL DEFAULT 'inpatient', -- inpatient, outpatient, day_care
  admission_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_discharge DATE,
  actual_discharge TIMESTAMPTZ,
  discharge_provider_id UUID REFERENCES providers(id),
  discharge_disposition VARCHAR(50), -- home, transferred, against_medical_advice, deceased
  admission_diagnosis TEXT,
  discharge_diagnosis TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions (patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_center ON admissions (center_id);
CREATE INDEX IF NOT EXISTS idx_admissions_date ON admissions (admission_date);

DO $$ BEGIN
  ALTER TABLE bed_assignments
    ADD CONSTRAINT fk_bed_assignments_admission
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
