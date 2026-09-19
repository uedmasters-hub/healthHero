-- Consent management
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 16: CONSENT MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Consent types (reference)
CREATE TABLE IF NOT EXISTS consent_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(100), -- treatment, data_sharing, research, marketing
  requires_witness BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patient consents
CREATE TABLE IF NOT EXISTS patient_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  consent_type_id UUID NOT NULL REFERENCES consent_types(id) ON DELETE RESTRICT,
  status          consent_status NOT NULL DEFAULT 'granted',
  scope           TEXT, -- what exactly is consented
  granted_to      UUID REFERENCES organizations(id),
  valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  withdrawal_date DATE,
  document_url    TEXT, -- signed consent form
  ip_address      INET,
  digital_signature TEXT,
  witness_id      UUID REFERENCES public.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_patient ON patient_consents (patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON patient_consents (consent_type_id);
CREATE INDEX IF NOT EXISTS idx_consents_status ON patient_consents (status);
