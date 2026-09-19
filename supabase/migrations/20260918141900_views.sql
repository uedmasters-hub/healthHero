-- Query views
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- ██████████████████████████████████████████████████████████████████████████████
-- SECTION 21: VIEWS FOR COMMON QUERIES
-- ██████████████████████████████████████████████████████████████████████████████

-- Active upcoming appointments for a patient
CREATE OR REPLACE VIEW v_patient_appointments
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.user_id AS patient_user_id,
  a.patient_id,
  p.display_name AS provider_name,
  s.name AS specialization,
  hc.name AS center_name,
  a.scheduled_date,
  a.scheduled_time,
  a.duration_minutes,
  a.visit_type::TEXT,
  a.status::TEXT,
  a.notes,
  a.created_at
FROM appointments a
JOIN providers p ON a.provider_id = p.id
LEFT JOIN provider_specializations ps ON p.id = ps.provider_id AND ps.is_primary = true
LEFT JOIN specializations s ON ps.specialization_id = s.id
LEFT JOIN healthcare_centers hc ON a.center_id = hc.id
WHERE a.status IN ('confirmed', 'upcoming', 'checked_in');

-- Provider daily schedule
CREATE OR REPLACE VIEW v_provider_schedule
WITH (security_invoker = true) AS
SELECT
  a.id AS appointment_id,
  a.provider_id,
  a.scheduled_date,
  a.scheduled_time,
  a.duration_minutes,
  a.status::TEXT,
  a.visit_type::TEXT,
  pp.first_name || ' ' || pp.last_name AS patient_name,
  u.phone AS patient_phone,
  a.reason_for_visit
FROM appointments a
JOIN patient_profiles pp ON a.patient_id = pp.user_id
JOIN public.users u ON a.patient_id = u.id
WHERE a.status NOT IN ('cancelled', 'no_show', 'expired');

-- Patient health summary
CREATE OR REPLACE VIEW v_patient_health_summary
WITH (security_invoker = true) AS
SELECT
  u.id AS patient_id,
  pp.first_name || ' ' || pp.last_name AS patient_name,
  pp.blood_group,
  (SELECT COUNT(*) FROM patient_allergies pa WHERE pa.patient_id = u.id AND pa.status = 'active') AS active_allergies,
  (SELECT COUNT(*) FROM patient_medications pm WHERE pm.patient_id = u.id AND pm.status = 'active') AS active_medications,
  (SELECT COUNT(*) FROM patient_conditions pc WHERE pc.patient_id = u.id AND pc.status = 'active') AS active_conditions,
  (SELECT COUNT(*) FROM patient_diagnoses pd WHERE pd.patient_id = u.id AND pd.status = 'active') AS active_diagnoses,
  (SELECT COUNT(*) FROM patient_vaccinations pv WHERE pv.patient_id = u.id) AS total_vaccinations,
  (SELECT MAX(recorded_at) FROM vital_signs vs WHERE vs.patient_id = u.id) AS last_vital_signs_at
FROM public.users u
JOIN patient_profiles pp ON u.id = pp.user_id
WHERE u.role = 'patient';

-- Revenue summary by center
CREATE OR REPLACE VIEW v_revenue_by_center
WITH (security_invoker = true) AS
SELECT
  hc.id AS center_id,
  hc.name AS center_name,
  DATE_TRUNC('month', i.created_at) AS month,
  COUNT(DISTINCT i.id) AS invoice_count,
  SUM(i.total_amount) AS total_revenue,
  SUM(i.amount_paid) AS total_collected,
  SUM(i.amount_due) AS total_outstanding
FROM invoices i
JOIN healthcare_centers hc ON i.center_id = hc.id
WHERE i.status != 'void'
GROUP BY hc.id, hc.name, DATE_TRUNC('month', i.created_at);

-- Provider performance
CREATE OR REPLACE VIEW v_provider_performance
WITH (security_invoker = true) AS
SELECT
  p.id AS provider_id,
  p.display_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS completed_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') AS cancelled_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') AS no_shows,
  AVG(r.rating) AS avg_rating,
  COUNT(DISTINCT r.id) AS total_reviews
FROM providers p
LEFT JOIN appointments a ON p.id = a.provider_id
LEFT JOIN reviews r ON p.id = r.provider_id AND r.is_active = true
GROUP BY p.id, p.display_name;
