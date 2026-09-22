/**
 * Pharmacies repository — SSOT from Supabase `pharmacies` (DDA registry).
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { formatProviderAddress, formatPlaceParts, formatCityDistrict } from '../geography/formatPlace'

let cache = []
let hydrated = false
let hydratePromise = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try { fn(cache) } catch { /* ignore */ }
  })
}

function normalizeRow(row) {
  const city = row.city || ''
  const district = row.district || ''
  const place = row.place || ''
  return {
    id: row.pharmacy_code || row.source_key || row.id,
    pharmacyUuid: row.id,
    pharmacyCode: row.pharmacy_code || null,
    name: row.name,
    nameLocal: row.name_local || null,
    place: formatPlaceParts(place),
    district: formatPlaceParts(district) || formatPlaceParts(city),
    address: formatProviderAddress({
      addressLine1: row.address_line1,
      place,
      city,
      district,
    }) || formatCityDistrict(city, district) || formatPlaceParts(place),
    city: formatPlaceParts(city) || formatPlaceParts(district),
    systemType: row.system_type || '',
    phone: row.phone || '',
    image: row.image_url || '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
    rating: Number(row.rating_avg) || 4.5,
    delivers: Boolean(row.delivers),
    sourceKey: row.source_key,
    externalRef: row.external_ref,
    verificationStatus: row.verification_status || 'unverified',
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
    || String(p.pharmacyCode) === key
  )) || null
}

export async function hydratePharmacies({ force = false } = {}) {
  if (!force && hydrated) return cache
  if (!force && hydratePromise) return hydratePromise
  if (!isSupabaseConfigured) {
    hydrated = true
    return cache
  }

  hydratePromise = (async () => {
    try {
      const sb = requireSupabase()
      // Paginate — registry is large (30k+).
      const pageSize = 1000
      let from = 0
      const rows = []
      for (;;) {
        const { data, error } = await sb
          .from('v_pharmacies_public')
          .select('id, name, name_local, pharmacy_code, place, district, system_type, address_line1, city, phone, image_url, rating_avg, delivers, source_key, external_ref, verification_status')
          .order('name')
          .range(from, from + pageSize - 1)
        if (error) throw error
        if (!data?.length) break
        rows.push(...data)
        if (data.length < pageSize) break
        from += pageSize
        // Cap client hydrate at first 5k for UI responsiveness; full catalog stays in DB.
        if (rows.length >= 5000) break
      }
      if (rows.length) {
        cache = rows.map(normalizeRow)
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
