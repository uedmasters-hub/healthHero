-- Row-level security
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 20: ROW-LEVEL SECURITY (HIPAA COMPLIANCE)
-- ██████████████████████████████████████████████████████████████████████████████

-- Enable RLS on all PHI tables
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data (enforced at app level too)
-- These are baseline policies; provider access uses additional role-based policies

DROP POLICY IF EXISTS patient_own_data ON patient_profiles;
CREATE POLICY patient_own_data ON patient_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS patient_addresses_own ON patient_addresses;
CREATE POLICY patient_addresses_own ON patient_addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS emergency_contacts_own ON emergency_contacts;
CREATE POLICY emergency_contacts_own ON emergency_contacts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS family_members_own ON family_members;
CREATE POLICY family_members_own ON family_members
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS diagnoses_own ON patient_diagnoses;
CREATE POLICY diagnoses_own ON patient_diagnoses
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS allergies_own ON patient_allergies;
CREATE POLICY allergies_own ON patient_allergies
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS medications_own ON patient_medications;
CREATE POLICY medications_own ON patient_medications
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS vaccinations_own ON patient_vaccinations;
CREATE POLICY vaccinations_own ON patient_vaccinations
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS surgeries_own ON patient_surgeries;
CREATE POLICY surgeries_own ON patient_surgeries
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS conditions_own ON patient_conditions;
CREATE POLICY conditions_own ON patient_conditions
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS documents_own ON medical_documents;
CREATE POLICY documents_own ON medical_documents
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS prescriptions_own ON prescriptions;
CREATE POLICY prescriptions_own ON prescriptions
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS lab_orders_own ON lab_orders;
CREATE POLICY lab_orders_own ON lab_orders
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS lab_results_own ON lab_results;
CREATE POLICY lab_results_own ON lab_results
  FOR SELECT
  TO authenticated
  USING (lab_order_id IN (
    SELECT id FROM lab_orders WHERE patient_id = auth.uid()
  ) OR public.is_admin());

DROP POLICY IF EXISTS imaging_orders_own ON imaging_orders;
CREATE POLICY imaging_orders_own ON imaging_orders
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS insurance_policies_own ON insurance_policies;
CREATE POLICY insurance_policies_own ON insurance_policies
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS insurance_claims_own ON insurance_claims;
CREATE POLICY insurance_claims_own ON insurance_claims
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS consents_own ON patient_consents;
CREATE POLICY consents_own ON patient_consents
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin());
