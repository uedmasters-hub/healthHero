-- Insurance
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 15: INSURANCE MANAGEMENT
-- ██████████████████████████████████████████████████████████████████████████████

-- Insurance providers / payers
CREATE TABLE IF NOT EXISTS insurance_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(20) UNIQUE,
  logo_url        TEXT,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  website         TEXT,
  claims_portal   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patient insurance policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES insurance_providers(id) ON DELETE RESTRICT,
  provider_name VARCHAR(255),
  policy_number   VARCHAR(100) NOT NULL,
  policy_type     VARCHAR(50) NOT NULL DEFAULT 'health', -- health, family_floater, critical_illness, personal_accident
  plan_name       VARCHAR(200),
  sum_insured     NUMERIC(12,2),
  deductible      NUMERIC(10,2) DEFAULT 0,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, cancelled
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  network_type    VARCHAR(50), -- cashless, reimbursement
  attachments     TEXT[], -- scan copies of policy
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_user ON insurance_policies (user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_provider ON insurance_policies (provider_id);

-- Insurance eligibility checks
CREATE TABLE IF NOT EXISTS insurance_eligibility (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  check_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  is_eligible     BOOLEAN NOT NULL,
  coverage_details JSONB,
  remaining_sum   NUMERIC(12,2),
  cashless_available BOOLEAN,
  response_raw    JSONB,
  checked_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eligibility_policy ON insurance_eligibility (policy_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_patient ON insurance_eligibility (patient_id);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number    VARCHAR(50) UNIQUE NOT NULL,
  policy_id       UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  admission_id    UUID REFERENCES admissions(id) ON DELETE SET NULL,
  provider_id     UUID REFERENCES providers(id),
  center_id       UUID REFERENCES healthcare_centers(id),
  status          claim_status NOT NULL DEFAULT 'draft',
  claim_amount    NUMERIC(12,2) NOT NULL,
  approved_amount NUMERIC(12,2),
  denied_amount   NUMERIC(12,2),
  diagnosis_codes TEXT[],
  procedure_codes TEXT[],
  date_of_service DATE NOT NULL,
  date_of_admission DATE,
  date_of_discharge DATE,
  admission_type  VARCHAR(30),
  documents       TEXT[], -- supporting documents
  denial_reason   TEXT,
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_policy ON insurance_claims (policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON insurance_claims (patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims (status);
CREATE INDEX IF NOT EXISTS idx_claims_date ON insurance_claims (date_of_service);

-- Pre-authorization requests
CREATE TABLE IF NOT EXISTS pre_authorizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID REFERENCES insurance_claims(id) ON DELETE SET NULL,
  policy_id       UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  procedure_code  VARCHAR(20),
  procedure_desc  TEXT,
  diagnosis_code  VARCHAR(10),
  requested_amount NUMERIC(12,2),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, denied
  auth_number     VARCHAR(50),
  approved_amount NUMERIC(12,2),
  valid_until     DATE,
  response_notes  TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preauth_policy ON pre_authorizations (policy_id);
CREATE INDEX IF NOT EXISTS idx_preauth_patient ON pre_authorizations (patient_id);

-- Explanation of Benefits (EOB)
CREATE TABLE IF NOT EXISTS eob_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  document_url    TEXT NOT NULL,
  document_type   VARCHAR(50) NOT NULL DEFAULT 'eob',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eob_claim ON eob_documents (claim_id);
