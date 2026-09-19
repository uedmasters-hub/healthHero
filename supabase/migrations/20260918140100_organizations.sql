-- Multi-tenant organizations
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 3: MULTI-TENANCY & ORGANIZATION
-- ██████████████████████████████████████████████████████████████████████████████

-- Organizations (hospitals, clinic chains, healthcare networks)
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50) NOT NULL DEFAULT 'healthcare_network',
  logo_url        TEXT,
  website         TEXT,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address_line1   VARCHAR(255),
  address_line2   VARCHAR(255),
  city            VARCHAR(100),
  state           VARCHAR(100),
  country         VARCHAR(100) DEFAULT 'India',
  postal_code     VARCHAR(20),
  timezone        VARCHAR(50) DEFAULT 'Asia/Kolkata',
  gst_number      VARCHAR(20),
  license_number  VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_organizations_city ON organizations (city);
