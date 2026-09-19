-- Telehealth
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 13: TELEHEALTH
-- ██████████████████████████████████████████████████████████████████████████████

-- Telehealth sessions
CREATE TABLE IF NOT EXISTS telehealth_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  status          telehealth_session_status NOT NULL DEFAULT 'scheduled',
  meeting_url     TEXT,
  meeting_id      VARCHAR(100),
  access_token    TEXT,
  recording_url   TEXT,
  is_recorded     BOOLEAN NOT NULL DEFAULT false,
  patient_joined_at TIMESTAMPTZ,
  provider_joined_at TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INT,
  connection_quality VARCHAR(20), -- excellent, good, fair, poor
  technical_issues TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_appointment ON telehealth_sessions (appointment_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_patient ON telehealth_sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_provider ON telehealth_sessions (provider_id);

-- Telehealth chat messages (in-session)
CREATE TABLE IF NOT EXISTS telehealth_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  message_text    TEXT NOT NULL,
  message_type    VARCHAR(20) NOT NULL DEFAULT 'text', -- text, file, image, system
  file_url        TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_messages_session ON telehealth_messages (session_id);

-- Telehealth waiting room
CREATE TABLE IF NOT EXISTS telehealth_waiting_room (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admitted_at     TIMESTAMPTZ,
  UNIQUE (session_id, user_id)
);
