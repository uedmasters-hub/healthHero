/**
 * Healthcare centers — live registry discovery + facility detail.
 * Browse uses paginated Supabase queries (no mock/seed payloads).
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { formatProviderAddress, formatPlaceParts } from '../geography/formatPlace'
import { normalizeProviderRow } from './repository'
import { NEPAL_DEFAULT_COORDS, isAllNepalLocation } from '../../data/nepalGeography'

const DEFAULT_PAGE_SIZE = 24
const HYDRATE_WARM = 40
const QUERY_TTL_MS = 45_000
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Prefer base table — public view omits lat/lng needed for distance. */
const LIST_FROM = 'healthcare_centers'
const LIST_SELECT = [
  'id', 'name', 'type', 'hf_code', 'facility_level',
  'address_line1', 'city', 'district', 'phone',
  'image_url', 'logo_url', 'rating_avg', 'rating_count',
  'verification_status', 'source_key', 'external_ref',
  'latitude', 'longitude', 'is_active',
].join(', ')

const DETAIL_SELECT = [
  'id', 'org_id', 'name', 'type', 'hf_code', 'facility_level',
  'address_line1', 'address_line2', 'city', 'district', 'state', 'country', 'postal_code',
  'latitude', 'longitude', 'phone', 'email', 'website', 'logo_url', 'image_url',
  'rating_avg', 'rating_count', 'parent_id', 'branch_code', 'is_active',
  'verification_status', 'verified_at', 'source_key', 'external_ref',
].join(', ')

let cache = []
let hydrated = false
let hydratePromise = null
const queryCache = new Map()

function escapeIlike(value) {
  return String(value || '').replace(/[%(),]/g, '')
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function formatFacilityKind(type, facilityLevel) {
  const level = String(facilityLevel || '').trim()
  if (level) {
    if (/hospital/i.test(level)) return 'Hospital'
    if (/clinic|health.?post|primary.?health|phc|ayurved/i.test(level)) return 'Clinic'
    return level
  }
  const t = String(type || '').toLowerCase()
  if (t.includes('hospital')) return 'Hospital'
  if (t.includes('clinic')) return 'Clinic'
  if (t) return t.charAt(0).toUpperCase() + t.slice(1)
  return 'Facility'
}

function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(km)) return null
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10)} km`
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((n) => Number.isFinite(Number(n)))) return null
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeRow(row, { origin } = {}) {
  const city = row.city || ''
  const district = row.district || ''
  const lat = row.latitude != null ? Number(row.latitude) : null
  const lng = row.longitude != null ? Number(row.longitude) : null
  const originLat = origin?.latitude ?? NEPAL_DEFAULT_COORDS.latitude
  const originLng = origin?.longitude ?? NEPAL_DEFAULT_COORDS.longitude
  const distanceKm = (lat != null && lng != null)
    ? haversineKm(originLat, originLng, lat, lng)
    : null
  const ratingRaw = row.rating_avg != null ? Number(row.rating_avg) : null
  const rating = ratingRaw != null && ratingRaw > 0 ? ratingRaw : null

  return {
    id: row.id,
    providerUuid: row.id,
    hfCode: row.hf_code || null,
    name: row.name,
    type: formatFacilityKind(row.type, row.facility_level),
    facilityLevel: row.facility_level || null,
    address: formatProviderAddress({
      addressLine1: row.address_line1,
      city,
      district,
    }) || formatPlaceParts(city, district),
    city: formatPlaceParts(city) || formatPlaceParts(district),
    district: formatPlaceParts(district) || formatPlaceParts(city),
    phone: row.phone || '',
    image: row.image_url || row.logo_url || '',
    rating,
    ratingCount: row.rating_count != null ? Number(row.rating_count) : 0,
    verificationStatus: row.verification_status || null,
    isVerified: row.verification_status === 'verified',
    sourceKey: row.source_key,
    externalRef: row.external_ref,
    latitude: lat,
    longitude: lng,
    distanceKm,
    distance: formatDistanceKm(distanceKm),
    departmentCount: 0,
    serviceCount: 0,
    openStatus: null,
    openLabel: null,
  }
}

function normalizeDetailRow(row) {
  const base = normalizeRow(row)
  const city = row.city || ''
  const district = row.district || ''
  const line1 = row.address_line1 || ''
  const line2 = row.address_line2 || ''
  const fullAddress = [
    line1,
    line2,
    formatPlaceParts(city, district),
    row.state,
    row.postal_code,
    row.country,
  ].filter(Boolean).join(', ')

  return {
    ...base,
    addressLine1: line1,
    addressLine2: line2,
    state: row.state || '',
    country: row.country || '',
    postalCode: row.postal_code || '',
    email: row.email || '',
    website: row.website || '',
    logoUrl: row.logo_url || '',
    imageUrl: row.image_url || '',
    image: row.image_url || row.logo_url || '',
    verifiedAt: row.verified_at || null,
    parentId: row.parent_id || null,
    parentName: row.parent_center_name || null,
    parentHfCode: row.parent_hf_code || null,
    branchCode: row.branch_code || null,
    fullAddress: fullAddress || base.address,
    isActive: row.is_active !== false,
  }
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
  return `city.ilike.%${term}%,district.ilike.%${term}%,address_line1.ilike.%${term}%`
}

function applyCenterFilters(qb, opts) {
  let next = qb.eq('is_active', true)

  if (opts.q) {
    const term = escapeIlike(opts.q)
    next = next.or([
      `name.ilike.%${term}%`,
      `hf_code.ilike.%${term}%`,
      `city.ilike.%${term}%`,
      `district.ilike.%${term}%`,
      `facility_level.ilike.%${term}%`,
      `address_line1.ilike.%${term}%`,
      `type.ilike.%${term}%`,
    ].join(','))
  }

  const placeClause = locationOrClause(opts.city)
  if (placeClause) next = next.or(placeClause)

  return next
}

function applyCenterSort(qb, sort) {
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
    opts.sort || 'name',
    opts.page || 0,
    opts.pageSize || DEFAULT_PAGE_SIZE,
  ].join('|')
}

async function enrichCentersPage(centers) {
  if (!centers.length || !isSupabaseConfigured) return centers
  const ids = centers.map((c) => c.providerUuid || c.id).filter(Boolean)
  if (!ids.length) return centers

  try {
    const sb = requireSupabase()
    const today = new Date().getDay()
    const [hoursRes, deptRes, svcRes] = await Promise.all([
      sb.from('center_hours')
        .select('center_id, day_of_week, open_time, close_time, is_closed')
        .in('center_id', ids)
        .eq('day_of_week', today),
      sb.from('departments')
        .select('center_id')
        .in('center_id', ids)
        .eq('is_active', true),
      sb.from('entity_services')
        .select('entity_id')
        .eq('entity_kind', 'center')
        .in('entity_id', ids)
        .eq('is_active', true),
    ])

    const hoursById = new Map()
    ;(hoursRes.data || []).forEach((row) => {
      hoursById.set(row.center_id, normalizeHoursRow(row))
    })

    const deptCounts = new Map()
    ;(deptRes.data || []).forEach((row) => {
      deptCounts.set(row.center_id, (deptCounts.get(row.center_id) || 0) + 1)
    })

    const svcCounts = new Map()
    ;(svcRes.data || []).forEach((row) => {
      svcCounts.set(row.entity_id, (svcCounts.get(row.entity_id) || 0) + 1)
    })

    return centers.map((center) => {
      const id = center.providerUuid || center.id
      const hours = hoursById.get(id)
      const open = openStatusFromHours(hours)
      return {
        ...center,
        departmentCount: deptCounts.get(id) || 0,
        serviceCount: svcCounts.get(id) || 0,
        openStatus: open.openStatus,
        openLabel: open.openLabel,
      }
    })
  } catch (err) {
    console.warn('[centers] enrich failed', err?.message || err)
    return centers
  }
}

export function getCenters() {
  return cache.slice()
}

export function getCenterById(id) {
  if (id == null || id === '') return null
  const key = String(id)
  return cache.find((c) => (
    String(c.id) === key
    || String(c.providerUuid) === key
    || String(c.hfCode || '') === key
    || String(c.sourceKey || '') === key
  )) || null
}

export function clearCentersQueryCache() {
  queryCache.clear()
}

/**
 * Paginated live registry query for Centers discovery.
 * `total` is the exact Supabase count for the current filters.
 */
export async function queryCenters({
  q = '',
  city = null,
  sort = 'name',
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  force = false,
  origin = null,
} = {}) {
  const opts = {
    q: String(q || '').trim(),
    city: isAllNepalLocation(city) ? null : city,
    sort: sort || 'name',
    page: Math.max(0, Number(page) || 0),
    pageSize: Math.min(60, Math.max(8, Number(pageSize) || DEFAULT_PAGE_SIZE)),
  }
  const key = queryCacheKey(opts)
  const hit = queryCache.get(key)
  if (!force && hit && Date.now() - hit.at < QUERY_TTL_MS) {
    return { ...hit.result, fromCache: true }
  }

  if (!isSupabaseConfigured) {
    const result = {
      centers: [],
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: false,
      total: 0,
      error: 'Supabase is not configured',
      fromCache: false,
    }
    return result
  }

  try {
    const sb = requireSupabase()
    const from = opts.page * opts.pageSize
    const to = from + opts.pageSize - 1
    let qb = applyCenterFilters(
      sb.from(LIST_FROM).select(LIST_SELECT, { count: 'exact' }),
      opts,
    )
    qb = applyCenterSort(qb, opts.sort).range(from, to)
    const { data, error, count } = await qb
    if (error) throw error

    const originPoint = origin || NEPAL_DEFAULT_COORDS
    let centers = (data || []).map((row) => normalizeRow(row, { origin: originPoint }))
    if (opts.sort === 'nearest') {
      centers = centers
        .slice()
        .sort((a, b) => {
          const da = a.distanceKm == null ? Number.POSITIVE_INFINITY : a.distanceKm
          const db = b.distanceKm == null ? Number.POSITIVE_INFINITY : b.distanceKm
          if (da !== db) return da - db
          return String(a.name).localeCompare(String(b.name))
        })
    }
    centers = await enrichCentersPage(centers)

    const total = typeof count === 'number' ? count : centers.length
    const result = {
      centers,
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: (opts.page + 1) * opts.pageSize < total,
      total,
      error: null,
      fromCache: false,
    }

    // Warm in-memory cache with latest page for getCenterById / home.
    if (opts.page === 0) {
      cache = centers
      hydrated = true
    } else {
      const byId = new Map(cache.map((c) => [c.providerUuid || c.id, c]))
      centers.forEach((c) => byId.set(c.providerUuid || c.id, c))
      cache = Array.from(byId.values())
    }

    queryCache.set(key, { at: Date.now(), result })
    return result
  } catch (err) {
    console.warn('[centers] queryCenters failed', err?.message || err)
    return {
      centers: [],
      page: opts.page,
      pageSize: opts.pageSize,
      hasMore: false,
      total: 0,
      error: err?.message || 'Failed to load healthcare centers',
      fromCache: false,
    }
  }
}

/** Warm a nearby window for Home / sync (does not replace live list pagination). */
export async function hydrateCenters({ force = false, city = 'Kathmandu' } = {}) {
  if ((hydrated && !force) || (!force && hydratePromise)) {
    return hydratePromise || cache
  }
  if (!isSupabaseConfigured) {
    hydrated = true
    return cache
  }

  hydratePromise = (async () => {
    try {
      const result = await queryCenters({
        city,
        page: 0,
        pageSize: HYDRATE_WARM,
        force: true,
        sort: 'name',
      })
      if (result.centers?.length) {
        cache = result.centers
      }
      hydrated = true
    } catch (err) {
      console.warn('[centers] hydrate failed', err?.message || err)
      hydrated = true
    } finally {
      hydratePromise = null
    }
    return cache
  })()

  return hydratePromise
}

export async function searchCenters(query, { limit = 40, city = null } = {}) {
  const result = await queryCenters({
    q: query,
    city,
    page: 0,
    pageSize: limit,
    force: true,
  })
  return result.centers
}

/** Resolve one active center by UUID, hf_code, or source_key. */
export async function fetchCenterById(id) {
  if (!id || !isSupabaseConfigured) return null
  const key = String(id)
  try {
    const sb = requireSupabase()
    let query = sb.from('healthcare_centers').select(DETAIL_SELECT).eq('is_active', true)
    if (isUuid(key)) {
      query = query.eq('id', key)
    } else {
      query = query.or(`hf_code.eq.${key},source_key.eq.${key},external_ref.eq.${key}`)
    }
    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw error
    if (!data) return null
    const detail = normalizeDetailRow(data)
    if (data.parent_id) {
      const { data: parent } = await sb
        .from('healthcare_centers')
        .select('id, name, hf_code')
        .eq('id', data.parent_id)
        .maybeSingle()
      if (parent) {
        detail.parentName = parent.name
        detail.parentHfCode = parent.hf_code
      }
    }
    return detail
  } catch (err) {
    console.warn('[centers] fetchCenterById failed', err?.message || err)
    return null
  }
}

export async function fetchCenterHours(centerUuid) {
  if (!centerUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('center_hours')
      .select('id, day_of_week, open_time, close_time, is_closed')
      .eq('center_id', centerUuid)
      .order('day_of_week')
    if (error) throw error
    return (data || []).map(normalizeHoursRow)
  } catch (err) {
    console.warn('[centers] hours failed', err?.message || err)
    return []
  }
}

export async function fetchCenterDepartments(centerUuid) {
  if (!centerUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('departments')
      .select('id, name, description, phone, floor_number, head_provider_id, is_active')
      .eq('center_id', centerUuid)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      phone: row.phone || '',
      floor: row.floor_number != null ? Number(row.floor_number) : null,
      headProviderId: row.head_provider_id || null,
    }))
  } catch (err) {
    console.warn('[centers] departments failed', err?.message || err)
    return []
  }
}

export async function fetchCenterServices(centerUuid) {
  if (!centerUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('entity_services')
      .select('id, name, slug, description, fee, currency, is_active, metadata')
      .eq('entity_kind', 'center')
      .eq('entity_id', centerUuid)
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
    console.warn('[centers] services failed', err?.message || err)
    return []
  }
}

export async function fetchCenterContacts(centerUuid) {
  if (!centerUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('entity_contacts')
      .select('id, kind, label, value, is_primary, is_public')
      .eq('entity_kind', 'center')
      .eq('entity_id', centerUuid)
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
    console.warn('[centers] contacts failed', err?.message || err)
    return []
  }
}

export async function fetchCenterMedia(centerUuid) {
  if (!centerUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('entity_media')
      .select('id, kind, public_url, alt_text, sort_order, is_active')
      .eq('entity_kind', 'center')
      .eq('entity_id', centerUuid)
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
    console.warn('[centers] media failed', err?.message || err)
    return []
  }
}

export async function fetchCenterProviders(centerUuid) {
  if (!centerUuid || !isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data: links, error: linkError } = await sb
      .from('provider_centers')
      .select('provider_id, is_primary')
      .eq('center_id', centerUuid)
    if (linkError) throw linkError

    const linkedIds = (links || []).map((l) => l.provider_id).filter(Boolean)
    const primarySet = new Set(
      (links || []).filter((l) => l.is_primary).map((l) => l.provider_id),
    )

    let providerIds = linkedIds
    if (!providerIds.length) {
      const { data: primaryRows, error: primaryError } = await sb
        .from('providers')
        .select('id')
        .eq('primary_center_id', centerUuid)
        .eq('is_active', true)
        .limit(40)
      if (primaryError) throw primaryError
      providerIds = (primaryRows || []).map((r) => r.id)
    }

    if (!providerIds.length) return []

    const { data: providers, error: provError } = await sb
      .from('providers')
      .select('*')
      .in('id', providerIds)
      .eq('is_active', true)
      .order('display_name')
      .limit(40)
    if (provError) throw provError

    return (providers || []).map((row) => {
      const doctor = normalizeProviderRow(row)
      return {
        ...doctor,
        isPrimaryAtCenter: primarySet.has(row.id),
      }
    })
  } catch (err) {
    console.warn('[centers] providers failed', err?.message || err)
    return []
  }
}

/**
 * Full facility page payload — center + related tables in parallel.
 */
export async function fetchFacilityPage(id) {
  if (!isSupabaseConfigured) {
    return {
      facility: null,
      hours: [],
      departments: [],
      services: [],
      contacts: [],
      media: [],
      doctors: [],
      error: 'Supabase is not configured',
    }
  }

  const facility = await fetchCenterById(id)
  if (!facility) {
    return {
      facility: null,
      hours: [],
      departments: [],
      services: [],
      contacts: [],
      media: [],
      doctors: [],
      error: 'Facility not found',
    }
  }

  const uuid = facility.providerUuid
  const [hours, departments, services, contacts, media, doctors] = await Promise.all([
    fetchCenterHours(uuid),
    fetchCenterDepartments(uuid),
    fetchCenterServices(uuid),
    fetchCenterContacts(uuid),
    fetchCenterMedia(uuid),
    fetchCenterProviders(uuid),
  ])

  return {
    facility,
    hours,
    departments,
    services,
    contacts,
    media,
    doctors,
    error: null,
  }
}

export function mapsDirectionsUrl(facility) {
  if (!facility) return null
  if (facility.latitude != null && facility.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`
  }
  const q = encodeURIComponent(facility.fullAddress || facility.address || facility.name || '')
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export { DAY_LABELS, DEFAULT_PAGE_SIZE as CENTERS_PAGE_SIZE }
