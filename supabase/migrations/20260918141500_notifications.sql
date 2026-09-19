-- Notifications
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 17: NOTIFICATIONS
-- ██████████████████████████████████████████████████████████████████████████████

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) UNIQUE NOT NULL,
  channel         notification_channel NOT NULL,
  subject         VARCHAR(255),
  body_template   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  channel         notification_channel NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB, -- deep link, entity references
  status          notification_status NOT NULL DEFAULT 'pending',
  read_at         TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  push_enabled    BOOLEAN NOT NULL DEFAULT true,
  email_enabled   BOOLEAN NOT NULL DEFAULT true,
  sms_enabled     BOOLEAN NOT NULL DEFAULT false,
  appointment_reminders BOOLEAN NOT NULL DEFAULT true,
  lab_results     BOOLEAN NOT NULL DEFAULT true,
  prescriptions   BOOLEAN NOT NULL DEFAULT true,
  promotions      BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences (user_id);
