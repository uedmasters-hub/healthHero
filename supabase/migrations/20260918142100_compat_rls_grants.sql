-- Compat columns, catalog grants, extra RLS, and updated_at triggers.
-- Keeps public.users / patients / doctors / staff as the identity spine.

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE public.healthcare_centers ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_payload jsonb;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_addresses ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.emergency_contacts ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_allergies ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_medications ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_diagnoses ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_vaccinations ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_surgeries ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.patient_conditions ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS source_id text;

CREATE UNIQUE INDEX IF NOT EXISTS providers_source_key_idx ON public.providers (source_key) WHERE source_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS healthcare_centers_source_key_idx ON public.healthcare_centers (source_key) WHERE source_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS appointments_user_client_idx ON public.appointments (user_id, client_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_addresses_user_source_idx ON public.patient_addresses (user_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS emergency_contacts_user_source_idx ON public.emergency_contacts (user_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS family_members_user_source_idx ON public.family_members (user_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_allergies_source_idx ON public.patient_allergies (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_medications_source_idx ON public.patient_medications (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_diagnoses_source_idx ON public.patient_diagnoses (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_vaccinations_source_idx ON public.patient_vaccinations (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_surgeries_source_idx ON public.patient_surgeries (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_conditions_source_idx ON public.patient_conditions (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS medical_documents_source_idx ON public.medical_documents (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_source_idx ON public.prescriptions (patient_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS insurance_policies_source_idx ON public.insurance_policies (user_id, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_idx ON public.notifications (user_id, source_id);

INSERT INTO public.organizations (id, name, type)
VALUES ('00000000-0000-4000-a000-000000000000', 'Health Hero', 'healthcare_network')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patient_profiles','patient_addresses','emergency_contacts','family_members',
    'providers','provider_schedules','healthcare_centers','departments','rooms','beds',
    'appointments','consultation_notes','patient_diagnoses','patient_allergies',
    'patient_medications','patient_surgeries','patient_conditions','medical_documents',
    'prescriptions','pharmacy_orders','lab_orders','imaging_orders','home_care_visits',
    'invoices','payments','insurance_policies','insurance_claims','patient_consents',
    'notifications','notification_preferences','reviews','articles','users','patients',
    'doctors','staff'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = t || '_set_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        t || '_set_updated_at', t
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthcare_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_own ON public.appointments;
CREATE POLICY appointments_own ON public.appointments
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS appointment_history_own ON public.appointment_history;
CREATE POLICY appointment_history_own ON public.appointment_history
  FOR SELECT TO authenticated
  USING (
    appointment_id IN (SELECT id FROM public.appointments WHERE user_id = auth.uid() OR patient_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS notification_preferences_own ON public.notification_preferences;
CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS reviews_own ON public.reviews;
CREATE POLICY reviews_own ON public.reviews
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS saved_providers_own ON public.saved_providers;
CREATE POLICY saved_providers_own ON public.saved_providers
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS saved_insights_own ON public.saved_insights;
CREATE POLICY saved_insights_own ON public.saved_insights
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS invoices_own ON public.invoices;
CREATE POLICY invoices_own ON public.invoices
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS payments_own ON public.payments;
CREATE POLICY payments_own ON public.payments
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (SELECT id FROM public.invoices WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS payment_methods_own ON public.payment_methods;
CREATE POLICY payment_methods_own ON public.payment_methods
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS consultation_notes_own ON public.consultation_notes;
CREATE POLICY consultation_notes_own ON public.consultation_notes
  FOR SELECT TO authenticated
  USING (
    appointment_id IN (SELECT id FROM public.appointments WHERE user_id = auth.uid() OR patient_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS vital_signs_own ON public.vital_signs;
CREATE POLICY vital_signs_own ON public.vital_signs
  FOR ALL TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS imaging_results_own ON public.imaging_results;
CREATE POLICY imaging_results_own ON public.imaging_results
  FOR SELECT TO authenticated
  USING (
    imaging_order_id IN (SELECT id FROM public.imaging_orders WHERE patient_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS catalog_providers_read ON public.providers;
CREATE POLICY catalog_providers_read ON public.providers
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalog_specializations_read ON public.specializations;
CREATE POLICY catalog_specializations_read ON public.specializations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalog_centers_read ON public.healthcare_centers;
CREATE POLICY catalog_centers_read ON public.healthcare_centers
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalog_articles_read ON public.articles;
CREATE POLICY catalog_articles_read ON public.articles
  FOR SELECT TO authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS catalog_icd10_read ON public.icd10_codes;
CREATE POLICY catalog_icd10_read ON public.icd10_codes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalog_cpt_read ON public.cpt_codes;
CREATE POLICY catalog_cpt_read ON public.cpt_codes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalog_orgs_read ON public.organizations;
CREATE POLICY catalog_orgs_read ON public.organizations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalog_consent_types_read ON public.consent_types;
CREATE POLICY catalog_consent_types_read ON public.consent_types
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
