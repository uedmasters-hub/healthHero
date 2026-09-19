-- Patient directory (no duplicate auth.users)
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 4: PATIENT & USER MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Identity lives in auth.users → public.users (see 20260918120000_public_users_rls.sql).
-- Password hashes and sessions are not duplicated here.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users (org_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);

-- Patient profiles (1:1 with users where role = 'patient')
CREATE TABLE IF NOT EXISTS patient_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  date_of_birth DATE,
  gender          gender_enum NOT NULL DEFAULT 'unknown',
  blood_group     blood_group_enum DEFAULT 'unknown',
  height_cm       NUMERIC(5,1),
  weight_kg       NUMERIC(5,1),
  avatar_url      TEXT,
  emergency_contact_name    VARCHAR(200),
  emergency_contact_phone   VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  marital_status  VARCHAR(30),
  occupation      VARCHAR(100),
  nationality     VARCHAR(100),
  language_preferred VARCHAR(50) DEFAULT 'en',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_name ON patient_profiles USING gin (
  (first_name || ' ' || last_name) gin_trgm_ops
);

-- Patient addresses (1:N)
CREATE TABLE IF NOT EXISTS patient_addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label           VARCHAR(50) NOT NULL DEFAULT 'Home',
  address_line1   VARCHAR(255) NOT NULL DEFAULT '',
  address_line2   VARCHAR(255),
  city            VARCHAR(100) NOT NULL DEFAULT '',
  state           VARCHAR(100),
  country         VARCHAR(100) DEFAULT 'India',
  postal_code     VARCHAR(20),
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_addresses_user ON patient_addresses (user_id);

-- Emergency contacts (1:N)
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  relationship    VARCHAR(50) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts (user_id);

-- Family members / dependents (1:N)
CREATE TABLE IF NOT EXISTS family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100),
  date_of_birth   DATE,
  gender          gender_enum DEFAULT 'unknown',
  relationship    VARCHAR(50) NOT NULL,
  phone           VARCHAR(20),
  address         VARCHAR(500),
  is_dependent    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members (user_id);

-- User sessions are managed by Supabase Auth. Not created here.
