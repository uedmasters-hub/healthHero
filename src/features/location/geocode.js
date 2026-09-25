/**
 * Reverse / forward geocoding helpers (BigDataCloud + Nominatim).
 * Works for Nepal and nearby metros (Delhi, Gurugram, etc.).
 */
import { matchNepalCity } from '../../data/nepalGeography'
import { PLACE_COORDS } from './constants'

const CITY_ALIASES = {
  delhi: 'Delhi',
  'new delhi': 'New Delhi',
  gurugram: 'Gurugram',
  gurgaon: 'Gurugram',
  noida: 'Noida',
}

function matchKnownPlace(values = []) {
  for (const raw of values) {
    if (!raw) continue
    const key = String(raw).toLowerCase().trim()
    if (CITY_ALIASES[key]) return CITY_ALIASES[key]
    const placeHit = Object.keys(PLACE_COORDS).find((k) => k.toLowerCase() === key)
    if (placeHit) return placeHit
  }
  const nepal = matchNepalCity(values)
  if (nepal) return nepal
  for (const raw of values) {
    if (!raw) continue
    const text = String(raw).trim()
    if (text.length >= 2) return text
  }
  return null
}

/**
 * @returns {Promise<{ locality: string, latitude: number, longitude: number, country?: string } | null>}
 */
export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  const res = await fetch(url)
  if (!res.ok) throw new Error('reverse-geocode-failed')
  const data = await res.json()
  const admin = (data.localityInfo?.administrative || []).map((item) => item.name)
  const locality = matchKnownPlace([
    data.city,
    data.locality,
    data.principalSubdivision,
    ...admin,
  ])
  if (!locality) return null
  return {
    locality,
    latitude: lat,
    longitude: lng,
    country: data.countryName || data.countryCode || null,
  }
}

/**
 * Free-text place search for the location picker.
 * @returns {Promise<Array<{ id: string, locality: string, label: string, latitude: number, longitude: number }>>}
 */
export async function searchPlaces(query, { limit = 8, signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const localHits = Object.keys(PLACE_COORDS)
    .filter((name) => name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 4)
    .map((name) => ({
      id: `local:${name}`,
      locality: name,
      label: name,
      latitude: PLACE_COORDS[name].latitude,
      longitude: PLACE_COORDS[name].longitude,
    }))

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', String(Math.max(4, limit)))
    const res = await fetch(url.toString(), {
      signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return localHits
    const data = await res.json()
    const remote = (Array.isArray(data) ? data : []).map((item, i) => {
      const addr = item.address || {}
      const locality = matchKnownPlace([
        addr.city,
        addr.town,
        addr.village,
        addr.suburb,
        addr.county,
        addr.state,
        item.name,
      ]) || item.name || item.display_name?.split(',')[0]
      return {
        id: `nominatim:${item.place_id || i}`,
        locality: String(locality || '').trim() || 'Selected place',
        label: item.display_name || locality,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      }
    }).filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))

    const seen = new Set(localHits.map((h) => h.locality.toLowerCase()))
    const merged = [...localHits]
    for (const row of remote) {
      const key = row.locality.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(row)
      if (merged.length >= limit) break
    }
    return merged
  } catch {
    return localHits
  }
}

/**
 * High-accuracy device GPS position.
 * @returns {Promise<{ latitude: number, longitude: number, accuracy?: number }>}
 */
export function readDevicePosition({
  enableHighAccuracy = true,
  timeout = 14000,
  maximumAge = 30_000,
} = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('geolocation-unsupported'), { code: 0 }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        })
      },
      (error) => {
        const err = Object.assign(new Error(error?.message || 'geolocation-failed'), {
          code: error?.code,
        })
        reject(err)
      },
      { enableHighAccuracy, timeout, maximumAge },
    )
  })
}
