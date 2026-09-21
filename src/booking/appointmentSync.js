/**
 * AppointmentRepository remote mirror.
 * Local engine remains the interactive SSOT; Postgres `appointments` is the durable mirror.
 * Rows are immutable by client_id — only status / payload fields change.
 */
import { requireSupabase, isSupabaseConfigured } from '../lib/supabase'
import { BOOKING_STATUS } from './constants'
import { createBookingRecord, reviveBookingRecord, toLegacyBooking } from './models'
import { resolveCatalogDoctor } from './presentBooking'
import { getDoctorPhoto } from '../features/providers'
import { resolveProviderPhoto } from '../lib/providerPhoto'

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

export function mapAppointmentStatus(value) {
  const key = String(value || 'draft')
  const allowed = [
    'draft', 'pending_payment', 'payment_processing', 'confirmed', 'upcoming',
    'checked_in', 'in_progress', 'completed', 'cancelled', 'rescheduled',
    'no_show', 'expired', 'refunded',
  ]
  if (allowed.includes(key)) return key
  if (key === 'booked') return 'confirmed'
  if (key === 'consultation_active') return 'in_progress'
  if (key === 'payment_pending') return 'pending_payment'
  return 'draft'
}

function asDate(value) {
  if (!value) return null
  const raw = typeof value === 'object' ? value.full || value.day || '' : value
  const text = String(raw).slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function asTime(value) {
  if (!value) return null
  const text = String(value.time || value || '')
  const match = text.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return `${match[1].padStart(2, '0')}:${match[2]}:00`
}

import { resolveProviderUuid } from '../features/providers'

function doctorUuid(id) {
  return resolveProviderUuid(id)
}

function putRecord(engine, record) {
  if (!engine || !record?.id) return
  if (typeof engine.restoreRecord === 'function') {
    engine.restoreRecord(record)
    return
  }
  engine.adoptLegacyBooking(toLegacyBooking(record), { makeActive: false })
}

/** Map a local engine booking to an appointments upsert row. */
export function toAppointmentRow(record, userId) {
  if (!record?.id || !userId) return null
  const checkedIn = [
    BOOKING_STATUS.CHECKED_IN,
    'in_progress',
    'consultation_active',
  ].includes(record.status)
  const row = {
    user_id: userId,
    patient_id: userId,
    client_id: String(record.id),
    provider_id: doctorUuid(record.doctor?.id),
    service_type: mapService(record.serviceType),
    status: mapAppointmentStatus(record.status),
    visit_type: mapVisit(record.schedule?.visitType || record.visitType),
    scheduled_date: asDate(record.schedule?.date || record.date),
    scheduled_time: asTime(record.schedule || { time: record.time }),
    duration_minutes: Number(record.schedule?.duration || record.duration) || 30,
    notes: record.note || null,
    reason_for_visit: record.reason || record.note || null,
    version: Number(record.version) || 1,
    client_payload: record,
  }
  if (checkedIn) {
    row.checked_in_at = record.meta?.checkedInAt || new Date().toISOString()
  }
  return row
}

/**
 * Upsert one booking into public.appointments (conflict on user_id, client_id).
 * Never deletes. Returns remote appointment id when available.
 */
export async function syncAppointmentRecord(record, userId) {
  if (!isSupabaseConfigured || !userId || !record?.id) return null
  const row = toAppointmentRow(record, userId)
  if (!row) return null
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('appointments')
      .upsert(row, { onConflict: 'user_id,client_id' })
      .select('id, client_id')
      .maybeSingle()

    let result = data
    if (error) {
      // Provider FK may be missing for demo doctor ids — keep the booking row without provider_id.
      const { data: fallback, error: fallbackError } = await sb
        .from('appointments')
        .upsert({ ...row, provider_id: null }, { onConflict: 'user_id,client_id' })
        .select('id, client_id')
        .maybeSingle()
      if (fallbackError) throw fallbackError
      result = fallback
    }

    if (result?.id) {
      await sb
        .from('conversations')
        .update({ appointment_id: result.id })
        .eq('kind', 'provider')
        .eq('booking_ref', row.client_id)
        .is('appointment_id', null)
    }
    return result?.id || null
  } catch {
    return null
  }
}

/** Pull remote appointments into the local AppointmentRepository (import + status merge). */
export async function pullRemoteAppointments(engine, userId) {
  if (!isSupabaseConfigured || !userId || !engine) return { imported: 0, updated: 0 }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('appointments')
      .select('id, client_id, status, client_payload, scheduled_date, scheduled_time, visit_type, updated_at')
      .or(`user_id.eq.${userId},patient_id.eq.${userId}`)
    if (error) throw error

    let imported = 0
    let updated = 0
    for (const row of data || []) {
      const clientId = row.client_id
      if (!clientId) continue

      const existing = engine.getById(clientId)
      if (existing) {
        const remoteStatus = mapAppointmentStatus(row.status)
        const remoteUpdated = new Date(row.updated_at || 0).getTime()
        const localUpdated = new Date(existing.meta?.updatedAt || 0).getTime()
        if (
          remoteStatus
          && remoteStatus !== existing.status
          && remoteUpdated >= localUpdated
          && typeof engine.updateBooking === 'function'
        ) {
          engine.updateBooking(clientId, {
            status: remoteStatus,
            meta: {
              ...(existing.meta || {}),
              remoteAppointmentId: row.id,
              syncedFrom: 'appointments',
              updatedAt: row.updated_at || new Date().toISOString(),
            },
          })
          updated += 1
        } else if (row.id && !existing.meta?.remoteAppointmentId && typeof engine.updateBooking === 'function') {
          engine.updateBooking(clientId, {
            meta: {
              ...(existing.meta || {}),
              remoteAppointmentId: row.id,
            },
          })
        }
        continue
      }

      let record = null
      if (row.client_payload && typeof row.client_payload === 'object') {
        record = reviveBookingRecord({
          ...row.client_payload,
          id: clientId,
          status: mapAppointmentStatus(row.status || row.client_payload.status),
        })
      }
      if (!record) {
        record = createBookingRecord({
          id: clientId,
          userId,
          status: mapAppointmentStatus(row.status),
          schedule: {
            date: row.scheduled_date
              ? { full: `${row.scheduled_date}T00:00:00.000Z` }
              : null,
            time: row.scheduled_time ? String(row.scheduled_time).slice(0, 5) : '',
            visitType: row.visit_type === 'video' ? 'Video Consultation' : 'In-Person',
          },
          meta: {
            remoteAppointmentId: row.id,
            restoredFrom: 'appointments',
            updatedAt: row.updated_at || new Date().toISOString(),
          },
        })
      } else {
        record = {
          ...record,
          id: clientId,
          meta: {
            ...(record.meta || {}),
            remoteAppointmentId: row.id,
            restoredFrom: 'appointments',
          },
        }
      }

      putRecord(engine, record)
      imported += 1
    }
    return { imported, updated }
  } catch {
    return { imported: 0, updated: 0 }
  }
}

/**
 * Rebuild local bookings that still have a provider conversation but were lost locally.
 * Uses conversation metadata (and optional appointment payload) — never deletes chat.
 */
export async function recoverMissingBookingsFromConversations(engine, userId) {
  if (!isSupabaseConfigured || !userId || !engine) return { restored: 0 }
  try {
    const sb = requireSupabase()
    const { data: convos, error } = await sb
      .from('conversations')
      .select('booking_ref, appointment_id, metadata, subject, created_at')
      .eq('kind', 'provider')
      .eq('created_by', userId)
    if (error) throw error

    let restored = 0
    for (const convo of convos || []) {
      const ref = convo.booking_ref
      if (!ref || engine.getById(ref)) continue

      let payload = null
      if (convo.appointment_id) {
        const { data: appt } = await sb
          .from('appointments')
          .select('id, client_id, status, client_payload')
          .eq('id', convo.appointment_id)
          .maybeSingle()
        if (appt?.client_payload) payload = appt.client_payload
      }

      const meta = convo.metadata || {}
      const status = mapAppointmentStatus(
        payload?.status || meta.booking_status || BOOKING_STATUS.CHECKED_IN,
      )

      const nameHint = meta.provider_name
        || String(convo.subject || '').replace(/^Chat with\s+/i, '')
        || 'Care provider'
      const catalog = resolveCatalogDoctor({
        doctor: { id: meta.doctor_id ?? null, name: nameHint },
        providerName: nameHint,
      })
      const doctor = {
        id: meta.doctor_id ?? catalog?.id ?? null,
        name: catalog?.name || nameHint,
        specialty: meta.specialty || catalog?.specialty || '',
        rating: catalog?.rating ?? null,
        experience: catalog?.experience || '',
        address: catalog?.address || '',
        photo: resolveProviderPhoto({
          id: meta.doctor_id ?? catalog?.id,
          photo: meta.photo || (catalog ? getDoctorPhoto(catalog.id) : ''),
          name: nameHint,
        }) || '',
      }

      const record = payload
        ? reviveBookingRecord({
          ...payload,
          id: ref,
          status,
          doctor: { ...(payload.doctor || {}), ...doctor, ...(payload.doctor?.photo ? {} : { photo: doctor.photo }) },
        })
        : createBookingRecord({
          id: ref,
          userId,
          status,
          doctor,
          schedule: {
            visitType: meta.visit_type || '',
            time: '',
            date: null,
          },
          meta: {
            restoredFrom: 'provider_conversation',
            conversationCreatedAt: convo.created_at,
            remoteAppointmentId: convo.appointment_id || null,
            updatedAt: new Date().toISOString(),
          },
        })

      putRecord(engine, record)
      await syncAppointmentRecord(engine.getById(ref) || record, userId)
      restored += 1
    }
    return { restored }
  } catch {
    return { restored: 0 }
  }
}

/**
 * Full hydrate: remote appointments first, then conversation orphans.
 * Safe to call on every app load — only inserts missing local ids.
 */
export async function hydrateAppointmentsFromRemote(engine, userId) {
  if (!engine || !userId) return { imported: 0, restored: 0 }
  const pulled = await pullRemoteAppointments(engine, userId)
  const recovered = await recoverMissingBookingsFromConversations(engine, userId)
  return { imported: pulled.imported, restored: recovered.restored }
}
