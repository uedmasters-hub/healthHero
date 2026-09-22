/**
 * Healthcare centers repository — Supabase `healthcare_centers` + local fallback.
 * HF registry is large; client keeps a browse window and searches remotely.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { healthcareCenters as LOCAL_CENTERS } from '../../data/centers'
import { fetchAllPages } from './fetchPages'
import { formatProviderAddress, formatPlaceParts } from '../geography/formatPlace'

const BROWSE_CAP = 800

let cache = LOCAL_CENTERS.map((c) => ({
  id: c.id,
  name: c.name,
  type: c.type || 'hospital',
  address: c.address,
  city: c.city,
  phone: c.phone,
  image: c.image,
  rating: c.rating,
  sourceKey: c.id,
}))
let hydrated = false
let hydratePromise = null

function normalizeRow(row) {
  const city = row.city || ''
  const district = row.district || ''
  return {
    id: row.hf_code || row.source_key || row.external_ref || row.id,
    providerUuid: row.id,
    hfCode: row.hf_code || null,
    name: row.name,
    type: row.type || 'hospital',
    facilityLevel: row.facility_level || null,
    address: formatProviderAddress({
      addressLine1: row.address_line1,
      city,
      district,
    }) || formatPlaceParts(city, district),
    city: formatPlaceParts(city) || formatPlaceParts(district),
    district: formatPlaceParts(district) || formatPlaceParts(city),
    phone: row.phone || '',
    image: row.image_url || '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
    rating: Number(row.rating_avg) || 4.5,
    sourceKey: row.source_key,
    externalRef: row.external_ref,
  }
}

const CENTER_SELECT = 'id, name, type, address_line1, city, phone, image_url, rating_avg, source_key, external_ref, hf_code, facility_level, district, verification_status'

export function getCenters() {
  return cache.slice()
}

export async function hydrateCenters({ force = false } = {}) {
  if ((hydrated && !force) || (!force && hydratePromise)) {
    return hydratePromise || cache
  }
  if (!isSupabaseConfigured) {
    hydrated = true
    return cache
  }

  hydratePromise = (async () => {
    try {
      const sb = requireSupabase()
      const rows = await fetchAllPages(
        (from, to) => sb
          .from('v_healthcare_centers_public')
          .select(CENTER_SELECT)
          .order('name')
          .range(from, to),
        { maxRows: BROWSE_CAP },
      )
      if (rows.length) {
        cache = rows.map(normalizeRow)
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

export async function searchCenters(query, { limit = 40 } = {}) {
  const q = String(query || '').trim()
  if (!q || !isSupabaseConfigured) {
    const lower = q.toLowerCase()
    return getCenters().filter((c) => (
      !q
      || c.name.toLowerCase().includes(lower)
      || String(c.hfCode || '').includes(q)
      || String(c.city || '').toLowerCase().includes(lower)
    )).slice(0, limit)
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('v_healthcare_centers_public')
      .select(CENTER_SELECT)
      .or(`name.ilike.%${q}%,hf_code.ilike.%${q}%,city.ilike.%${q}%,district.ilike.%${q}%,facility_level.ilike.%${q}%`)
      .order('name')
      .limit(limit)
    if (error) throw error
    return (data || []).map(normalizeRow)
  } catch (err) {
    console.warn('[centers] search failed', err?.message || err)
    return []
  }
}
