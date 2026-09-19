-- Audit log, settings, articles
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 19: SYSTEM SERVICES & AUDIT
-- ██████████████████████████████████████████████████████████████████████████████

-- System-wide audit log (append-only, partitioned by month)
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  actor_id        UUID,
  actor_name      VARCHAR(200),
  actor_role      VARCHAR(50),
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(100) NOT NULL,
  entity_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  request_id      UUID,
  session_id      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next 12 months
CREATE TABLE IF NOT EXISTS audit_log_2026_09 PARTITION OF audit_log
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_10 PARTITION OF audit_log
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_11 PARTITION OF audit_log
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_12 PARTITION OF audit_log
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS audit_log_2027_01 PARTITION OF audit_log
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE IF NOT EXISTS audit_log_2027_02 PARTITION OF audit_log
  FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE IF NOT EXISTS audit_log_2027_03 PARTITION OF audit_log
  FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS audit_log_2027_04 PARTITION OF audit_log
  FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE IF NOT EXISTS audit_log_2027_05 PARTITION OF audit_log
  FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
CREATE TABLE IF NOT EXISTS audit_log_2027_06 PARTITION OF audit_log
  FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  setting_key     VARCHAR(100) NOT NULL,
  setting_value   TEXT,
  value_type      VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  description     TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, setting_key)
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  flag_key        VARCHAR(100) NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  description     TEXT,
  rollout_percentage INT DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  allowed_roles   TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, flag_key)
);

-- Health articles / content
CREATE TABLE IF NOT EXISTS articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  category        VARCHAR(100),
  author_name     VARCHAR(200),
  author_avatar   TEXT,
  hero_image_url  TEXT,
  excerpt         TEXT,
  content         JSONB, -- structured content sections
  read_time_minutes INT,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (is_published, published_at);

-- Saved insights / bookmarks
CREATE TABLE IF NOT EXISTS saved_insights (
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);
