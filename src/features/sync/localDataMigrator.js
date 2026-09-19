/**
 * @file src/features/sync/localDataMigrator.js
 * Uploads localStorage health-chart and booking JSON into Supabase once per user.
 * Identity remains auth.users → public.users. This never writes passwords.
 */
import { supabase } from '../../lib/supabase'
import { STORAGE_KEYS as USER_KEYS } from '../../user/constants'
import { STORAGE_KEYS as BOOKING_KEYS } from '../../booking/constants'

const FLAG = (userId) => `healthhero:supabase-sync.v1:${userId}`

function parseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: 'Patient', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function mapGender(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'male' || key === 'female' || key === 'other') return key
  return 'unknown'
}

function mapBlood(value) {
  const allowed = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  const key = String(value || '').trim().toUpperCase()
  return allowed.includes(key) ? key : 'unknown'
}

function measure(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function asDate(value) {
  if (!value) return null
  const raw = typeof value === 'object' ? value.full || value.day || '' : value
  const text = String(raw).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function asTime(value) {
  if (!value) return null
  const text = String(value.time || value || '')
  const match = text.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return `${match[1].padStart(2, '0')}:${match[2]}:00`
}

function mapSeverity(value) {
  const key = String(value || '').toLowerCase().replace(/\s+/g, '_')
  if (['mild', 'moderate', 'severe', 'life_threatening'].includes(key)) return key
  if (key === 'critical') return 'severe'
  return 'moderate'
}

function mapVisit(value) {
  const key = String(value || '').toLowerCase()
  if (key.includes('video')) return 'video'
  if (key.includes('phone')) return 'phone'
  if (key.includes('home')) return 'home_visit'
  if (key.includes('emergency')) return 'emergency'
  return 'in_person'
}

function mapService(value) {
  const key = String(value || '').toLowerCase()
  if (key.includes('virtual') || key.includes('video')) return 'virtual_consultation'
  if (key.includes('pharm')) return 'pharmacy_delivery'
  if (key.includes('home')) return 'home_care_nursing'
  if (key.includes('lab')) return 'lab_test'
  if (key.includes('ambulance')) return 'ambulance'
  if (key.includes('emergency')) return 'emergency'
  return 'doctor_consultation'
}

function mapAppointmentStatus(value) {
  const key = String(value || 'draft')
  const allowed = [
    'draft', 'pending_payment', 'payment_processing', 'confirmed', 'upcoming',
    'checked_in', 'in_progress', 'completed', 'cancelled', 'rescheduled',
    'no_show', 'expired', 'refunded',
  ]
  if (allowed.includes(key)) return key
  if (key === 'booked') return 'confirmed'
  if (key === 'payment_pending') return 'pending_payment'
  return 'draft'
}

function doctorUuid(id) {
  if (id == null || id === '') return null
  const n = Number(id)
  if (!Number.isFinite(n) || n < 1) return null
  return `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict })
  if (error) throw error
}

export async function migrateLocalDataToSupabase(user) {
  if (typeof window === 'undefined' || !user?.id) return { ok: false, skipped: true }
  if (window.localStorage.getItem(FLAG(user.id)) === '1') return { ok: true, skipped: true }

  const db = parseJson(window.localStorage.getItem(USER_KEYS.DB))
  const localUser = db?.users?.[user.id] || Object.values(db?.users || {}).find((item) => (
    item?.credentials?.email && item.credentials.email === user.email
  )) || null

  const bookingState = parseJson(window.localStorage.getItem(`${BOOKING_KEYS.DB}:${user.id}`))
    || parseJson(window.localStorage.getItem(BOOKING_KEYS.DB))

  const profile = localUser?.profile || {}
  const { first, last } = splitName(profile.name || user.user_metadata?.full_name || user.email)
  const uid = user.id

  await supabase.from('patient_profiles').upsert({
    user_id: uid,
    first_name: first,
    last_name: last,
    date_of_birth: asDate(profile.dob),
    gender: mapGender(profile.gender),
    blood_group: mapBlood(profile.bloodGroup),
    height_cm: measure(profile.height),
    weight_kg: measure(profile.weight),
    avatar_url: profile.avatar || null,
    emergency_contact_name: profile.emergencyContact?.name || null,
    emergency_contact_phone: profile.emergencyContact?.phone || null,
    emergency_contact_relation: profile.emergencyContact?.relation || null,
  }, { onConflict: 'user_id' })

  const addresses = (localUser?.addresses || []).map((item) => ({
    user_id: uid,
    source_id: String(item.id || item.line),
    label: item.label || 'Home',
    address_line1: item.line || '',
    city: item.city || '',
    is_default: Boolean(item.isDefault),
  }))
  await upsert('patient_addresses', addresses, 'user_id,source_id')

  const contacts = (localUser?.emergencyContacts || []).map((item) => ({
    user_id: uid,
    source_id: String(item.id || item.phone),
    name: item.name || 'Emergency contact',
    relationship: item.relation || item.relationship || 'Other',
    phone: String(item.phone || '').replace(/\s+/g, '') || '0000000000',
    is_primary: false,
  }))
  await upsert('emergency_contacts', contacts, 'user_id,source_id')

  const members = (localUser?.members || []).map((item) => {
    const names = splitName(item.name)
    return {
      user_id: uid,
      source_id: String(item.id || item.name),
      first_name: names.first,
      last_name: names.last,
      date_of_birth: asDate(item.dob),
      gender: mapGender(item.gender),
      relationship: item.relationship || 'Family Member',
      phone: item.phone || null,
      address: item.address || null,
      is_dependent: true,
    }
  })
  await upsert('family_members', members, 'user_id,source_id')

  const health = localUser?.health || {}
  await upsert('patient_allergies', (health.allergies || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    allergen: item.title || item.name || 'Allergen',
    severity: mapSeverity(item.severity),
    reaction: item.details || item.reaction || null,
    onset_date: asDate(item.date),
    status: String(item.status || 'active').toLowerCase() === 'resolved' ? 'resolved' : 'active',
    notes: item.details || null,
  })), 'patient_id,source_id')

  await upsert('patient_medications', (health.medications || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    medication_name: item.title || item.name || 'Medication',
    dosage: item.dose || 'as prescribed',
    start_date: asDate(item.date) || new Date().toISOString().slice(0, 10),
    status: String(item.status || 'active').toLowerCase() === 'stopped' ? 'inactive' : 'active',
    notes: item.details || null,
  })), 'patient_id,source_id')

  await upsert('patient_diagnoses', (health.diagnoses || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    diagnosis_date: asDate(item.date) || new Date().toISOString().slice(0, 10),
    status: String(item.status || 'active').toLowerCase() === 'resolved' ? 'resolved' : 'active',
    notes: [item.title, item.details].filter(Boolean).join(' — ') || null,
  })), 'patient_id,source_id')

  await upsert('patient_vaccinations', (health.vaccinations || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    vaccine_name: item.title || item.name || 'Vaccine',
    administration_date: asDate(item.date) || new Date().toISOString().slice(0, 10),
    notes: item.details || item.dose || null,
  })), 'patient_id,source_id')

  await upsert('patient_surgeries', (health.surgeries || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    procedure_name: item.title || item.name || 'Procedure',
    surgery_date: asDate(item.date) || new Date().toISOString().slice(0, 10),
    surgeon_name: item.doctor || null,
    notes: item.details || null,
  })), 'patient_id,source_id')

  await upsert('patient_conditions', (health.conditions || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    condition_name: item.title || item.name || 'Condition',
    diagnosed_date: asDate(item.date),
    status: String(item.status || 'active').toLowerCase() === 'resolved' ? 'resolved' : 'active',
    notes: item.details || null,
  })), 'patient_id,source_id')

  const documents = [
    ...(health.reports || []).map((item) => ({ ...item, document_type: 'lab_report' })),
    ...(health.consultations || []).map((item) => ({ ...item, document_type: 'other' })),
    ...(health.prescriptions || []).map((item) => ({ ...item, document_type: 'prescription' })),
  ].map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    document_type: item.document_type,
    title: item.title || item.name || 'Health record',
    description: item.details || null,
    file_url: item.image || item.attachments?.[0] || `local://${item.id}`,
  }))
  await upsert('medical_documents', documents, 'patient_id,source_id')

  await upsert('prescriptions', (health.prescriptions || []).map((item) => ({
    patient_id: uid,
    source_id: String(item.id),
    notes: [item.title, item.details].filter(Boolean).join('\n'),
    status: 'active',
  })), 'patient_id,source_id')

  await upsert('insurance_policies', (localUser?.insurancePolicies || []).map((item) => ({
    user_id: uid,
    source_id: String(item.id),
    provider_name: item.provider || 'Insurer',
    policy_number: item.policyNo || 'unknown',
    policy_type: 'health',
    valid_until: asDate(item.validTill),
    status: 'active',
    attachments: item.attachments || [],
  })), 'user_id,source_id')

  await upsert('notifications', (localUser?.notifications || []).map((item) => ({
    user_id: uid,
    source_id: String(item.id),
    channel: 'in_app',
    title: item.title || 'Notification',
    body: item.body || '',
    data: { to: item.to || null, type: item.type || null },
    status: item.unread ? 'sent' : 'read',
    read_at: item.unread ? null : new Date().toISOString(),
  })), 'user_id,source_id')

  const insightIds = localUser?.savedInsightIds || []
  if (insightIds.length) {
    const { data: rows } = await supabase.from('articles').select('id, slug').in('slug', insightIds)
    const links = (rows || []).map((row) => ({ user_id: uid, article_id: row.id }))
    if (links.length) await supabase.from('saved_insights').upsert(links, { onConflict: 'user_id,article_id' })
  }

  const bookings = bookingState?.bookings || []
  await upsert('appointments', bookings.map((item) => ({
    user_id: uid,
    patient_id: uid,
    client_id: String(item.id),
    provider_id: doctorUuid(item.doctor?.id),
    service_type: mapService(item.serviceType),
    status: mapAppointmentStatus(item.status),
    visit_type: mapVisit(item.schedule?.visitType || item.visitType),
    scheduled_date: asDate(item.schedule?.date),
    scheduled_time: asTime(item.schedule),
    duration_minutes: Number(item.schedule?.duration) || 30,
    notes: item.note || null,
    reason_for_visit: item.reason || item.note || null,
    version: Number(item.version) || 1,
    client_payload: item,
  })), 'user_id,client_id')

  window.localStorage.setItem(FLAG(user.id), '1')
  return { ok: true, skipped: false }
}
