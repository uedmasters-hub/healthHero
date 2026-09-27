-- Marketplace shopping on the existing pharmacy tables.
-- Products, stock, prescriptions, carts, orders, payments, and delivery
-- events stay in Supabase. Apply with the usual migration flow; this file
-- is not pushed automatically.

ALTER TABLE public.drugs
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'medicine',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS pack_label text;

ALTER TABLE public.drugs DROP CONSTRAINT IF EXISTS drugs_category_check;
ALTER TABLE public.drugs
  ADD CONSTRAINT drugs_category_check
  CHECK (category IN ('medicine', 'equipment', 'wellness'));

CREATE UNIQUE INDEX IF NOT EXISTS drugs_slug_key ON public.drugs (slug) WHERE slug IS NOT NULL;

ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS typical_eta_minutes integer NOT NULL DEFAULT 180;

ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS delivery_note text;

CREATE TABLE IF NOT EXISTS public.pharmacy_carts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.pharmacy_cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     uuid NOT NULL REFERENCES public.pharmacy_carts(id) ON DELETE CASCADE,
  drug_id     uuid NOT NULL REFERENCES public.drugs(id) ON DELETE RESTRICT,
  quantity    integer NOT NULL CHECK (quantity > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, drug_id)
);

CREATE TABLE IF NOT EXISTS public.pharmacy_order_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  status      public.dispensing_status NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_order_events_order
  ON public.pharmacy_order_events (order_id, created_at);

CREATE TABLE IF NOT EXISTS public.prescription_files (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id  uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  storage_path     text NOT NULL,
  file_name        text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_files_rx
  ON public.prescription_files (prescription_id);

-- Live catalog: one row per drug with stock, price, and delivery window.
CREATE OR REPLACE VIEW public.pharmacy_catalog
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.slug,
  d.name,
  d.generic_name,
  d.manufacturer,
  d.drug_class,
  d.dosage_form,
  d.strength,
  d.category,
  d.description,
  d.pack_label,
  d.requires_prescription,
  COALESCE(SUM(i.quantity) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active), 0)::integer AS stock_qty,
  MIN(i.unit_price) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active) AS price,
  MIN(i.mrp) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active) AS mrp,
  MIN(p.typical_eta_minutes) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active AND p.delivers) AS eta_minutes
FROM public.drugs d
LEFT JOIN public.pharmacy_inventory i ON i.drug_id = d.id
LEFT JOIN public.pharmacies p ON p.id = i.pharmacy_id
WHERE d.is_active
GROUP BY d.id;

ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drugs_read_active ON public.drugs;
CREATE POLICY drugs_read_active ON public.drugs
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS pharmacies_read_active ON public.pharmacies;
CREATE POLICY pharmacies_read_active ON public.pharmacies
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS inventory_read_active ON public.pharmacy_inventory;
CREATE POLICY inventory_read_active ON public.pharmacy_inventory
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS carts_own ON public.pharmacy_carts;
CREATE POLICY carts_own ON public.pharmacy_carts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS cart_items_own ON public.pharmacy_cart_items;
CREATE POLICY cart_items_own ON public.pharmacy_cart_items
  FOR ALL TO authenticated
  USING (
    cart_id IN (SELECT id FROM public.pharmacy_carts WHERE user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    cart_id IN (SELECT id FROM public.pharmacy_carts WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS pharmacy_orders_read_own ON public.pharmacy_orders;
CREATE POLICY pharmacy_orders_read_own ON public.pharmacy_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS pharmacy_order_items_read_own ON public.pharmacy_order_items;
CREATE POLICY pharmacy_order_items_read_own ON public.pharmacy_order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (SELECT id FROM public.pharmacy_orders WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS pharmacy_order_events_read_own ON public.pharmacy_order_events;
CREATE POLICY pharmacy_order_events_read_own ON public.pharmacy_order_events
  FOR SELECT TO authenticated
  USING (
    order_id IN (SELECT id FROM public.pharmacy_orders WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS prescription_items_own ON public.prescription_items;
CREATE POLICY prescription_items_own ON public.prescription_items
  FOR ALL TO authenticated
  USING (
    prescription_id IN (SELECT id FROM public.prescriptions WHERE patient_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    prescription_id IN (SELECT id FROM public.prescriptions WHERE patient_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS prescription_files_own ON public.prescription_files;
CREATE POLICY prescription_files_own ON public.prescription_files
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

GRANT SELECT ON public.pharmacy_catalog TO anon, authenticated;
GRANT SELECT ON public.drugs TO anon, authenticated;
GRANT SELECT ON public.pharmacies TO anon, authenticated;
GRANT SELECT ON public.pharmacy_inventory TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_cart_items TO authenticated;
GRANT SELECT ON public.pharmacy_orders TO authenticated;
GRANT SELECT ON public.pharmacy_order_items TO authenticated;
GRANT SELECT ON public.pharmacy_order_events TO authenticated;
GRANT SELECT, INSERT ON public.prescription_files TO authenticated;

CREATE OR REPLACE FUNCTION public.place_pharmacy_order(
  p_note text,
  p_prescription_id uuid,
  p_pharmacy_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cart uuid;
  pharm uuid;
  oid uuid := gen_random_uuid();
  iid uuid := gen_random_uuid();
  needs_rx boolean;
  has_rx boolean;
  rec record;
  inv record;
  subtotal numeric := 0;
  fee numeric := 0;
  eta integer;
  line_total numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to place an order';
  END IF;

  SELECT id INTO cart FROM public.pharmacy_carts WHERE user_id = uid;
  IF cart IS NULL OR NOT EXISTS (SELECT 1 FROM public.pharmacy_cart_items WHERE cart_id = cart) THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pharmacy_cart_items ci
    JOIN public.drugs d ON d.id = ci.drug_id
    WHERE ci.cart_id = cart AND d.requires_prescription
  ) INTO needs_rx;

  IF needs_rx THEN
    IF p_prescription_id IS NULL THEN
      RAISE EXCEPTION 'A prescription is required for one or more medicines';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE id = p_prescription_id
        AND patient_id = uid
        AND status = 'active'
    ) INTO has_rx;
    IF NOT has_rx THEN
      RAISE EXCEPTION 'That prescription is not active for this patient';
    END IF;
  END IF;

  SELECT p.id, COALESCE(p.typical_eta_minutes, 180)
  INTO pharm, eta
  FROM public.pharmacies p
  WHERE p.is_active
    AND (p_pharmacy_id IS NULL OR p.id = p_pharmacy_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.pharmacy_cart_items ci
      WHERE ci.cart_id = cart
        AND NOT EXISTS (
          SELECT 1 FROM public.pharmacy_inventory i
          WHERE i.pharmacy_id = p.id
            AND i.drug_id = ci.drug_id
            AND i.is_active
            AND i.quantity >= ci.quantity
        )
    )
  ORDER BY p.typical_eta_minutes NULLS LAST
  LIMIT 1;

  IF pharm IS NULL THEN
    RAISE EXCEPTION 'Not enough stock at one pharmacy to fill this cart';
  END IF;

  SELECT CASE WHEN delivers THEN 49 ELSE 0 END INTO fee
  FROM public.pharmacies WHERE id = pharm;

  INSERT INTO public.pharmacy_orders (
    id, user_id, pharmacy_id, prescription_id, status, order_type,
    total_amount, delivery_fee, estimated_delivery, delivery_note
  ) VALUES (
    oid, uid, pharm, CASE WHEN needs_rx THEN p_prescription_id ELSE NULL END,
    'pending', 'delivery', 0, fee,
    now() + make_interval(mins => eta),
    NULLIF(btrim(COALESCE(p_note, '')), '')
  );

  FOR rec IN
    SELECT ci.drug_id, ci.quantity
    FROM public.pharmacy_cart_items ci
    WHERE ci.cart_id = cart
  LOOP
    SELECT i.id, i.unit_price
    INTO inv
    FROM public.pharmacy_inventory i
    WHERE i.pharmacy_id = pharm
      AND i.drug_id = rec.drug_id
      AND i.is_active
      AND i.quantity >= rec.quantity
    ORDER BY i.unit_price
    LIMIT 1
    FOR UPDATE;

    IF inv.id IS NULL THEN
      RAISE EXCEPTION 'Stock changed while checking out. Review your cart.';
    END IF;

    line_total := inv.unit_price * rec.quantity;
    subtotal := subtotal + line_total;

    INSERT INTO public.pharmacy_order_items (
      order_id, inventory_id, drug_id, quantity, unit_price, total_price
    ) VALUES (
      oid, inv.id, rec.drug_id, rec.quantity, inv.unit_price, line_total
    );

    UPDATE public.pharmacy_inventory
    SET quantity = quantity - rec.quantity, updated_at = now()
    WHERE id = inv.id;

    INSERT INTO public.inventory_transactions (
      pharmacy_id, inventory_id, transaction_type, quantity_change,
      reference_id, reference_type, performed_by, notes
    ) VALUES (
      pharm, inv.id, 'dispensing', -rec.quantity,
      oid, 'pharmacy_order', uid, 'Marketplace checkout'
    );
  END LOOP;

  UPDATE public.pharmacy_orders
  SET total_amount = subtotal + fee, updated_at = now()
  WHERE id = oid;

  INSERT INTO public.pharmacy_order_events (order_id, status, note)
  VALUES (oid, 'pending', 'Payment received. The pharmacy is preparing your order.');

  INSERT INTO public.invoices (
    id, invoice_number, user_id, pharmacy_order_id, status,
    subtotal, total_amount, amount_paid, currency, notes
  ) VALUES (
    iid,
    'PH-' || to_char(now(), 'YYYYMMDD') || '-' || substr(oid::text, 1, 8),
    uid, oid, 'paid',
    subtotal, subtotal + fee, subtotal + fee, 'NPR',
    'Pharmacy order'
  );

  INSERT INTO public.invoice_items (
    invoice_id, description, quantity, unit_price, total_price
  )
  SELECT iid, d.name, oi.quantity, oi.unit_price, oi.total_price
  FROM public.pharmacy_order_items oi
  JOIN public.drugs d ON d.id = oi.drug_id
  WHERE oi.order_id = oid;

  IF fee > 0 THEN
    INSERT INTO public.invoice_items (
      invoice_id, description, quantity, unit_price, total_price
    ) VALUES (iid, 'Delivery', 1, fee, fee);
  END IF;

  INSERT INTO public.payments (
    invoice_id, user_id, amount, currency, method, status, paid_at
  ) VALUES (
    iid, uid, subtotal + fee, 'NPR', 'upi', 'paid', now()
  );

  DELETE FROM public.pharmacy_cart_items WHERE cart_id = cart;
  UPDATE public.pharmacy_carts SET updated_at = now() WHERE id = cart;

  RETURN oid;
END;
$$;

REVOKE ALL ON FUNCTION public.place_pharmacy_order(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_pharmacy_order(text, uuid, uuid) TO authenticated;

-- Fulfillment pharmacy and a small live catalog. Idempotent by slug.
INSERT INTO public.pharmacies (
  id, name, license_number, address_line1, city, delivers, delivery_radius_km,
  is_active, typical_eta_minutes
)
SELECT
  'a1000000-0000-4000-8000-000000000001',
  'eMedicalls Pharmacy',
  'DDA-EM-001',
  'Kathmandu',
  'Kathmandu',
  true,
  25,
  true,
  120
WHERE NOT EXISTS (
  SELECT 1 FROM public.pharmacies WHERE id = 'a1000000-0000-4000-8000-000000000001'
);

INSERT INTO public.drugs (
  id, slug, name, generic_name, manufacturer, drug_class, dosage_form, strength,
  category, description, pack_label, requires_prescription, is_active
)
SELECT * FROM (VALUES
  ('a1000000-0000-4000-8000-000000000101'::uuid, 'paracetamol-500', 'Paracetamol 500 mg', 'Paracetamol', 'eMedicalls', 'Pain & fever', 'Tablet', '500 mg', 'medicine', 'For fever and mild pain.', '10 tablets', false, true),
  ('a1000000-0000-4000-8000-000000000102'::uuid, 'cetirizine-10', 'Cetirizine 10 mg', 'Cetirizine', 'eMedicalls', 'Allergy', 'Tablet', '10 mg', 'medicine', 'For hay fever and skin allergy.', '10 tablets', false, true),
  ('a1000000-0000-4000-8000-000000000103'::uuid, 'amoxicillin-500', 'Amoxicillin 500 mg', 'Amoxicillin', 'eMedicalls', 'Antibiotic', 'Capsule', '500 mg', 'medicine', 'An antibiotic. A prescription is required.', '15 capsules', true, true),
  ('a1000000-0000-4000-8000-000000000104'::uuid, 'metformin-500', 'Metformin 500 mg', 'Metformin', 'eMedicalls', 'Diabetes', 'Tablet', '500 mg', 'medicine', 'For type 2 diabetes. A prescription is required.', '20 tablets', true, true),
  ('a1000000-0000-4000-8000-000000000201'::uuid, 'digital-thermometer', 'Digital thermometer', NULL, 'eMedicalls', 'Monitoring', 'Device', NULL, 'equipment', 'A home thermometer with a clear reading.', '1 device', false, true),
  ('a1000000-0000-4000-8000-000000000202'::uuid, 'bp-monitor', 'Blood pressure monitor', NULL, 'eMedicalls', 'Monitoring', 'Device', NULL, 'equipment', 'An upper-arm monitor for home checks.', '1 device', false, true),
  ('a1000000-0000-4000-8000-000000000301'::uuid, 'vitamin-d3', 'Vitamin D3', 'Cholecalciferol', 'eMedicalls', 'Vitamins', 'Tablet', '1000 IU', 'wellness', 'A daily vitamin D supplement.', '30 tablets', false, true),
  ('a1000000-0000-4000-8000-000000000302'::uuid, 'ors', 'Oral rehydration salts', NULL, 'eMedicalls', 'Hydration', 'Sachet', NULL, 'wellness', 'For fluid replacement.', '10 sachets', false, true)
) AS seed (
  id, slug, name, generic_name, manufacturer, drug_class, dosage_form, strength,
  category, description, pack_label, requires_prescription, is_active
)
WHERE NOT EXISTS (SELECT 1 FROM public.drugs d WHERE d.slug = seed.slug);

INSERT INTO public.pharmacy_inventory (
  pharmacy_id, drug_id, batch_number, quantity, unit_price, mrp, is_active
)
SELECT
  'a1000000-0000-4000-8000-000000000001',
  d.id,
  'EM-OPEN',
  CASE d.slug
    WHEN 'bp-monitor' THEN 12
    WHEN 'digital-thermometer' THEN 20
    ELSE 40
  END,
  CASE d.slug
    WHEN 'paracetamol-500' THEN 45
    WHEN 'cetirizine-10' THEN 60
    WHEN 'amoxicillin-500' THEN 180
    WHEN 'metformin-500' THEN 95
    WHEN 'digital-thermometer' THEN 350
    WHEN 'bp-monitor' THEN 2450
    WHEN 'vitamin-d3' THEN 320
    WHEN 'ors' THEN 80
    ELSE 100
  END,
  CASE d.slug
    WHEN 'paracetamol-500' THEN 55
    WHEN 'cetirizine-10' THEN 75
    WHEN 'amoxicillin-500' THEN 210
    WHEN 'metformin-500' THEN 120
    WHEN 'digital-thermometer' THEN 420
    WHEN 'bp-monitor' THEN 2890
    WHEN 'vitamin-d3' THEN 380
    WHEN 'ors' THEN 95
    ELSE 120
  END,
  true
FROM public.drugs d
WHERE d.slug IN (
  'paracetamol-500', 'cetirizine-10', 'amoxicillin-500', 'metformin-500',
  'digital-thermometer', 'bp-monitor', 'vitamin-d3', 'ors'
)
AND NOT EXISTS (
  SELECT 1 FROM public.pharmacy_inventory i
  WHERE i.pharmacy_id = 'a1000000-0000-4000-8000-000000000001'
    AND i.drug_id = d.id
    AND i.batch_number = 'EM-OPEN'
);

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('prescriptions', 'prescriptions', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN undefined_table OR insufficient_privilege THEN
  NULL;
END $$;
