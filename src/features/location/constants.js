/**
 * Shared discovery location constants + city coordinate lookup.
 * GPS is the preferred source of truth — Kathmandu is never an implicit fallback.
 */

export const DEFAULT_SEARCH_RADIUS_KM = 20
export const MIN_SEARCH_RADIUS_KM = 10
export const MAX_SEARCH_RADIUS_KM = 100
export const RADIUS_STEP_KM = 10

export const LOCATION_CACHE_KEY = 'emedicalls.location.v1'
export const LOCATION_RECENTS_MAX = 8

/** Collapse common aliases so MRU never keeps both "Delhi" and "New Delhi". */
export const PLACE_ALIASES = Object.freeze({
  'new delhi': 'Delhi',
  gurgaon: 'Gurugram',
})

/** Known place coordinates for manual picks (Nepal + common nearby metros). */
export const PLACE_COORDS = {
  Kathmandu: { latitude: 27.7172, longitude: 85.3240 },
  Lalitpur: { latitude: 27.6588, longitude: 85.3247 },
  Bhaktapur: { latitude: 27.6710, longitude: 85.4298 },
  Pokhara: { latitude: 28.2096, longitude: 83.9856 },
  Biratnagar: { latitude: 26.4525, longitude: 87.2718 },
  Birgunj: { latitude: 27.0104, longitude: 84.8774 },
  Dharan: { latitude: 26.8121, longitude: 87.2832 },
  Butwal: { latitude: 27.7006, longitude: 83.4484 },
  Nepalgunj: { latitude: 28.05, longitude: 81.6167 },
  Dhangadhi: { latitude: 28.6852, longitude: 80.6216 },
  Hetauda: { latitude: 27.4284, longitude: 85.0322 },
  Janakpur: { latitude: 26.7288, longitude: 85.9263 },
  Itahari: { latitude: 26.6630, longitude: 87.2770 },
  Chitwan: { latitude: 27.5291, longitude: 84.3542 },
  Delhi: { latitude: 28.6139, longitude: 77.2090 },
  'New Delhi': { latitude: 28.6139, longitude: 77.2090 },
  Gurugram: { latitude: 28.4595, longitude: 77.0266 },
  Gurgaon: { latitude: 28.4595, longitude: 77.0266 },
  Noida: { latitude: 28.5355, longitude: 77.3910 },
}

export function clampRadiusKm(value, fallback = DEFAULT_SEARCH_RADIUS_KM) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_SEARCH_RADIUS_KM, Math.max(MIN_SEARCH_RADIUS_KM, Math.round(n)))
}

export function nextExpandRadiusKm(current) {
  const cur = clampRadiusKm(current)
  if (cur >= MAX_SEARCH_RADIUS_KM) return null
  if (cur < 40) return Math.min(MAX_SEARCH_RADIUS_KM, cur + 20)
  if (cur < 70) return Math.min(MAX_SEARCH_RADIUS_KM, 70)
  return MAX_SEARCH_RADIUS_KM
}

/** Trim + lowercase locality for comparisons. */
export function normalizeLocalityLabel(label) {
  return String(label || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Stable identity for MRU dedupe.
 * Prefer canonical PLACE_COORDS / alias key (so "Delhi" is unique), then placeId, then rounded geo.
 */
export function locationIdentity(entry) {
  if (!entry) return ''

  const raw = String(entry.locality || '').trim()
  const norm = normalizeLocalityLabel(raw)

  if (norm) {
    const aliasTarget = PLACE_ALIASES[norm]
    if (aliasTarget) return `place:${normalizeLocalityLabel(aliasTarget)}`
    if (PLACE_COORDS[raw]) return `place:${norm}`
    const hit = Object.keys(PLACE_COORDS).find((k) => normalizeLocalityLabel(k) === norm)
    if (hit) return `place:${normalizeLocalityLabel(hit)}`
  }

  if (entry.placeId) return `id:${String(entry.placeId).trim().toLowerCase()}`

  const lat = Number(entry.latitude)
  const lng = Number(entry.longitude)
  if (norm && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `geo:${norm}|${lat.toFixed(3)},${lng.toFixed(3)}`
  }
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `geo:${lat.toFixed(3)},${lng.toFixed(3)}`
  }
  return norm ? `name:${norm}` : ''
}

/** Preferred display locality (canonical place name when known). */
export function canonicalLocality(entry) {
  const raw = String(entry?.locality || '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''
  const norm = normalizeLocalityLabel(raw)
  const alias = PLACE_ALIASES[norm]
  if (alias) return alias
  if (PLACE_COORDS[raw]) return raw
  const hit = Object.keys(PLACE_COORDS).find((k) => normalizeLocalityLabel(k) === norm)
  return hit || raw
}

export function coordsForPlace(label) {
  const key = String(label || '').trim()
  if (!key) return null
  const alias = PLACE_ALIASES[normalizeLocalityLabel(key)]
  const resolved = alias || key
  if (PLACE_COORDS[resolved]) return { ...PLACE_COORDS[resolved], locality: resolved }
  if (PLACE_COORDS[key]) return { ...PLACE_COORDS[key], locality: key }
  const hit = Object.keys(PLACE_COORDS).find((k) => k.toLowerCase() === key.toLowerCase())
  if (!hit) return null
  return { ...PLACE_COORDS[hit], locality: hit }
}

export function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(Number(km))) return null
  const n = Number(km)
  if (n < 1) return `${Math.max(0.1, Math.round(n * 10) / 10)} km`
  if (n < 10) return `${(Math.round(n * 10) / 10).toFixed(1)} km`
  return `${Math.round(n)} km`
}
