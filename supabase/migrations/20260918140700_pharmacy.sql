-- Pharmacy, drugs, prescriptions
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 9: PHARMACY MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Pharmacies
CREATE TABLE IF NOT EXISTS pharmacies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
  center_id       UUID REFERENCES healthcare_centers(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  license_number  VARCHAR(100),
  address_line1   VARCHAR(255),
  city            VARCHAR(100),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  delivers        BOOLEAN NOT NULL DEFAULT true,
  delivery_radius_km NUMERIC(5,1),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_org ON pharmacies (org_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_city ON pharmacies (city);

-- Drug catalog
CREATE TABLE IF NOT EXISTS drugs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  generic_name    VARCHAR(255),
  manufacturer    VARCHAR(200),
  drug_class      VARCHAR(100),
  dosage_form     VARCHAR(50), -- tablet, capsule, syrup, injection, etc.
  strength        VARCHAR(100),
  ndc_number      VARCHAR(20), -- National Drug Code
  is_controlled   BOOLEAN NOT NULL DEFAULT false,
  controlled_schedule INT, -- Schedule II, III, IV, etc.
  requires_prescription BOOLEAN NOT NULL DEFAULT true,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_generic ON drugs USING gin (generic_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_class ON drugs (drug_class);

-- Drug interactions (reference data)
CREATE TABLE IF NOT EXISTS drug_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a_id       UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  drug_b_id       UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  severity        severity_enum NOT NULL DEFAULT 'moderate',
  description     TEXT NOT NULL,
  recommendation  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (drug_a_id < drug_b_id) -- prevent duplicate pairs
);

CREATE INDEX IF NOT EXISTS idx_drug_interactions_a ON drug_interactions (drug_a_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_b ON drug_interactions (drug_b_id);

-- Pharmacy inventory
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  batch_number    VARCHAR(50),
  quantity         INT NOT NULL DEFAULT 0,
  unit_price      NUMERIC(10,2) NOT NULL,
  mrp             NUMERIC(10,2),
  expiry_date     DATE,
  manufacturing_date DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pharmacy_id, drug_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_pharmacy ON pharmacy_inventory (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_drug ON pharmacy_inventory (drug_id);

-- Inventory transactions (audit trail for stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
  inventory_id    UUID NOT NULL REFERENCES pharmacy_inventory(id) ON DELETE RESTRICT,
  transaction_type inventory_transaction_type NOT NULL,
  quantity_change  INT NOT NULL, -- positive for add, negative for remove
  reference_id    UUID, -- order_id, prescription_id, etc.
  reference_type  VARCHAR(50),
  performed_by    UUID REFERENCES public.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_pharmacy ON inventory_transactions (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_txn_inventory ON inventory_transactions (inventory_id);

-- Prescriptions (issued by providers)
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id     UUID REFERENCES providers(id) ON DELETE RESTRICT,
  pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  status          prescription_status NOT NULL DEFAULT 'active',
  diagnosis       TEXT,
  notes           TEXT,
  valid_until     DATE,
  is_refillable   BOOLEAN NOT NULL DEFAULT false,
  refill_count    INT DEFAULT 0,
  refills_remaining INT DEFAULT 0,
  dispensed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider ON prescriptions (provider_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions (status);

-- Prescription line items (individual medications)
CREATE TABLE IF NOT EXISTS prescription_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  drug_name       VARCHAR(255) NOT NULL, -- denormalized for display
  dosage          VARCHAR(100) NOT NULL,
  frequency       VARCHAR(100) NOT NULL,
  duration_days   INT,
  quantity         INT NOT NULL,
  refills_authorized INT DEFAULT 0,
  instructions    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON prescription_items (prescription_id);

-- Pharmacy orders (delivery/pickup)
CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  status          dispensing_status NOT NULL DEFAULT 'pending',
  order_type      VARCHAR(20) NOT NULL DEFAULT 'delivery', -- delivery, pickup
  delivery_address_id UUID REFERENCES patient_addresses(id),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_delivery TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  delivered_by    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_user ON pharmacy_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy ON pharmacy_orders (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders (status);

-- Pharmacy order items
CREATE TABLE IF NOT EXISTS pharmacy_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  inventory_id    UUID NOT NULL REFERENCES pharmacy_inventory(id) ON DELETE RESTRICT,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  quantity         INT NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_order_items_order ON pharmacy_order_items (order_id);
