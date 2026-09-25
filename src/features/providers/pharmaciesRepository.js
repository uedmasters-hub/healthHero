/**
 * Pharmacies — live DDA registry discovery + detail.
 * Paginated Supabase queries only (no mock/seed payloads).
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { formatPlaceParts } from '../geography/formatPlace'
import { isAllNepalLocation } from '../../data/nepalGeography'
import {
  normalizePharmacyRow,
  PHARMACY_TYPE_FILTERS,
} from '../../lib/pharmacyModel'
import { haversineKm } from './centersRepository'

const DEFAULT_PAGE_SIZE = 24
const HYDRATE_WARM = 40
const QUERY_TTL_MS = 45_000
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const LIST_FROM = 'pharmacies'
const LIST_SELECT = [
  'id', 'name', 'display_name', 'registry_name', 'name_local', 'pharmacy_code', 'license_number',
  'place', 'district', 'system_type', 'address_line1', 'city',
  'phone', 'email', 'image_url', 'rating_avg', 'delivers',
  'verification_status', 'source_key', 'external_ref',
  'latitude', 'longitude', 'is_active', 'center_id',
  'client_payload',
].join(', ')

const DETAIL_SELECT = [
  'id', 'org_id', 'center_id', 'name', 'display_name', 'registry_name', 'name_local',
  'pharmacy_code', 'license_number',
  'place', 'district', 'system_type', 'address_line1', 'address_line2',
  'city', 'state', 'postal_code', 'country',
  'phone', 'email', 'image_url', 'rating_avg', 'delivers', 'delivery_radius_km',
  'latitude', 'longitude', 'is_active',
  'verification_status', 'verified_at', 'source_key', 'external_ref',
  'client_payload',
].join(', ')

let cache = []
let hydrated = false
let hydratePromise = null
const queryCache = new Map()
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try { fn(cache) } catch { /* ignore */ }
  })
}

function escapeIlike(value) {
  return String(value || '').replace(/[%(),]/g, '')
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(km)) return null
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10)} km`
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1)} km`
  return `${Math.round(km)} km`
}

function formatClock(value) {
  if (!value) return ''
  const text = String(value).slice(0, 5)
  const [hStr, mStr] = text.split(':')
  let h = Number(hStr)
  const m = Number(mStr) || 0
  if (!Number.isFinite(h)) return text
  const mod = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${mod}`
}

function normalizeHoursRow(row) {
  const day = Number(row.day_of_week)
  return {
    id: row.id,
    dayOfWeek: day,
    dayLabel: DAY_LABELS[day] || `Day ${day}`,
    openTime: formatClock(row.open_time),
    closeTime: formatClock(row.close_time),
    isClosed: Boolean(row.is_closed),
    openRaw: row.open_time,
    closeRaw: row.close_time,
    label: row.is_closed
      ? 'Closed'
      : `${formatClock(row.open_time)} – ${formatClock(row.close_time)}`,
  }
}

function parseClockToMinutes(value) {
  if (!value) return null
  const text = String(value).slice(0, 5)
  const [h, m] = text.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function openStatusFromHours(hoursRow, now = new Date()) {
  if (!hoursRow) return { openStatus: null, openLabel: null }
  if (hoursRow.isClosed) return { openStatus: 'closed', openLabel: 'Closed today' }
  const openMin = parseClockToMinutes(hoursRow.openRaw)
  const closeMin = parseClockToMinutes(hoursRow.closeRaw)
  if (openMin == null || closeMin == null) {
    return { openStatus: null, openLabel: hoursRow.label }
  }
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const open = nowMin >= openMin && nowMin < closeMin
  return {
    openStatus: open ? 'open' : 'closed',
    openLabel: open ? `Open · until ${hoursRow.closeTime}` : `Closed · opens ${hoursRow.openTime}`,
  }
}

function locationOrClause(place) {
  if (isAllNepalLocation(place)) return null
  const term = escapeIlike(place)
  if (!term) return null
  return `city.ilike.%${term}%,district.ilike.%${term}%,place.ilike.%${term}%,address_line1.ilike.%${term}%`
}

function typeMatchValue(typeId) {
  const hit = PHARMACY_TYPE_FILTERS.find((t) => t.id === typeId)
  return hit?.match || null
}

function applyPharmacyFilters(qb, opts) {
  let next = qb.eq('is_active', true)

  // Drop DDA junk stubs (`()`, `--`, license-only) that sort before real English names.
  // English-only UI: require a Latin letter at the start of the stored name.
  next = next.filter('name', 'imatch', '^[A-Za-z]')

  if (opts.q) {
    const term = escapeIlike(opts.q)
    next = next.or([
      `name.ilike.%${term}%`,
      `display_name.ilike.%${term}%`,
      `registry_name.ilike.%${term}%`,
      `name_local.ilike.%${term}%`,
      `pharmacy_code.ilike.%${term}%`,
      `license_number.ilike.%${term}%`,
      `district.ilike.%${term}%`,
      `place.ilike.%${term}%`,
      `city.ilike.%${term}%`,
      `system_type.ilike.%${term}%`,
      `address_line1.ilike.%${term}%`,
    ].join(','))
  }

  const placeClause = locationOrClause(opts.city)
  if (placeClause) next = next.or(placeClause)

  const typeMatch = typeMatchValue(opts.type)
  if (typeMatch) next = next.eq('system_type', typeMatch)

  if (opts.pharmacyIds?.length) {
    next = next.in('id', opts.pharmacyIds)
  }

  return next
}

function applyPharmacySort(qb, sort) {
  if (sort === 'rating') {
    return qb.order('rating_avg', { ascending: false, nullsFirst: false }).order('name')
  }
  if (sort === 'verified') {
    return qb.order('verification_status', { ascending: true }).order('name')
  }
  return qb.order('name', { ascending: true })
}

function queryCacheKey(opts) {
  return [
    opts.q || '',
    opts.city || '',
    opts.type || 'all',
    opts.openNow ? '1' : '0',
    opts.sort || 'name',
    opts.page || 0,
    opts.pageSize || DEFAULT_PAGE_SIZE,
    (opts.pharmacyIds || []).join(','),
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

async function queryPharmaciesNearby({
  q,
  page,
  pageSize,
  origin,
  radiusKm,
}) {
  const sb = requireSupabase()
  const lat = Number(origin.latitude)
  const lng = Number(origin.longitude)
  const radius = Math.min(100, Math.max(10, Number(radiusKm) || 20))
  const offset = page * pageSize

  const [{ data, error }, countRes] = await Promise.all([
    sb.rpc('nearby_pharmacies', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radius,
      p_q: q || null,
      p_limit: pageSize,
      p_offset: offset,
    }),
    sb.rpc('count_nearby_pharmacies', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radius,
      p_q: q || null,
    }),
  ])
  if (error) throw error

  const originPoint = { latitude: lat, longitude: lng }
  let pharmacies = (data || [])
    .map((row) => {
      const normalized = normalizeRow(row, { origin: originPoint })
      if (row.distance_km != null && Number.isFinite(Number(row.distance_km))) {
        const distanceKm = Number(row.distance_km)
        return {
          ...normalized,
          distanceKm,
          distance: formatDistanceKm(distanceKm),
        }
      }
      return normalized
    })
    .filter((pharmacy) => pharmacy.hasUsableName && pharmacy.name)

  pharmacies = await enrichPharmaciesPage(pharmacies)
  const total = typeof countRes.data === 'number' ? countRes.data : Number(countRes.data) || pharmacies.length
  return {
    pharmacies,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < total,
    total,
    error: null,
    fromCache: false,
    radiusKm: radius,
    mode: 'nearby',
  }
}

function normalizeRow(row, { origin } = {}) {
  return normalizePharmacyRow(row, {
    origin,
    defaultOrigin: null,
    haversineKm,
    formatDistanceKm,
  })
}

function normalizeDetailRow(row) {
  const base = normalizeRow(row)
  const fullAddress = [
    row.address_line1,
    row.address_line2,
    formatPlaceParts(row.place, row.city, row.district),
    row.state,
    row.postal_code,
    row.country,
  ].filter(Boolean).join(', ')

  return {
    ...base,
    addressLine1: row.address_line1 || '',
    addressLine2: row.address_line2 || '',
    state: row.state || '',
    country: row.country || 'NP',
    postalCode: row.postal_code || '',
    deliveryRadiusKm: row.delivery_radius_km != null ? Number(row.delivery_radius_km) : null,
    verifiedAt: row.verified_at || null,
    fullAddress: fullAddress || base.address,
    isActive: row.is_active !== false,
  }
}

async function enrichPharmaciesPage(pharmacies) {
  if (!pharmacies.length || !isSupabaseConfigured) return pharmacies
  const ids = pharmacies.map((p) => p.pharmacyUuid || p.id).filter(Boolean)
  if (!ids.length) return pharmacies

  try {
    const sb = requireSupabase()
    const today = new Date().getDay()
    const [hoursRes, svcRes] = await Promise.all([
      sb.from('pharmacy_hours')
        .select('pharmacy_id, day_of_week, open_time, close_time, is_closed')
        .in('pharmacy_id', ids)
        .eq('day_of_week', today),
      sb.from('entity_services')
        .select('entity_id')
        .eq('entity_kind', 'pharmacy')
        .in('entity_id', ids)
        .eq('is_active', true),
    ])

    const hoursById = new Map()
    ;(hoursRes.data || []).forEach((row) => {
      hoursById.set(row.pharmacy_id, normalizeHoursRow(row))
    })

    const svcCounts = new Map()
    ;(svcRes.data || []).forEach((row) => {
      svcCounts.set(row.entity_id, (svcCounts.get(row.entity_id) || 0) + 1)
    })

    return pharmacies.map((pharmacy) => {
      const id = pharmacy.pharmacyUuid || pharmacy.id
      const hours = hoursById.get(id)
      const open = openStatusFromHours(hours)
      return {
        ...pharmacy,
        serviceCount: svcCounts.get(id) || 0,
        openStatus: open.openStatus,
        // Hours only — delivery is a separate chip (avoids "Delivery available · Delivery available")
        openLabel: open.openLabel,
      }
    })
  } catch (err) {
    console.warn('[pharmacies] enrich failed', err?.message || err)
    return pharmacies
  }
}

/** Resolve pharmacy IDs that stock a medicine matching the search term. */
async function pharmacyIdsForMedicine(query) {
  const term = escapeIlike(query)
  if (!term || !isSupabaseConfigured) return null
  try {
    const sb = requireSupabase()
    const { data: drugs, error: drugError } = await sb
      .from('drugs')
      .select('id')
      .or(`name.ilike.%${term}%,generic_name.ilike.%${term}%`)
      .eq('is_active', true)
      .limit(40)
    if (drugError) throw drugError
    if (!drugs?.length) return []

    const { data: inv, error: invError } = await sb
      .from('pharmacy_inventory')
      .select('pharmacy_id')
      .in('drug_id', drugs.map((d) => d.id))
      .eq('is_active', true)
      .limit(400)
    if (invError) throw invError
    return [...new Set((inv || []).map((row) => row.pharmacy_id).filter(Boolean))]
  } catch (err) {
    console.warn('[pharmacies] medicine search failed', err?.message || err)
    return null
  }
}

/** Live drug catalog search for contextual suggestions. */
export async function searchDrugs(query, { limit = 8 } = {}) {
  const term = escapeIlike(query)
  if (!term || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('drugs')
      .select('id, name, generic_name, form')
      .or(`name.ilike.%${term}%,generic_name.ilike.%${term}%`)
      .eq('is_active', true)
      .order('name')
      .limit(limit)
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      form: row.form,
    }))
  } catch (err) {
    console.warn('[pharmacies] drug search failed', err?.message || err)
    return []
  }
}

async function pharmacyIdsOpenNow() {
  if (!isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const today = new Date().getDay()
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const { data, error } = await sb
      .from('pharmacy_hours')
      .select('pharmacy_id, open_time, close_time, is_closed')
      .eq('day_of_week', today)
      .eq('is_closed', false)
      .limit(2000)
    if (error) throw error
    return (data || [])
      .filter((row) => {
        const openMin = parseClockToMinutes(row.open_time)
        const closeMin = parseClockToMinutes(row.close_time)
        if (openMin == null || closeMin == null) return true
        return nowMin >= openMin && nowMin < closeMin
      })
      .map((row) => row.pharmacy_id)
      .filter(Boolean)
  } catch (err) {
    console.warn('[pharmacies] open-now failed', err?.message || err)
    return []
  }
}

export function subscribePharmacies(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPharmacies() {
  return cache.slice()
}

export function getPharmacyById(id) {
  if (id == null || id === '') return null
  const key = String(id)
  return cache.find((p) => (
    String(p.id) === key
    || String(p.pharmacyUuid) === key
    || String(p.pharmacyCode || '') === key
    || String(p.licenseNumber || '') === key
    || String(p.sourceKey || '') === key
  )) || null
}

export function clearPharmaciesQueryCache() {
  queryCache.clear()
}

/**
 * Paginated live DDA registry query.
 * @returns {{ pharmacies, page, pageSize, hasMore, total, error, fromCache }}
 */
export async function queryPharmacies({
  q = '',
  city = null,
  type = 'all',
  openNow = false,
  sort = 'nearest',
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  force = false,
  origin = null,
  radiusKm = 20,
  useRadius = true,
} = {}) {
  const opts = {
    q: String(q || '').trim(),
    city: isAllNepalLocation(city) ? null : city,
    type: type || 'all',
    openNow: Boolean(openNow),
    sort: sort || 'nearest',
    page: Math.max(0, Number(page) || 0),
    pageSize: Math.min(60, Math.max(8, Number(pageSize) || DEFAULT_PAGE_SIZE)),
    pharmacyIds: null,
    latitude: hasOrigin(origin) ? Number(origin.latitude) : null,
    longitude: hasOrigin(origin) ? Number(origin.longitude) : null,
    radiusKm: Number(radiusKm) || 20,
  }

  if (!isSupabaseConfigured) {
    return {
      pharmacies: [],
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: false,
      total: 0,
      error: 'Supabase is not configured',
      fromCache: false,
    }
  }

  // Medicine search may constrain to inventory pharmacies.
  if (opts.q) {
    const medicineIds = await pharmacyIdsForMedicine(opts.q)
    if (Array.isArray(medicineIds) && medicineIds.length) {
      opts.pharmacyIds = medicineIds
      opts.q = ''
    }
  }

  if (opts.openNow) {
    const openIds = await pharmacyIdsOpenNow()
    if (!openIds.length) {
      return {
        pharmacies: [],
        page: 0,
        pageSize: opts.pageSize,
        hasMore: false,
        total: 0,
        error: null,
        fromCache: false,
        emptyReason: 'open_now',
      }
    }
    opts.pharmacyIds = opts.pharmacyIds
      ? opts.pharmacyIds.filter((id) => openIds.includes(id))
      : openIds
    if (!opts.pharmacyIds.length) {
      return {
        pharmacies: [],
        page: 0,
        pageSize: opts.pageSize,
        hasMore: false,
        total: 0,
        error: null,
        fromCache: false,
        emptyReason: 'open_now',
      }
    }
  }

  const key = queryCacheKey(opts)
  const hit = queryCache.get(key)
  if (!force && hit && Date.now() - hit.at < QUERY_TTL_MS) {
    return { ...hit.result, fromCache: true }
  }

  try {
    // Prefer server-side radius when we have coordinates and aren't browsing All Nepal
    // or a constrained medicine/open-now id set (those still use table filters).
    if (
      useRadius
      && hasOrigin(origin)
      && !isAllNepalLocation(city)
      && !opts.pharmacyIds?.length
      && opts.type === 'all'
    ) {
      const nearby = await queryPharmaciesNearby({
        q: opts.q,
        page: opts.page,
        pageSize: opts.pageSize,
        origin,
        radiusKm: opts.radiusKm,
      })
      if (opts.page === 0) {
        cache = nearby.pharmacies
        hydrated = true
        notify()
      }
      queryCache.set(key, { at: Date.now(), result: nearby })
      return nearby
    }

    const sb = requireSupabase()
    const from = opts.page * opts.pageSize
    const to = from + opts.pageSize - 1
    let qb = applyPharmacyFilters(
      sb.from(LIST_FROM).select(LIST_SELECT, { count: 'exact' }),
      opts,
    )
    qb = applyPharmacySort(qb, opts.sort === 'nearest' ? 'name' : opts.sort).range(from, to)
    const { data, error, count } = await qb
    if (error) throw error

    const originPoint = hasOrigin(origin) ? origin : null
    let pharmacies = (data || [])
      .map((row) => normalizeRow(row, { origin: originPoint || undefined }))
      .filter((pharmacy) => pharmacy.hasUsableName && pharmacy.name)
    if (opts.sort === 'nearest' && originPoint) {
      pharmacies = pharmacies.slice().sort((a, b) => {
        const da = a.distanceKm == null ? Number.POSITIVE_INFINITY : a.distanceKm
        const db = b.distanceKm == null ? Number.POSITIVE_INFINITY : b.distanceKm
        if (da !== db) return da - db
        return String(a.name).localeCompare(String(b.name))
      })
    }
    pharmacies = await enrichPharmaciesPage(pharmacies)

    const total = typeof count === 'number' ? count : pharmacies.length
    const result = {
      pharmacies,
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: (opts.page + 1) * opts.pageSize < total,
      total,
      error: null,
      fromCache: false,
      mode: 'browse',
    }

    if (opts.page === 0) {
      cache = pharmacies
      hydrated = true
      notify()
    }

    queryCache.set(key, { at: Date.now(), result })
    return result
  } catch (err) {
    console.warn('[pharmacies] queryPharmacies failed', err?.message || err)
    return {
      pharmacies: [],
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: false,
      total: 0,
      error: err?.message || 'Failed to load pharmacies',
      fromCache: false,
    }
  }
}

export async function hydratePharmacies({ force = false, city = null } = {}) {
  if (!force && hydrated) return cache
  if (!force && hydratePromise) return hydratePromise
  if (!isSupabaseConfigured) {
    hydrated = true
    return cache
  }

  hydratePromise = (async () => {
    try {
      const result = await queryPharmacies({
        city,
        page: 0,
        pageSize: HYDRATE_WARM,
        force: true,
      })
      if (result.pharmacies?.length) {
        cache = result.pharmacies
        notify()
      }
      hydrated = true
    } catch (err) {
      console.warn('[pharmacies] hydrate failed', err?.message || err)
      hydrated = true
    } finally {
      hydratePromise = null
    }
    return cache
  })()

  return hydratePromise
}

export async function fetchPharmacyById(id) {
  if (!id || !isSupabaseConfigured) return null
  const key = String(id)
  try {
    const sb = requireSupabase()
    let query = sb.from('pharmacies').select(DETAIL_SELECT).eq('is_active', true)
    if (isUuid(key)) {
      query = query.eq('id', key)
    } else {
      query = query.or(
        `pharmacy_code.eq.${key},license_number.eq.${key},source_key.eq.${key},external_ref.eq.${key}`,
      )
    }
    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw error
    if (!data) return null
    return normalizeDetailRow(data)
  } catch (err) {
    console.warn('[pharmacies] fetchPharmacyById failed', err?.message || err)
    return null
  }
}

export async function fetchPharmacyHours(pharmacyUuid) {
  if (!pharmacyUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('pharmacy_hours')
      .select('id, day_of_week, open_time, close_time, is_closed')
      .eq('pharmacy_id', pharmacyUuid)
      .order('day_of_week')
    if (error) throw error
    return (data || []).map(normalizeHoursRow)
  } catch (err) {
    console.warn('[pharmacies] hours failed', err?.message || err)
    return []
  }
}

export async function fetchPharmacyServices(pharmacyUuid) {
  if (!pharmacyUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('entity_services')
      .select('id, name, slug, description, fee, currency, is_active, metadata')
      .eq('entity_kind', 'pharmacy')
      .eq('entity_id', pharmacyUuid)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug || '',
      description: row.description || '',
      fee: row.fee != null ? Number(row.fee) : null,
      currency: row.currency || 'NPR',
      metadata: row.metadata || {},
    }))
  } catch (err) {
    console.warn('[pharmacies] services failed', err?.message || err)
    return []
  }
}

export async function fetchPharmacyContacts(pharmacyUuid) {
  if (!pharmacyUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('entity_contacts')
      .select('id, kind, label, value, is_primary, is_public')
      .eq('entity_kind', 'pharmacy')
      .eq('entity_id', pharmacyUuid)
      .eq('is_public', true)
      .order('is_primary', { ascending: false })
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label || row.kind,
      value: row.value,
      isPrimary: Boolean(row.is_primary),
    }))
  } catch (err) {
    console.warn('[pharmacies] contacts failed', err?.message || err)
    return []
  }
}

export async function fetchPharmacyMedia(pharmacyUuid) {
  if (!pharmacyUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('entity_media')
      .select('id, kind, public_url, alt_text, sort_order, is_active')
      .eq('entity_kind', 'pharmacy')
      .eq('entity_id', pharmacyUuid)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    return (data || [])
      .filter((row) => row.public_url)
      .map((row) => ({
        id: row.id,
        kind: row.kind || 'gallery',
        url: row.public_url,
        alt: row.alt_text || '',
        sortOrder: Number(row.sort_order) || 0,
      }))
  } catch (err) {
    console.warn('[pharmacies] media failed', err?.message || err)
    return []
  }
}

export async function fetchPharmacyPage(id) {
  if (!isSupabaseConfigured) {
    return {
      pharmacy: null,
      hours: [],
      services: [],
      contacts: [],
      media: [],
      error: 'Supabase is not configured',
    }
  }

  const pharmacy = await fetchPharmacyById(id)
  if (!pharmacy) {
    return {
      pharmacy: null,
      hours: [],
      services: [],
      contacts: [],
      media: [],
      error: 'Pharmacy not found',
    }
  }

  const uuid = pharmacy.pharmacyUuid
  const [hours, services, contacts, media] = await Promise.all([
    fetchPharmacyHours(uuid),
    fetchPharmacyServices(uuid),
    fetchPharmacyContacts(uuid),
    fetchPharmacyMedia(uuid),
  ])

  return {
    pharmacy,
    hours,
    services,
    contacts,
    media,
    error: null,
  }
}

export function mapsPharmacyDirectionsUrl(pharmacy) {
  if (!pharmacy) return null
  if (pharmacy.latitude != null && pharmacy.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`
  }
  const q = encodeURIComponent(pharmacy.fullAddress || pharmacy.address || pharmacy.name || '')
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

const COUNT_TTL_MS = 60_000
/** @type {Map<string, { at: number, total: number }>} */
const countCache = new Map()

function countCacheKey(opts) {
  return [
    opts.q || '',
    opts.city || '',
    opts.type || 'all',
    (opts.pharmacyIds || []).join(','),
  ].join('|')
}

/**
 * Exact pharmacy count for discovery filters (head-only).
 * Same filters as list queries — including usable-name gate.
 */
export async function countPharmacies(rawOpts = {}) {
  const opts = {
    q: String(rawOpts.q || '').trim(),
    city: rawOpts.city || '',
    type: rawOpts.type || 'all',
    pharmacyIds: rawOpts.pharmacyIds || null,
  }
  const key = countCacheKey(opts)
  const hit = countCache.get(key)
  if (hit && Date.now() - hit.at < COUNT_TTL_MS) return hit.total

  if (!isSupabaseConfigured) {
    countCache.set(key, { at: Date.now(), total: 0 })
    return 0
  }

  try {
    const sb = requireSupabase()
    const qb = applyPharmacyFilters(
      sb.from(LIST_FROM).select('id', { count: 'exact', head: true }),
      opts,
    )
    const { error, count } = await qb
    if (error) throw error
    const total = typeof count === 'number' ? count : 0
    countCache.set(key, { at: Date.now(), total })
    return total
  } catch (err) {
    console.warn('[pharmacies] countPharmacies failed', err?.message || err)
    countCache.set(key, { at: Date.now(), total: 0 })
    return 0
  }
}

export function clearPharmacyCountCache() {
  countCache.clear()
}

export { DAY_LABELS, DEFAULT_PAGE_SIZE as PHARMACIES_PAGE_SIZE, PHARMACY_TYPE_FILTERS }
