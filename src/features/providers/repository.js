/**
 * Shared provider repository — SSOT for doctors / specialties used by Home,
 * Treat, Search, Ready for Visit, and Provider Chat.
 *
 * Hydrates from Supabase `providers` when online; falls back to the generated
 * PocketPills import snapshot so production and local stay aligned.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { GENERATED_PROVIDER_CATALOG } from './generatedCatalog'

let cache = Array.isArray(GENERATED_PROVIDER_CATALOG) ? [...GENERATED_PROVIDER_CATALOG] : []
let hydrated = false
let hydratePromise = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try { fn(cache) } catch { /* ignore */ }
  })
}

function normalizeRow(row, specialtyName) {
  const m = String(row.source_key || '').match(/^doctor:(\d+)$/)
  const legacyId = m ? Number(m[1]) : row.id
  const display = row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()
  const name = display.startsWith('Dr') ? display : `Dr. ${display}`
  return {
    id: legacyId,
    providerUuid: row.id,
    name,
    shortName: String(display).replace(/^Dr\.?\s*/i, ''),
    specialty: specialtyName || 'General Physician',
    rating: Number(row.rating_avg) || 4.7,
    experience: row.years_experience ? `${row.years_experience} years experience` : '',
    address: [row.address_line1, row.city].filter(Boolean).join(', '),
    travelTime: '',
    visitTypes: (row.visit_modes || ['in_person', 'video']).map((v) => (
      v === 'video' ? 'Video Consultation' : 'In-Person'
    )),
    availability: 'Available Today',
    fee: Number(row.consultation_fee) || 800,
    color: '#6366F1',
    initial: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase() || 'DR',
    about: row.about || '',
    photo: row.avatar_url || '/img/doctors/new/doctor.png',
    phone: '',
    sourceKey: row.source_key,
    externalRef: row.external_ref,
  }
}

export function subscribeProviders(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getProviderCatalog() {
  return cache.slice()
}

export function getDoctorById(id) {
  if (id == null || id === '') return null
  const key = String(id)
  return cache.find((d) => String(d.id) === key || String(d.providerUuid) === key) || null
}

export function getDoctorPhoto(id) {
  const doctor = getDoctorById(id)
  return doctor?.photo || '/img/doctors/new/doctor.png'
}

export function getDoctorList() {
  return cache.map((d) => ({
    id: d.id,
    providerUuid: d.providerUuid,
    name: d.shortName || String(d.name || '').replace(/^Dr\.?\s*/i, ''),
    specialty: d.specialty,
    rating: d.rating,
    experience: d.experience,
    address: d.address,
    travelTime: d.travelTime,
    visitTypes: d.visitTypes,
    availability: d.availability,
    fee: d.fee,
    color: d.color,
    initial: d.initial,
    photo: d.photo,
    phone: d.phone || `+91 98765 4321${String(d.id).replace(/\D/g, '').slice(-1) || '0'}`,
    about: d.about,
    sourceKey: d.sourceKey,
    externalRef: d.externalRef,
  }))
}

export function getSpecialtyList() {
  return [...new Set(cache.map((d) => d.specialty).filter(Boolean))]
}

export function getCityList() {
  return [...new Set(
    cache
      .map((d) => {
        const parts = String(d.address || '').split(', ')
        return parts[parts.length - 1] || ''
      })
      .filter(Boolean),
  )]
}

/** Resolve providers.id UUID for appointment.provider_id. */
export function resolveProviderUuid(doctorOrId) {
  if (doctorOrId == null) return null
  if (typeof doctorOrId === 'object') {
    if (doctorOrId.providerUuid) return doctorOrId.providerUuid
    if (typeof doctorOrId.id === 'string' && doctorOrId.id.includes('-')) return doctorOrId.id
    return resolveProviderUuid(doctorOrId.id)
  }
  const found = getDoctorById(doctorOrId)
  if (found?.providerUuid) return found.providerUuid
  const n = Number(doctorOrId)
  if (Number.isFinite(n) && n >= 1) {
    return `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`
  }
  if (typeof doctorOrId === 'string' && doctorOrId.includes('-')) return doctorOrId
  return null
}

export async function hydrateProviders({ force = false } = {}) {
  if (hydrated && !force) return cache
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    if (!isSupabaseConfigured) {
      hydrated = true
      return cache
    }
    try {
      const sb = requireSupabase()
      const { data: rows, error } = await sb
        .from('providers')
        .select('id, source_key, external_ref, display_name, first_name, last_name, avatar_url, about, years_experience, consultation_fee, rating_avg, rating_count, city, address_line1, visit_modes, is_active')
        .eq('is_active', true)
        .eq('provider_type', 'doctor')
        .order('display_name')
      if (error) throw error

      const { data: links } = await sb
        .from('provider_specializations')
        .select('provider_id, is_primary, specializations(name, slug)')

      const specByProvider = new Map()
      for (const link of links || []) {
        if (link.is_primary) {
          specByProvider.set(link.provider_id, link.specializations?.name || 'General Physician')
        }
      }

      if (rows?.length) {
        cache = rows.map((row) => normalizeRow(row, specByProvider.get(row.id)))
        notify()
      }
      hydrated = true
      return cache
    } catch (err) {
      console.warn('[providers] hydrate failed, using generated catalog', err?.message || err)
      hydrated = true
      return cache
    } finally {
      hydratePromise = null
    }
  })()

  return hydratePromise
}

export function isProvidersHydrated() {
  return hydrated
}

/**
 * Live availability for a provider (next days).
 * @returns {Promise<Array<{ date: string, time: string, visitType: string, slotId: string }>>}
 */
export async function fetchProviderAvailability(doctorOrId, { days = 7 } = {}) {
  const providerId = resolveProviderUuid(doctorOrId)
  if (!providerId || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const until = new Date()
    until.setDate(until.getDate() + days)
    const { data, error } = await sb
      .from('available_slots')
      .select('id, slot_date, start_time, end_time, visit_type, is_available')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .gte('slot_date', new Date().toISOString().slice(0, 10))
      .lte('slot_date', until.toISOString().slice(0, 10))
      .order('slot_date')
      .order('start_time')
    if (error) throw error
    return (data || []).map((slot) => ({
      slotId: slot.id,
      date: slot.slot_date,
      time: formatSlotTime(slot.start_time),
      endTime: formatSlotTime(slot.end_time),
      visitType: slot.visit_type === 'video' ? 'Video Consultation' : 'In-Person',
    }))
  } catch (err) {
    console.warn('[providers] availability fetch failed', err?.message || err)
    return []
  }
}

function formatSlotTime(value) {
  if (!value) return ''
  const text = String(value).slice(0, 5)
  const [hStr, mStr] = text.split(':')
  let h = Number(hStr)
  const m = Number(mStr) || 0
  if (!Number.isFinite(h)) return text
  const mer = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${mer}`
}
