-- Appointments and clinical encounters
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 7: APPOINTMENTS & CONSULTATIONS
-- ██████████████████████████████████████████████████████████████████████████████

-- Appointments (core booking entity)
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id UUID REFERENCES providers(id) ON DELETE RESTRICT,
  center_id       UUID REFERENCES healthcare_centers(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  service_type    service_type_enum NOT NULL DEFAULT 'doctor_consultation',
  status          appointment_status NOT NULL DEFAULT 'draft',
  visit_type      visit_type_enum NOT NULL DEFAULT 'in_person',
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INT NOT NULL DEFAULT 30,
  slot_id         UUID, -- FK to available_slots
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  notes           TEXT,
  reason_for_visit TEXT,
  is_followup     BOOLEAN NOT NULL DEFAULT false,
  parent_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  rescheduled_from UUID REFERENCES appointments(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  cancelled_by    UUID REFERENCES public.users(id),
  cancelled_at    TIMESTAMPTZ,
  no_show_reason  TEXT,
  checked_in_at   TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version         INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments (provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_center ON appointments (center_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_date ON appointments (provider_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_user_status ON appointments (user_id, status);

-- Available slots (generated from provider schedules)
CREATE TABLE IF NOT EXISTS available_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  center_id       UUID REFERENCES healthcare_centers(id) ON DELETE CASCADE,
  slot_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  visit_type      visit_type_enum NOT NULL DEFAULT 'in_person',
  is_available    BOOLEAN NOT NULL DEFAULT true,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, center_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_provider_date ON available_slots (provider_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_available ON available_slots (is_available, slot_date);

-- Appointment audit trail
CREATE TABLE IF NOT EXISTS appointment_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL,
  old_status      appointment_status,
  new_status      appointment_status,
  actor_id        UUID REFERENCES public.users(id),
  actor_name      VARCHAR(200),
  actor_role      VARCHAR(50),
  ip_address      INET,
  user_agent      TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_history_app ON appointment_history (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_history_created ON appointment_history (created_at);

-- Consultation notes (clinical documentation per appointment)
CREATE TABLE IF NOT EXISTS consultation_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  examination_findings TEXT,
  assessment      TEXT,
  plan            TEXT,
  follow_up_notes TEXT,
  is_signed       BOOLEAN NOT NULL DEFAULT false,
  signed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_app ON consultation_notes (appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_provider ON consultation_notes (provider_id);

-- Vital signs (per consultation)
CREATE TABLE IF NOT EXISTS vital_signs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  recorded_by     UUID REFERENCES providers(id),
  systolic_bp     INT,
  diastolic_bp    INT,
  heart_rate      INT,
  temperature_c   NUMERIC(4,1),
  respiratory_rate INT,
  spo2            NUMERIC(5,2),
  weight_kg       NUMERIC(5,1),
  height_cm       NUMERIC(5,1),
  bmi             NUMERIC(4,1),
  blood_glucose   NUMERIC(6,2),
  notes           TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_app ON vital_signs (appointment_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs (patient_id);
