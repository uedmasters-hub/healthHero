/**
 * Healthcare centers repository — Supabase `healthcare_centers` + local fallback.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { healthcareCenters as LOCAL_CENTERS } from '../../data/centers'

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

export function getCenters() {
  return cache.slice()
}

export async function hydrateCenters() {
  if (hydrated || !isSupabaseConfigured) return cache
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('healthcare_centers')
      .select('id, name, type, address_line1, city, phone, image_url, rating_avg, source_key, external_ref')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    if (data?.length) {
      cache = data.map((row) => ({
        id: row.source_key || row.external_ref || row.id,
        providerUuid: row.id,
        name: row.name,
        type: row.type || 'hospital',
        address: [row.address_line1, row.city].filter(Boolean).join(', '),
        city: row.city || '',
        phone: row.phone || '',
        image: row.image_url || '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
        rating: Number(row.rating_avg) || 4.5,
        sourceKey: row.source_key,
      }))
    }
    hydrated = true
  } catch (err) {
    console.warn('[centers] hydrate failed', err?.message || err)
    hydrated = true
  }
  return cache
}
