-- Providers and scheduling
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 5: PROVIDER & STAFF MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Provider/staff accounts (linked to users table)
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
  npi_number      VARCHAR(20) UNIQUE,
  license_number  VARCHAR(100),
  license_state   VARCHAR(100),
  license_expiry  DATE,
  provider_type   staff_role NOT NULL DEFAULT 'doctor',
  title           VARCHAR(20),  -- Dr., Mr., Ms., etc.
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  display_name    VARCHAR(200) NOT NULL,
  avatar_url      TEXT,
  about           TEXT,
  years_experience INT,
  consultation_fee NUMERIC(10,2),
  currency        VARCHAR(3) DEFAULT 'INR',
  rating_avg      NUMERIC(3,2) DEFAULT 0.00,
  rating_count    INT DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_org ON providers (org_id);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers (provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers USING gin (
  (first_name || ' ' || last_name) gin_trgm_ops
);
CREATE INDEX IF NOT EXISTS idx_providers_npi ON providers (npi_number);

-- Specializations (reference table)
CREATE TABLE IF NOT EXISTS specializations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) UNIQUE NOT NULL,
  slug            VARCHAR(150) UNIQUE NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  display_order   INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider-Specialization junction (M:N)
CREATE TABLE IF NOT EXISTS provider_specializations (
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  specialization_id UUID NOT NULL REFERENCES specializations(id) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, specialization_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_specializations_spec ON provider_specializations (specialization_id);

-- Provider availability / scheduling
CREATE TABLE IF NOT EXISTS provider_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  slot_duration   INT NOT NULL DEFAULT 30, -- minutes
  visit_types     visit_type_enum[] NOT NULL DEFAULT '{in_person}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider ON provider_schedules (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_schedules_day ON provider_schedules (day_of_week);

-- Provider schedule exceptions (holidays, one-off changes)
CREATE TABLE IF NOT EXISTS provider_schedule_exceptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  exception_date  DATE NOT NULL,
  is_available    BOOLEAN NOT NULL DEFAULT false,
  start_time      TIME,
  end_time        TIME,
  reason          VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (is_available = false OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
);

CREATE INDEX IF NOT EXISTS idx_provider_exceptions_provider ON provider_schedule_exceptions (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_exceptions_date ON provider_schedule_exceptions (exception_date);
