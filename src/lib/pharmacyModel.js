/**
 * Shared Pharmacy model + normalization (PocketPills DdaPharmacy parity).
 *
 * Single pipeline: DDA/Supabase row → Pharmacy → UI.
 * English display names only; Nepali suppressed until transliteration lands.
 */

import {
  hasDevanagari,
  repairUtf8Mojibake,
  splitBilingualPharmacyName,
} from './nepaliText'
import {
  cleanRegistryDisplayName,
  titleCaseRegistryName,
} from './registryText'

const DEVANAGARI_RE = /[\u0900-\u097F]/
const PREETI_GARBAGE_RE = /[;:][a-zA-Z]|[\]\\]|[àáâãäåæç]|P=|kmfd|kf\]|ln=|o'lg|÷Ì|ÏfFp/
const SEEDED_GENERIC_RE = /^pharmacy(\s+#?\d+)?$/i
/** DDA junk: empty parens, dashes, license-only stubs, Preeti mojibake. */
const JUNK_NAME_RE = /^(?:[\s()\-_–—./|]+|\d{8,16}(?:\s*\(\s*\))?)$/

/**
 * True when a raw DDA/API name is usable (not empty, not `()`, not license stub).
 */
export function isUsablePharmacyName(raw) {
  const text = repairUtf8Mojibake(String(raw || '').trim())
  if (!text) return false
  if (JUNK_NAME_RE.test(text)) return false
  if (SEEDED_GENERIC_RE.test(text)) return false
  if (PREETI_GARBAGE_RE.test(text) && !/[a-zA-Z]{3,}/.test(text.replace(PREETI_GARBAGE_RE, ' '))) {
    return false
  }
  // Must have either Latin letters or Devanagari (something to display / transliterate).
  if (!/[a-zA-Z]{2,}/.test(text) && !DEVANAGARI_RE.test(text)) return false
  return true
}

/**
 * @typedef {Object} Pharmacy
 * @property {string} id
 * @property {string|null} [pharmacyUuid]
 * @property {string} name
 * @property {string|null} [registryName] Original DDA/Supabase name (search matches this server-side)
 * @property {string|null} nameLocal
 * @property {string|null} nameTransliterated
 * @property {string|null} licenseNumber
 * @property {string|null} pharmacyCode
 * @property {string|null} registrationNo
 * @property {string} [shortLicense]
 * @property {string} area
 * @property {string} place
 * @property {string} city
 * @property {string} district
 * @property {string} locationLabel
 * @property {string} address
 * @property {string} systemType
 * @property {string} pharmacyType
 * @property {string} phone
 * @property {string} email
 * @property {string} image
 * @property {string|null} logoUrl
 * @property {number|null} rating
 * @property {boolean} delivers
 * @property {string} verificationStatus
 * @property {boolean} isVerified
 * @property {string|null} ddaVerifiedLabel
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {number|null} distanceKm
 * @property {string|null} distance
 * @property {'open'|'closed'|null} openStatus
 * @property {string|null} openLabel
 * @property {string|null} sourceKey
 * @property {string|null} externalRef
 * @property {string|null} centerId
 * @property {number} serviceCount
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

/** PocketPills `normalizeRegNo` — digits only, 8–16. */
export function normalizeRegNo(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!/^\d{8,16}$/.test(digits)) return null
  return digits
}

/** PocketPills `shortRegNo` — last 6 digits for badges. */
export function shortRegNo(registrationNo) {
  const n = normalizeRegNo(registrationNo) || String(registrationNo || '').replace(/\D/g, '')
  if (!n) return ''
  if (n.length <= 6) return n
  return n.slice(-6)
}

/**
 * PocketPills `displayPharmacyName` — clean + title-case Latin pharmacy names.
 * Returns '' for empty / seeded generics (does not invent "Pharmacy").
 */
export function displayPharmacyName(name) {
  const cleaned = cleanPharmacyDisplayName(name)
  if (!cleaned || SEEDED_GENERIC_RE.test(cleaned)) return ''
  return titleCaseRegistryName(cleaned)
}

/**
 * Strip noisy registry prefixes / unit stubs / punctuation for UI display.
 * Preserves Medical, Pharmaceuticals, Pharmacy (alone), Pvt. Ltd.
 * Search continues to match the original Supabase/DDA `name` + `registry_name`.
 */
export function cleanPharmacyDisplayName(name, { district, place } = {}) {
  return cleanRegistryDisplayName(name, {
    district,
    place,
    stripPharmacyUnit: true,
  })
}

/**
 * PocketPills `normalizePranali` — drop HUMAN; tidy separators.
 */
export function normalizePranali(raw) {
  let s = String(raw || '').trim()
  s = s.replace(/\bHUMAN\b/gi, '')
  s = s.replace(/\s*[-–—]\s*/g, ' - ')
  s = s.replace(/\s+/g, ' ').replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim()
  return s
}

/**
 * PocketPills `displayPranali` — hide Allopathy; keep Ayurvedic / Unani / etc.
 * Empty string when nothing meaningful remains (never invents "Pharmacy").
 */
export function displayPranali(raw) {
  let s = normalizePranali(raw)
  s = s.replace(/\bhuman\b/gi, '')
  s = s.replace(/\bveterinar\w*/gi, '')
  s = s.replace(/\ballopath(?:y|ic)\b/gi, '')
  s = s.replace(/[-–—]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  if (!s) return ''
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase())
}

/** Prefer displayPranali — kept for filter labels. */
export function formatPharmacyType(systemType) {
  const shown = displayPranali(systemType)
  if (shown) return shown
  const raw = String(systemType || '').trim()
  if (!raw) return ''
  const key = raw.toUpperCase()
  if (key.includes('VETERINARY')) return 'Veterinary'
  if (key.includes('AYURVED')) return 'Ayurvedic'
  if (key.includes('HOMEOPATH')) return 'Homeopathy'
  if (key.includes('UNANI')) return 'Unani'
  if (key.includes('ALLOPATH') || key.includes('HUMAN')) return ''
  return displayPharmacyName(raw) || ''
}

export const PHARMACY_TYPE_FILTERS = Object.freeze([
  { id: 'all', label: 'All types', match: null },
  { id: 'allopathy', label: 'Allopathy', match: 'ALLOPATHY - HUMAN' },
  { id: 'ayurvedic', label: 'Ayurvedic', match: 'AYURVEDIC' },
  { id: 'veterinary', label: 'Veterinary', match: 'ALLOPATHY - VETERINARY' },
  { id: 'homeopathy', label: 'Homeopathy', match: 'HOMEOPATHY' },
  { id: 'unani', label: 'Unani', match: 'UNANI' },
])

function looksLikeEnglishName(value) {
  const text = String(value || '').trim()
  if (!text || hasDevanagari(text) || PREETI_GARBAGE_RE.test(text)) return false
  if (SEEDED_GENERIC_RE.test(text)) return false
  const letters = (text.match(/[a-zA-Z]/g) || []).length
  return letters >= 3
}

/**
 * Strip Devanagari / non-ASCII and keep a Latin pharmacy label when present.
 * Returns '' when nothing usable remains — never invents "Pharmacy".
 */
export function extractEnglishPharmacyName(raw) {
  if (!isUsablePharmacyName(raw) && !String(raw || '').trim()) return ''
  const text = repairUtf8Mojibake(String(raw || '').trim())
  if (!text || SEEDED_GENERIC_RE.test(text) || JUNK_NAME_RE.test(text)) return ''

  const split = splitBilingualPharmacyName(text)
  let candidate = split.name || text
  candidate = candidate
    .replace(DEVANAGARI_RE, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Drop leading license stubs: "3720522… Name"
  candidate = candidate.replace(/^\d{8,16}\s+/, '').trim()

  if (!looksLikeEnglishName(candidate)) return ''
  if (PREETI_GARBAGE_RE.test(candidate)) {
    // Keep only clean Latin tokens when Preeti junk is mixed in.
    const cleaned = candidate
      .split(/\s+/)
      .filter((w) => /[a-zA-Z]{2,}/.test(w) && !PREETI_GARBAGE_RE.test(w))
      .join(' ')
    if (!looksLikeEnglishName(cleaned)) return ''
    return displayPharmacyName(cleaned)
  }
  return displayPharmacyName(candidate)
}

/**
 * Collect name candidates from a raw API / Supabase / DDA row in priority order.
 * english_name → display_name → pharmacy_name → name → organization_name →
 * trade_name → client_payload English → transliterated Nepali.
 */
export function collectPharmacyNameCandidates(row = {}, payload = {}) {
  const p = payload && Object.keys(payload).length ? payload : payloadOf(row)
  return [
    row.english_name,
    row.englishName,
    p.english_name,
    p.englishName,
    row.display_name,
    row.displayName,
    p.display_name,
    p.displayName,
    row.pharmacy_name,
    row.pharmacyName,
    row['Pharmacy Name'],
    p.pharmacy_name,
    p.pharmacyName,
    row.name,
    p.name,
    row.organization_name,
    row.organizationName,
    p.organization_name,
    row.trade_name,
    row.tradeName,
    p.trade_name,
    p.raw_name,
    p.rawName,
    row.name_transliterated,
    row.nameTransliterated,
    p.name_transliterated,
    p.transliterated_name,
    row.name_local,
    row.nameLocal,
    p.name_local,
  ]
}

/**
 * Resolve display name — PocketPills pipeline + English preference.
 *
 * Priority:
 * 1. english_name
 * 2. display_name
 * 3. pharmacy_name
 * 4. name
 * 5. organization_name
 * 6. trade_name
 * 7. English inside client_payload / raw_name
 * 8. Transliterated Nepali
 * 9. '' when only junk/Nepali remains (license used only by pharmacyDisplayTitle)
 * 10. 'Pharmacy' only when every naming field is genuinely empty
 */
export function resolvePharmacyDisplayName(input = {}) {
  const candidates = Array.isArray(input.candidates) && input.candidates.length
    ? input.candidates
    : [
      input.english_name,
      input.englishName,
      input.display_name,
      input.displayName,
      input.pharmacy_name,
      input.pharmacyName,
      input.name,
      input.organization_name,
      input.organizationName,
      input.trade_name,
      input.tradeName,
      input.rawName,
      input.nameTransliterated,
      input.name_transliterated,
      input.nameLocal,
      input.name_local,
    ]

  const usable = candidates.filter((v) => String(v || '').trim().length > 0)
  for (const value of usable) {
    const english = extractEnglishPharmacyName(value)
    if (english) return english
  }

  // Naming fields present but no English/transliteration — suppress Nepali, no generic.
  if (usable.some((v) => isUsablePharmacyName(v) || DEVANAGARI_RE.test(String(v)))) {
    return ''
  }
  // Only junk / empty — caller may fall back to license via pharmacyDisplayTitle.
  return ''
}

/**
 * Card / detail title. License (`#230555`) only when every name field is empty/junk.
 */
export function pharmacyDisplayTitle(pharmacy, { allowLicenseFallback = true } = {}) {
  const name = String(pharmacy?.name || '').trim()
  if (name && !SEEDED_GENERIC_RE.test(name)) return name
  if (allowLicenseFallback) {
    const short = pharmacy?.shortLicense || shortRegNo(pharmacy?.licenseNumber || pharmacy?.registrationNo)
    if (short) return `#${short}`
  }
  return 'Pharmacy'
}

/**
 * Location cascade: area → city → district (PocketPills placeLine + fallbacks).
 * Missing area → city; missing city → district.
 */
export function resolvePharmacyLocation({
  area,
  place,
  city,
  district,
} = {}) {
  const areaVal = String(area || place || '').trim()
  const cityVal = String(city || '').trim()
  const districtVal = String(district || '').trim()

  const resolvedArea = areaVal || cityVal || districtVal || ''
  const resolvedCity = cityVal || districtVal || areaVal || ''
  const resolvedDistrict = districtVal || cityVal || areaVal || ''

  const locationLabel = dedupePlaceParts(resolvedArea, resolvedCity, resolvedDistrict)
    || resolvedArea
    || resolvedCity
    || resolvedDistrict
    || ''

  return {
    area: resolvedArea,
    place: resolvedArea,
    city: resolvedCity,
    district: resolvedDistrict,
    locationLabel,
  }
}

function payloadOf(row) {
  const p = row?.client_payload
  if (!p) return {}
  if (typeof p === 'string') {
    try { return JSON.parse(p) || {} } catch { return {} }
  }
  return p
}

/**
 * Normalize a Supabase `pharmacies` row (or DDA-shaped object) into Pharmacy.
 * @param {Record<string, unknown>} row
 * @param {{ origin?: { latitude: number, longitude: number }, formatDistanceKm?: (km: number|null) => string|null, haversineKm?: Function, defaultOrigin?: { latitude: number, longitude: number } }} [opts]
 * @returns {Pharmacy}
 */
export function normalizePharmacyRow(row, opts = {}) {
  const payload = payloadOf(row)
  const license = String(
    row.license_number
    || row.pharmacy_code
    || row.registrationNo
    || row.registration_no
    || payload.registration_no
    || payload.pharmacy_code
    || '',
  ).trim()

  const candidates = collectPharmacyNameCandidates(row, payload)
  const nameTransliterated = String(
    row.name_transliterated
    || row.nameTransliterated
    || payload.name_transliterated
    || payload.transliterated_name
    || '',
  ).trim() || null

  const areaRaw = row.place || row.area || payload.place || ''
  const cityRaw = row.city || ''
  const districtRaw = row.district || payload.district || ''

  const resolvedName = resolvePharmacyDisplayName({ candidates })
  const displayName = cleanPharmacyDisplayName(resolvedName, {
    district: districtRaw,
    place: areaRaw,
  }) || resolvedName

  const loc = resolvePharmacyLocation({
    area: areaRaw,
    place: areaRaw,
    city: cityRaw,
    district: districtRaw,
  })

  const systemType = normalizePranali(
    row.system_type || row.pranali || payload.pranali || '',
  )
  const pharmacyType = displayPranali(systemType)

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
  const isVerified = verificationStatus === 'verified'

  const address = dedupePlaceParts(
    row.address_line1,
    loc.area,
    loc.city,
    loc.district,
  ) || loc.locationLabel

  const image = row.image_url || row.logo_url || row.image || ''
  const hasUsableName = Boolean(displayName)
  const registryName = String(
    row.registry_name
    || row.registryName
    || payload.raw_name
    || row.name
    || row['Pharmacy Name']
    || '',
  ).trim() || null

  return {
    id: row.id || license || '',
    pharmacyUuid: row.id || null,
    pharmacyCode: row.pharmacy_code || license || null,
    licenseNumber: license || null,
    registrationNo: normalizeRegNo(license) || license || null,
    shortLicense: shortRegNo(license),
    name: displayName,
    registryName,
    nameLocal: null,
    nameTransliterated,
    hasUsableName,
    area: loc.area,
    place: loc.place,
    city: loc.city,
    district: loc.district,
    locationLabel: loc.locationLabel,
    address,
    systemType,
    pharmacyType,
    phone: row.phone || '',
    email: row.email || '',
    image,
    logoUrl: image || null,
    rating,
    delivers: Boolean(row.delivers),
    verificationStatus,
    isVerified,
    ddaVerifiedLabel: isVerified ? 'DDA verified' : (license ? 'DDA registered' : null),
    sourceKey: row.source_key || null,
    externalRef: row.external_ref || null,
    centerId: row.center_id || null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    distanceKm,
    distance: opts.formatDistanceKm ? opts.formatDistanceKm(distanceKm) : null,
    openStatus: null,
    openLabel: null,
    serviceCount: 0,
  }
}

/**
 * Avatar label for initials — prefer English name; else short license; else "PH".
 * "A R Pharma…" → AR; "A A Pharmaceuticals" → AP (skip duplicate single letter).
 */
export function pharmacyAvatarName(pharmacy) {
  const name = String(pharmacy?.name || '').trim()
  if (name && !SEEDED_GENERIC_RE.test(name)) {
    const heads = name
      .split(/\s+/)
      .map((part) => part.replace(/[^a-zA-Z]/g, ''))
      .filter(Boolean)
    if (heads.length >= 2 && heads[0].length === 1 && heads[1].length === 1) {
      if (
        heads[0].toLowerCase() === heads[1].toLowerCase()
        && heads.length >= 3
        && heads[heads.length - 1].length > 1
      ) {
        return `${heads[0][0]}${heads[heads.length - 1][0]}`.toUpperCase()
      }
      return `${heads[0]}${heads[1]}`.toUpperCase()
    }
    return name
  }
  const short = pharmacy?.shortLicense || shortRegNo(pharmacy?.licenseNumber || pharmacy?.registrationNo)
  if (short) return short
  return 'PH'
}
