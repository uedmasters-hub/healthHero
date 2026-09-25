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

export function coordsForPlace(label) {
  const key = String(label || '').trim()
  if (!key) return null
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
