-- Hospitals, clinics, rooms, beds
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 6: HOSPITAL & CLINIC MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Healthcare centers (hospitals, clinics, diagnostic centers)
CREATE TABLE IF NOT EXISTS healthcare_centers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50) NOT NULL DEFAULT 'clinic',
  address_line1   VARCHAR(255) NOT NULL,
  address_line2   VARCHAR(255),
  city            VARCHAR(100) NOT NULL,
  state           VARCHAR(100),
  country         VARCHAR(100) DEFAULT 'India',
  postal_code     VARCHAR(20),
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  website         TEXT,
  logo_url        TEXT,
  image_url       TEXT,
  rating_avg      NUMERIC(3,2) DEFAULT 0.00,
  rating_count    INT DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_centers_org ON healthcare_centers (org_id);
CREATE INDEX IF NOT EXISTS idx_centers_city ON healthcare_centers (city);
CREATE INDEX IF NOT EXISTS idx_centers_type ON healthcare_centers (type);
CREATE INDEX IF NOT EXISTS idx_centers_location ON healthcare_centers (latitude, longitude);

-- Provider centers/hospitals (M:N)
CREATE TABLE IF NOT EXISTS provider_centers (
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  center_id       UUID NOT NULL REFERENCES healthcare_centers(id) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, center_id)
);


-- Center operating hours
CREATE TABLE IF NOT EXISTS center_hours (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id       UUID NOT NULL REFERENCES healthcare_centers(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time       TIME NOT NULL,
  close_time      TIME NOT NULL,
  is_closed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (is_closed = true OR open_time < close_time)
);

CREATE INDEX IF NOT EXISTS idx_center_hours_center ON center_hours (center_id);

-- Departments within a hospital
CREATE TABLE IF NOT EXISTS departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id       UUID NOT NULL REFERENCES healthcare_centers(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  head_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  phone           VARCHAR(20),
  floor_number    INT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_center ON departments (center_id);

-- Rooms within departments
CREATE TABLE IF NOT EXISTS rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id       UUID NOT NULL REFERENCES healthcare_centers(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  room_number     VARCHAR(20) NOT NULL,
  room_type       room_type NOT NULL,
  floor           INT NOT NULL DEFAULT 0,
  capacity        INT NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (center_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_center ON rooms (center_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms (room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (center_id, room_type);

-- Beds within rooms (for hospitals)
CREATE TABLE IF NOT EXISTS beds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number      VARCHAR(20) NOT NULL,
  bed_type        VARCHAR(50) NOT NULL DEFAULT 'general',
  status          bed_status NOT NULL DEFAULT 'available',
  daily_rate      NUMERIC(10,2),
  currency        VARCHAR(3) DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, bed_number)
);

CREATE INDEX IF NOT EXISTS idx_beds_room ON beds (room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds (status);

-- Bed assignments (current and historical)
CREATE TABLE IF NOT EXISTS bed_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id          UUID NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  admission_id    UUID, -- FK added after admissions table
  assigned_by     UUID REFERENCES providers(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bed_assignments_bed ON bed_assignments (bed_id);
CREATE INDEX IF NOT EXISTS idx_bed_assignments_patient ON bed_assignments (patient_id);
