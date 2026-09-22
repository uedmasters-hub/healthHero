/**
 * Nepal address lookup — prefers Supabase HF-derived view, falls back to local geography.
 */
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'
import { NEPAL_DISTRICTS, NEPAL_MAJOR_CITIES, NEPAL_PROVINCES, districtsForProvince } from '../../data/nepalGeography'

export { NEPAL_DISTRICTS, NEPAL_MAJOR_CITIES, NEPAL_PROVINCES, districtsForProvince }
export {
  formatPlaceParts,
  formatCityDistrict,
  formatProviderAddress,
} from './formatPlace'

function localFallback(error = null) {
  return {
    source: 'local',
    districts: NEPAL_DISTRICTS.map((d) => d.name),
    cities: [...NEPAL_MAJOR_CITIES],
    provinces: [...NEPAL_PROVINCES],
    ...(error ? { error } : {}),
  }
}

export async function fetchNepalAddressLookup({ placeType = null, limit = 500 } = {}) {
  if (!isSupabaseConfigured) return localFallback()

  try {
    const client = requireSupabase()
    let q = client.from('v_nepal_address_lookup').select('place_type, name, district, city, facility_count').limit(limit)
    if (placeType) q = q.eq('place_type', placeType)
    const { data, error } = await q
    if (error) return localFallback(error.message)

    const rows = data || []
    const districts = [...new Set(rows.filter((r) => r.place_type === 'district').map((r) => r.name).filter(Boolean))].sort()
    const cities = [...new Set(rows.filter((r) => r.place_type === 'city').map((r) => r.name).filter(Boolean))].sort()

    return {
      source: 'registry',
      districts: districts.length ? districts : NEPAL_DISTRICTS.map((d) => d.name),
      cities: cities.length ? cities : [...NEPAL_MAJOR_CITIES],
      provinces: [...NEPAL_PROVINCES],
      rows,
    }
  } catch (err) {
    return localFallback(err?.message || String(err))
  }
}
