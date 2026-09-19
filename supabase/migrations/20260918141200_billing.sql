-- Billing and payments
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 14: BILLING & PAYMENTS
-- ██████████████████████████████████████████████████████████████████████████████

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  pharmacy_order_id UUID REFERENCES pharmacy_orders(id) ON DELETE SET NULL,
  lab_order_id    UUID REFERENCES lab_orders(id) ON DELETE SET NULL,
  admission_id    UUID REFERENCES admissions(id) ON DELETE SET NULL,
  center_id       UUID REFERENCES healthcare_centers(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, issued, partially_paid, paid, void
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due      NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  due_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices (appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (created_at);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     VARCHAR(255) NOT NULL,
  service_code    VARCHAR(20), -- CPT code or internal code
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10,2) NOT NULL,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price     NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount          NUMERIC(12,2) NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  method          payment_method_enum NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  transaction_id  VARCHAR(200),
  gateway_order_id VARCHAR(200),
  gateway_payment_id VARCHAR(200),
  upi_app_id      VARCHAR(50),
  upi_mode        VARCHAR(20),
  upi_id          VARCHAR(200),
  bank_reference  VARCHAR(200),
  card_last_four  VARCHAR(4),
  card_network    VARCHAR(20),
  failure_reason  TEXT,
  refund_amount   NUMERIC(12,2) DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments (gateway_order_id);

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount          NUMERIC(12,2) NOT NULL,
  reason          TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  initiated_by    UUID REFERENCES public.users(id),
  gateway_refund_id VARCHAR(200),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds (payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_invoice ON refunds (invoice_id);

-- Patient payment methods (saved cards, UPI)
CREATE TABLE IF NOT EXISTS payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method_type     payment_method_enum NOT NULL,
  provider        VARCHAR(50), -- razorpay, payu, etc.
  token           TEXT NOT NULL, -- tokenized payment method
  display_name    VARCHAR(100),
  last_four       VARCHAR(4),
  network         VARCHAR(20),
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods (user_id);
