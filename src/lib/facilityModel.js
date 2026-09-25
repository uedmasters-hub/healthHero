/**
 * Shared Healthcare Center / Facility model + normalization.
 * PocketPills facilityDirectory displayFacilityName / displayFacilityLevel parity,
 * plus registry-prefix and underscore-district cleaning.
 *
 * Single pipeline: HF/Supabase row → Facility → UI.
 */

import {
  cleanRegistryDisplayName,
  collapseRegistryWhitespace,
  titleCaseRegistryName,
} from './registryText'

/**
 * @typedef {Object} Facility
 * @property {string} id
 * @property {string} name Clean display name
 * @property {string|null} registryName Original HF registry name (search)
 * @property {string} classification Facility level for subtitle (e.g. General Hospital)
 * @property {string} type Coarse kind: Hospital | Clinic | Facility
 * @property {string|null} facilityLevel Raw cleaned facility_level
 * @property {string|null} hfCode
 * @property {string} shortHfCode
 * @property {string} city
 * @property {string} district
 * @property {string} locationLabel
 * @property {string} address
 * @property {string} phone
 * @property {string} image
 * @property {number|null} rating
 * @property {boolean} isVerified
 * @property {string|null} verificationStatus
 */

function dedupePlaceParts(...parts) {
  const out = []
  const seen = new Set()
  for (const part of parts) {
    if (part == null) continue
    for (const chunk of String(part).split(',').map((s) => s.trim()).filter(Boolean)) {
      const key = chunk.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(chunk)
    }
  }
  return out.join(', ')
}

function payloadOf(row) {
  const p = row?.client_payload
  if (!p) return {}
  if (typeof p === 'string') {
    try { return JSON.parse(p) || {} } catch { return {} }
  }
  return p
}

/** PocketPills displayFacilityLevel — drop ??? noise, empty (--). */
export function displayFacilityLevel(raw) {
  let s = String(raw || '')
    .replace(/\?+/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s || s === '--') return ''
  return s
}

export function formatFacilityKind(type, facilityLevel) {
  const level = displayFacilityLevel(facilityLevel)
  if (level) {
    if (/hospital/i.test(level)) return 'Hospital'
    if (/clinic|health.?post|primary.?health|phc|ayurved|dental|eye/i.test(level)) return 'Clinic'
    if (/lab|diagnostic|patholog/i.test(level)) return 'Lab'
    // Prefer full classification when it's already human-readable
    if (level.length > 3) return level
  }
  const t = String(type || '').toLowerCase()
  if (t.includes('hospital')) return 'Hospital'
  if (t.includes('clinic')) return 'Clinic'
  if (t.includes('lab')) return 'Lab'
  if (t) return t.charAt(0).toUpperCase() + t.slice(1)
  return 'Facility'
}

/**
 * Classification for card subtitle — prefer facility_level over coarse type.
 * Never includes location.
 */
export function facilityClassification(row = {}) {
  const level = displayFacilityLevel(row.facility_level || row.facilityLevel)
  if (level) return level
  const kind = formatFacilityKind(row.type, null)
  return kind || 'Healthcare Center'
}

export function cleanFacilityDisplayName(name, { district, place } = {}) {
  return cleanRegistryDisplayName(name, { district, place, stripPharmacyUnit: false })
}

/**
 * PocketPills displayFacilityName + registry noise cleaning.
 */
export function displayFacilityName(name, { district, place } = {}) {
  const cleaned = cleanFacilityDisplayName(name, { district, place })
  if (!cleaned) return ''
  return titleCaseRegistryName(cleaned)
}

export function shortHfCode(hfCode) {
  const n = String(hfCode || '').replace(/\D/g, '')
  if (!n) return ''
  if (n.length <= 6) return n
  return n.slice(-6)
}

export function resolveFacilityLocation({ city, district, addressLine1 } = {}) {
  const cityVal = String(city || '').trim()
  const districtVal = String(district || '').trim()
  const resolvedCity = cityVal || districtVal || ''
  const resolvedDistrict = districtVal || cityVal || ''
  const locationLabel = dedupePlaceParts(resolvedCity, resolvedDistrict)
  const address = dedupePlaceParts(addressLine1, locationLabel) || locationLabel
  return {
    city: resolvedCity,
    district: resolvedDistrict,
    locationLabel,
    address,
  }
}

/**
 * Resolve display name from a Supabase / HF row.
 * Prefer display_name → name → payload.raw cleaned; keep registry for search.
 */
export function resolveFacilityDisplayName(row = {}, payload = {}) {
  const district = row.district || payload.district || null
  const candidates = [
    row.display_name,
    row.displayName,
    row.name,
    payload.hfName,
    payload.raw_name,
    payload.rawName,
  ]
  for (const value of candidates) {
    const shown = displayFacilityName(value, { district })
    if (shown) return shown
  }
  const code = row.hf_code || payload.hf_code
  if (code) return `Facility ${shortHfCode(code) || code}`
  return 'Facility'
}

export function facilityAvatarName(facility) {
  const name = String(facility?.name || '').trim()
  if (name && !/^facility(\s+#?\d+)?$/i.test(name)) return name
  const short = facility?.shortHfCode || shortHfCode(facility?.hfCode)
  if (short) return short
  return 'HF'
}

export function facilityDisplayTitle(facility) {
  const name = String(facility?.name || '').trim()
  if (name) return name
  const short = facility?.shortHfCode || shortHfCode(facility?.hfCode)
  if (short) return `#${short}`
  return 'Facility'
}

/**
 * Normalize a Supabase `healthcare_centers` row (or HF-shaped object) into Facility.
 */
export function normalizeFacilityRow(row, opts = {}) {
  const payload = payloadOf(row)
  const districtRaw = row.district || payload.district || ''
  const cityRaw = row.city || ''

  const registryName = collapseRegistryWhitespace(
    row.registry_name
    || row.registryName
    || payload.raw_name
    || payload.hfName
    || row.name
    || '',
  ) || null

  const name = resolveFacilityDisplayName(row, payload)
  const facilityLevel = displayFacilityLevel(row.facility_level || payload.facility_level) || null
  const classification = facilityClassification({
    facility_level: facilityLevel,
    type: row.type,
  })
  const type = formatFacilityKind(row.type, facilityLevel)

  const loc = resolveFacilityLocation({
    city: cityRaw,
    district: districtRaw,
    addressLine1: row.address_line1,
  })

  const lat = row.latitude != null ? Number(row.latitude) : null
  const lng = row.longitude != null ? Number(row.longitude) : null
  let distanceKm = null
  if (
    lat != null
    && lng != null
    && opts.haversineKm
    && (opts.origin || opts.defaultOrigin)
  ) {
    const origin = opts.origin || opts.defaultOrigin
    distanceKm = opts.haversineKm(
      origin.latitude,
      origin.longitude,
      lat,
      lng,
    )
  }

  const ratingRaw = row.rating_avg != null ? Number(row.rating_avg) : null
  const rating = ratingRaw != null && ratingRaw > 0 ? ratingRaw : null
  const verificationStatus = row.verification_status || 'unverified'
  const hfCode = row.hf_code || payload.hf_code || null

  return {
    id: row.id || hfCode || '',
    providerUuid: row.id || null,
    hfCode,
    shortHfCode: shortHfCode(hfCode),
    name,
    registryName,
    type,
    typeLabel: classification,
    classification,
    facilityLevel,
    address: loc.address,
    city: loc.city,
    district: loc.district,
    locationLabel: loc.locationLabel,
    phone: row.phone || '',
    image: row.image_url || row.logo_url || row.image || '',
    rating,
    ratingCount: row.rating_count != null ? Number(row.rating_count) : 0,
    verificationStatus,
    isVerified: verificationStatus === 'verified',
    sourceKey: row.source_key || null,
    externalRef: row.external_ref || null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    distanceKm,
    distance: opts.formatDistanceKm ? opts.formatDistanceKm(distanceKm) : null,
    departmentCount: 0,
    serviceCount: 0,
    openStatus: null,
    openLabel: null,
  }
}
