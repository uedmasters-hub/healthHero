/**
 * Provider repository — live Supabase registry is the SSOT for doctor discovery.
 *
 * - `queryProviders` → paginated specialty / search / location queries
 * - `hydrateProviders` → small featured warm cache for Home / offline-ish reads
 * - `getDoctorById` → index lookup, with network fetch fallback via `fetchProviderById`
 *
 * No seeded doctor catalog is kept in memory.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { fetchAllPages } from './fetchPages'
import { inferSpecialtyFromDegree, specialtyOrClause } from './specialtyMatch'
import { formatProviderAddress, formatPlaceParts } from '../geography/formatPlace'

const FEATURED_CAP = 48
const DEFAULT_PAGE_SIZE = 24
const QUERY_TTL_MS = 90_000

/** @type {Map<string, object>} */
const byKey = new Map()
/** @type {object[]} */
let featured = []
let hydrated = false
let hydratePromise = null
const listeners = new Set()

/** @type {Map<string, { at: number, result: object }>} */
const queryCache = new Map()

const PROVIDER_SELECT = [
  'id',
  'source_key',
  'external_ref',
  'title',
  'display_name',
  'first_name',
  'last_name',
  'avatar_url',
  'about',
  'years_experience',
  'consultation_fee',
  'rating_avg',
  'rating_count',
  'city',
  'district',
  'address_line1',
  'visit_modes',
  'languages',
  'nmc_number',
  'degree',
  'phone',
  'gender',
  'primary_specialty',
  'primary_specialty_slug',
  'primary_center_id',
  'primary_center_name',
  'is_claimed',
  'is_verified',
  'verification_status',
  'provider_type',
].join(', ')

function notify() {
  listeners.forEach((fn) => {
    try { fn(getProviderCatalog()) } catch { /* ignore */ }
  })
}

function indexDoctor(doctor) {
  if (!doctor) return
  const existing = (
    (doctor.providerUuid && byKey.get(String(doctor.providerUuid)))
    || (doctor.id != null && byKey.get(String(doctor.id)))
    || (doctor.nmcNumber && byKey.get(`nmc:${doctor.nmcNumber}`))
    || null
  )
  // Never let a sparse snapshot wipe live registry credentials.
  const merged = existing ? {
    ...existing,
    ...doctor,
    degree: doctor.degree || existing.degree || '',
    nmcNumber: doctor.nmcNumber || existing.nmcNumber || null,
    specialty: doctor.specialty || existing.specialty || '',
    photo: doctor.photo || existing.photo || '',
    phone: doctor.phone || existing.phone || '',
    about: doctor.about || existing.about || '',
    experience: doctor.experience || existing.experience || '',
    address: doctor.address || existing.address || '',
    rating: doctor.rating ?? existing.rating ?? null,
    fee: doctor.fee ?? existing.fee ?? null,
  } : doctor

  const keys = [
    merged.providerUuid,
    merged.id,
    merged.nmcNumber ? `nmc:${merged.nmcNumber}` : null,
  ].filter(Boolean)
  for (const key of keys) byKey.set(String(key), merged)
}

function indexMany(doctors) {
  doctors.forEach(indexDoctor)
}

function toListCard(d) {
  return {
    id: d.id,
    providerUuid: d.providerUuid,
    name: d.shortName || String(d.name || '').replace(/^Dr\.?\s*/i, ''),
    specialty: d.specialty,
    degree: d.degree || '',
    rating: d.rating,
    ratingCount: d.ratingCount || 0,
    experience: d.experience,
    address: d.address,
    city: d.city || '',
    district: d.district || '',
    travelTime: d.travelTime || '',
    visitTypes: d.visitTypes,
    availability: d.availability,
    fee: d.fee,
    color: d.color,
    initial: d.initial,
    photo: d.photo,
    phone: d.phone || '',
    about: d.about,
    languages: d.languages || [],
    nmcNumber: d.nmcNumber,
    isVerified: d.isVerified,
    verificationStatus: d.verificationStatus,
    primaryCenterId: d.primaryCenterId,
    primaryCenterName: d.primaryCenterName,
    sourceKey: d.sourceKey,
    externalRef: d.externalRef,
    distanceKm: d.distanceKm ?? null,
    distance: d.distance ?? null,
  }
}

export function normalizeProviderRow(row) {
  const m = String(row.source_key || '').match(/^doctor:(\d+)$/)
  const legacyId = m ? Number(m[1]) : row.id
  const display = row.display_name
    || [row.title, row.first_name, row.last_name].filter(Boolean).join(' ').trim()
    || `${row.first_name || ''} ${row.last_name || ''}`.trim()
  const name = /^dr\.?\s/i.test(display) ? display : `Dr. ${display}`
  const specialty = row.primary_specialty
    || inferSpecialtyFromDegree(row.degree)
    || row.degree
    || 'General Physician'
  const city = row.city || ''
  const district = row.district || ''
  const address = formatProviderAddress({
    addressLine1: row.address_line1,
    city,
    district,
  }) || formatPlaceParts(city, district)

  return {
    id: legacyId,
    providerUuid: row.id,
    name,
    shortName: String(display).replace(/^Dr\.?\s*/i, ''),
    title: row.title || 'Dr.',
    specialty,
    degree: row.degree || '',
    rating: Number(row.rating_avg) > 0 ? Number(row.rating_avg) : null,
    ratingCount: Number(row.rating_count) || 0,
    experience: row.years_experience ? `${row.years_experience} years experience` : '',
    address,
    city,
    district,
    travelTime: '',
    visitTypes: (row.visit_modes || ['in_person', 'video']).map((v) => (
      v === 'video' ? 'Video Consultation' : 'In-Person'
    )),
    availability: '',
    fee: Number(row.consultation_fee) > 0 ? Number(row.consultation_fee) : null,
    color: '#0F766E',
    initial: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase() || 'DR',
    about: row.about || '',
    photo: row.avatar_url || '/img/doctors/new/doctor.png',
    phone: row.phone || '',
    languages: row.languages || [],
    nmcNumber: row.nmc_number || null,
    isClaimed: Boolean(row.is_claimed),
    isVerified: Boolean(row.is_verified),
    verificationStatus: row.verification_status || 'unverified',
    primaryCenterId: row.primary_center_id || null,
    primaryCenterName: row.primary_center_name || null,
    sourceKey: row.source_key,
    externalRef: row.external_ref,
    distanceKm: row.distance_km != null && Number.isFinite(Number(row.distance_km))
      ? Number(row.distance_km)
      : null,
    distance: row.distance_km != null && Number.isFinite(Number(row.distance_km))
      ? (Number(row.distance_km) < 1
        ? `${Math.max(0.1, Math.round(Number(row.distance_km) * 10) / 10)} km`
        : Number(row.distance_km) < 10
          ? `${(Math.round(Number(row.distance_km) * 10) / 10).toFixed(1)} km`
          : `${Math.round(Number(row.distance_km))} km`)
      : null,
  }
}

export function subscribeProviders(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getProviderCatalog() {
  if (featured.length) return featured.slice()
  return Array.from(new Set(byKey.values()))
}

export function getDoctorById(id) {
  if (id == null || id === '') return null
  const key = String(id)
  return byKey.get(key)
    || byKey.get(`nmc:${key}`)
    || null
}

export function getDoctorPhoto(id) {
  const doctor = getDoctorById(id)
  return doctor?.photo || '/img/doctors/new/doctor.png'
}

export function getDoctorList() {
  return getProviderCatalog().map(toListCard)
}

export function getSpecialtyList() {
  return [...new Set(getProviderCatalog().map((d) => d.specialty).filter(Boolean))]
}

export function getCityList() {
  return [...new Set(
    getProviderCatalog()
      .flatMap((d) => [d.city, d.district])
      .map((v) => String(v || '').trim())
      .filter(Boolean),
  )].sort()
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
  if (typeof doctorOrId === 'string' && doctorOrId.includes('-')) return doctorOrId
  return null
}

function queryCacheKey(opts) {
  return [
    opts.specialty || '',
    opts.q || '',
    opts.city || '',
    opts.district || '',
    opts.sort || 'name',
    opts.page || 0,
    opts.pageSize || DEFAULT_PAGE_SIZE,
    opts.latitude ?? '',
    opts.longitude ?? '',
    opts.radiusKm ?? '',
  ].join('|')
}

function hasOrigin(origin) {
  return origin
    && Number.isFinite(Number(origin.latitude))
    && Number.isFinite(Number(origin.longitude))
}

function escapeIlike(value) {
  return String(value).replace(/[%(),]/g, '')
}

function isNationwideLocation(value) {
  const key = String(value || '').trim().toLowerCase()
  return !key || key === 'all' || key === 'all nepal' || key === 'nepal'
}

/** Build city/district/address OR clause for nearby-first discovery. */
function locationOrClause(place) {
  if (isNationwideLocation(place)) return null
  const term = escapeIlike(place)
  if (!term) return null
  return `city.ilike.%${term}%,district.ilike.%${term}%,address_line1.ilike.%${term}%`
}

function applySort(qb, sort) {
  if (sort === 'rating') return qb.order('rating_avg', { ascending: false, nullsFirst: false }).order('display_name')
  if (sort === 'fee') return qb.order('consultation_fee', { ascending: true, nullsFirst: false }).order('display_name')
  return qb.order('display_name', { ascending: true })
}

function applyProviderFilters(qb, opts) {
  let next = qb.eq('provider_type', 'doctor')

  const specialtyClause = specialtyOrClause(opts.specialty)
  if (specialtyClause) next = next.or(specialtyClause)

  if (opts.q) {
    const term = escapeIlike(opts.q)
    next = next.or([
      `display_name.ilike.%${term}%`,
      `first_name.ilike.%${term}%`,
      `last_name.ilike.%${term}%`,
      `nmc_number.ilike.%${term}%`,
      `degree.ilike.%${term}%`,
      `city.ilike.%${term}%`,
      `district.ilike.%${term}%`,
      `primary_specialty.ilike.%${term}%`,
      `address_line1.ilike.%${term}%`,
    ].join(','))
  }

  const placeClause = locationOrClause(opts.city || opts.district)
  if (placeClause) next = next.or(placeClause)

  return next
}

/**
 * Paginated live registry query for discovery screens.
 * `total` is the exact Supabase count for the current filters (not the page size).
 * @returns {Promise<{ doctors: object[], page: number, pageSize: number, hasMore: boolean, total: number, fromCache: boolean }>}
 */
export async function queryProviders({
  specialty = null,
  q = '',
  city = null,
  district = null,
  sort = 'nearest',
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  force = false,
  origin = null,
  radiusKm = 20,
  useRadius = true,
} = {}) {
  const opts = {
    specialty: specialty || null,
    q: String(q || '').trim(),
    city: isNationwideLocation(city) ? null : city,
    district: isNationwideLocation(district) ? null : district,
    sort: sort || 'nearest',
    page: Math.max(0, Number(page) || 0),
    pageSize: Math.min(60, Math.max(8, Number(pageSize) || DEFAULT_PAGE_SIZE)),
    latitude: hasOrigin(origin) ? Number(origin.latitude) : null,
    longitude: hasOrigin(origin) ? Number(origin.longitude) : null,
    radiusKm: Number(radiusKm) || 20,
  }
  const key = queryCacheKey(opts)
  const hit = queryCache.get(key)
  if (!force && hit && Date.now() - hit.at < QUERY_TTL_MS) {
    return { ...hit.result, fromCache: true }
  }

  if (!isSupabaseConfigured) {
    const local = filterLocal(opts)
    const slice = local.slice(opts.page * opts.pageSize, (opts.page + 1) * opts.pageSize)
    const result = {
      doctors: slice,
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: local.length > (opts.page + 1) * opts.pageSize,
      total: local.length,
      fromCache: false,
    }
    queryCache.set(key, { at: Date.now(), result })
    return result
  }

  try {
    const sb = requireSupabase()

    if (
      useRadius
      && hasOrigin(origin)
      && !isNationwideLocation(city)
    ) {
      const lat = Number(origin.latitude)
      const lng = Number(origin.longitude)
      const radius = Math.min(100, Math.max(10, opts.radiusKm))
      const offset = opts.page * opts.pageSize
      const [{ data, error }, countRes] = await Promise.all([
        sb.rpc('nearby_providers', {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radius,
          p_q: opts.q || null,
          p_specialty: opts.specialty || null,
          p_limit: opts.pageSize,
          p_offset: offset,
        }),
        sb.rpc('count_nearby_providers', {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radius,
          p_q: opts.q || null,
          p_specialty: opts.specialty || null,
        }),
      ])
      if (error) throw error
      const doctors = (data || []).map((row) => normalizeProviderRow(row))
      indexMany(doctors)
      const total = typeof countRes.data === 'number' ? countRes.data : Number(countRes.data) || doctors.length
      const result = {
        doctors: doctors.map(toListCard),
        page: opts.page,
        pageSize: opts.pageSize,
        hasMore: (opts.page + 1) * opts.pageSize < total,
        total,
        fromCache: false,
        radiusKm: radius,
        mode: 'nearby',
      }
      queryCache.set(key, { at: Date.now(), result })
      notify()
      return result
    }

    const from = opts.page * opts.pageSize
    const to = from + opts.pageSize - 1
    let qb = applyProviderFilters(
      sb.from('v_provider_search').select(PROVIDER_SELECT, { count: 'exact' }),
      opts,
    )
    qb = applySort(qb, opts.sort === 'nearest' ? 'name' : opts.sort).range(from, to)
    const { data, error, count } = await qb
    if (error) throw error

    const rows = data || []
    const total = typeof count === 'number' ? count : rows.length
    const doctors = rows.map((row) => normalizeProviderRow(row))
    indexMany(doctors)

    const loadedThrough = from + doctors.length
    const result = {
      doctors: doctors.map(toListCard),
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: loadedThrough < total,
      total,
      fromCache: false,
      mode: 'browse',
    }
    queryCache.set(key, { at: Date.now(), result })
    notify()
    return result
  } catch (err) {
    console.warn('[providers] queryProviders failed', err?.message || err)
    const local = filterLocal(opts)
    return {
      doctors: local.slice(opts.page * opts.pageSize, (opts.page + 1) * opts.pageSize),
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: local.length > (opts.page + 1) * opts.pageSize,
      total: local.length,
      fromCache: false,
      error: err?.message || 'Failed to load doctors',
    }
  }
}

function filterLocal(opts) {
  const lower = (opts.q || '').toLowerCase()
  const place = (opts.city || opts.district || '').toLowerCase()
  const specialty = (opts.specialty || '').toLowerCase()
  let list = getDoctorList()
  if (specialty) {
    list = list.filter((d) => (
      String(d.specialty || '').toLowerCase().includes(specialty)
      || String(d.degree || '').toLowerCase().includes(specialty)
    ))
  }
  if (lower) {
    list = list.filter((d) => (
      d.name.toLowerCase().includes(lower)
      || String(d.specialty || '').toLowerCase().includes(lower)
      || String(d.degree || '').toLowerCase().includes(lower)
      || String(d.city || '').toLowerCase().includes(lower)
      || String(d.district || '').toLowerCase().includes(lower)
      || String(d.nmcNumber || '').includes(lower)
    ))
  }
  if (place) {
    list = list.filter((d) => (
      String(d.city || '').toLowerCase().includes(place)
      || String(d.district || '').toLowerCase().includes(place)
      || String(d.address || '').toLowerCase().includes(place)
    ))
  }
  if (opts.sort === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))
  else if (opts.sort === 'fee') list = [...list].sort((a, b) => (a.fee ?? 9999) - (b.fee ?? 9999))
  else list = [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return list
}

/** Fetch a single provider by UUID / NMC / legacy id and index it.
 * Always revalidates against the live registry when Supabase is configured
 * so nmc_number / degree stay current on Doctor Profile and cards.
 */
export async function fetchProviderById(id, { force = true } = {}) {
  const existing = getDoctorById(id)
  if (!id) return existing || null
  if (!isSupabaseConfigured) return existing || null
  if (existing && !force && existing.nmcNumber && existing.degree) return existing

  try {
    const sb = requireSupabase()
    const key = String(id)
    let qb = sb.from('v_provider_search').select(PROVIDER_SELECT).eq('provider_type', 'doctor')
    if (key.includes('-')) qb = qb.eq('id', key)
    else if (/^\d+$/.test(key) && key.length >= 4) qb = qb.eq('nmc_number', key)
    else qb = qb.or(`id.eq.${key},nmc_number.eq.${key},source_key.eq.doctor:${key}`)
    const { data, error } = await qb.limit(1).maybeSingle()
    if (error) throw error
    if (!data) return existing || null
    const doctor = normalizeProviderRow(data)
    indexDoctor(doctor)
    notify()
    return getDoctorById(doctor.providerUuid || doctor.id) || doctor
  } catch (err) {
    console.warn('[providers] fetchProviderById failed', err?.message || err)
    return existing || null
  }
}

/**
 * Warm a small featured window for Home / recommendations.
 * Prefer doctors that already have a primary specialty (curated), else any active doctors.
 */
export async function hydrateProviders({ force = false } = {}) {
  if (hydrated && !force) return featured
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    if (!isSupabaseConfigured) {
      hydrated = true
      return featured
    }
    try {
      const sb = requireSupabase()
      let curated = await fetchAllPages(
        (from, to) => sb
          .from('v_provider_search')
          .select(PROVIDER_SELECT)
          .eq('provider_type', 'doctor')
          .not('primary_specialty', 'is', null)
          .order('rating_avg', { ascending: false, nullsFirst: false })
          .order('display_name')
          .range(from, to),
        { maxRows: FEATURED_CAP },
      )

      if (!curated.length) {
        curated = await fetchAllPages(
          (from, to) => sb
            .from('v_provider_search')
            .select(PROVIDER_SELECT)
            .eq('provider_type', 'doctor')
            .order('display_name')
            .range(from, to),
          { maxRows: FEATURED_CAP },
        )
      }

      const doctors = (curated || []).map((row) => normalizeProviderRow(row))
      indexMany(doctors)
      featured = doctors
      hydrated = true
      notify()
      return featured
    } catch (err) {
      console.warn('[providers] hydrate failed', err?.message || err)
      hydrated = true
      return featured
    } finally {
      hydratePromise = null
    }
  })()

  return hydratePromise
}

/** Full-registry search against Supabase (NMC + curated). */
export async function searchProviders(query, { limit = 40, specialty = null } = {}) {
  const result = await queryProviders({
    q: query,
    specialty,
    page: 0,
    pageSize: limit,
    sort: 'name',
  })
  return result.doctors
}

export function isProvidersHydrated() {
  return hydrated
}

export function clearProviderQueryCache() {
  queryCache.clear()
}

export async function fetchProviderAvailability(doctorOrId, { days = 60 } = {}) {
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
  const mod = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${mod}`
}
