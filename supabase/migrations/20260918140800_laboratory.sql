-- Laboratory and imaging
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 10: LABORATORY & RADIOLOGY
-- ██████████████████████████████████████████████████████████████████████████████

-- Laboratories / diagnostic centers
CREATE TABLE IF NOT EXISTS laboratories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
  center_id       UUID REFERENCES healthcare_centers(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  license_number  VARCHAR(100),
  accreditation   VARCHAR(100), -- NABL, CAP, etc.
  address_line1   VARCHAR(255),
  city            VARCHAR(100),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  offers_home_collection BOOLEAN NOT NULL DEFAULT true,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laboratories_org ON laboratories (org_id);

-- Lab test catalog
CREATE TABLE IF NOT EXISTS lab_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(50) UNIQUE,
  category        VARCHAR(100),
  description     TEXT,
  specimen_type   VARCHAR(50), -- blood, urine, stool, tissue, etc.
  turnaround_hours INT,
  price           NUMERIC(10,2),
  currency        VARCHAR(3) DEFAULT 'INR',
  requires_fasting BOOLEAN NOT NULL DEFAULT false,
  instructions    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_tests_name ON lab_tests USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lab_tests_category ON lab_tests (category);

-- Lab test reference ranges
CREATE TABLE IF NOT EXISTS lab_test_reference_ranges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_test_id     UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  gender          gender_enum,
  age_min_days    INT,
  age_max_days    INT,
  unit            VARCHAR(30),
  normal_min      NUMERIC(10,3),
  normal_max      NUMERIC(10,3),
  critical_low    NUMERIC(10,3),
  critical_high   NUMERIC(10,3),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_ranges_test ON lab_test_reference_ranges (lab_test_id);

-- Lab orders
CREATE TABLE IF NOT EXISTS lab_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ordering_provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  laboratory_id   UUID REFERENCES laboratories(id) ON DELETE SET NULL,
  status          lab_order_status NOT NULL DEFAULT 'ordered',
  priority        VARCHAR(20) NOT NULL DEFAULT 'routine', -- routine, urgent, stat
  clinical_indication TEXT,
  notes           TEXT,
  ordered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  specimen_collected_at TIMESTAMPTZ,
  results_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_provider ON lab_orders (ordering_provider_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders (status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders (ordered_at);

-- Lab order items (tests in an order)
CREATE TABLE IF NOT EXISTS lab_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id    UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  lab_test_id     UUID NOT NULL REFERENCES lab_tests(id) ON DELETE RESTRICT,
  status          lab_order_status NOT NULL DEFAULT 'ordered',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_order_items_order ON lab_order_items (lab_order_id);

-- Specimens
CREATE TABLE IF NOT EXISTS specimens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id    UUID NOT NULL REFERENCES lab_orders(id) ON DELETE RESTRICT,
  specimen_type   VARCHAR(50) NOT NULL,
  collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_by    VARCHAR(200),
  status          specimen_status NOT NULL DEFAULT 'collected',
  received_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specimens_order ON specimens (lab_order_id);

-- Lab results
CREATE TABLE IF NOT EXISTS lab_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id    UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  lab_test_id     UUID NOT NULL REFERENCES lab_tests(id) ON DELETE RESTRICT,
  specimen_id     UUID REFERENCES specimens(id) ON DELETE SET NULL,
  result_value    VARCHAR(255),
  result_numeric  NUMERIC(12,4),
  unit            VARCHAR(30),
  reference_range VARCHAR(100),
  is_abnormal     BOOLEAN NOT NULL DEFAULT false,
  abnormality_flag VARCHAR(20), -- high, low, critical_high, critical_low
  performed_by    VARCHAR(200),
  verified_by     VARCHAR(200),
  notes           TEXT,
  resulted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_results (lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test ON lab_results (lab_test_id);

-- Imaging / radiology orders
CREATE TABLE IF NOT EXISTS imaging_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ordering_provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  center_id       UUID REFERENCES healthcare_centers(id) ON DELETE SET NULL,
  imaging_type    VARCHAR(50) NOT NULL, -- xray, mri, ct, ultrasound, etc.
  body_site       VARCHAR(100),
  clinical_indication TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'ordered',
  priority        VARCHAR(20) NOT NULL DEFAULT 'routine',
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imaging_orders_patient ON imaging_orders (patient_id);

-- Imaging results / reports
CREATE TABLE IF NOT EXISTS imaging_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imaging_order_id UUID NOT NULL REFERENCES imaging_orders(id) ON DELETE CASCADE,
  report_text     TEXT,
  findings        TEXT,
  impression      TEXT,
  recommendation  TEXT,
  image_urls      TEXT[],
  report_url      TEXT,
  reported_by     VARCHAR(200),
  reported_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imaging_results_order ON imaging_results (imaging_order_id);
