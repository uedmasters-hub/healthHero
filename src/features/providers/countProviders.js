/**
 * Count-only provider queries for filter facet previews.
 * Kept separate from the list repository surface so facetCounts can stay lean.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { specialtyOrClause } from './specialtyMatch'
import { getDoctorList } from './repository'

const COUNT_TTL_MS = 60_000
/** @type {Map<string, { at: number, total: number }>} */
const countCache = new Map()

function escapeIlike(value) {
  return String(value).replace(/[%(),]/g, '')
}

function isNationwideLocation(value) {
  const key = String(value || '').trim().toLowerCase()
  return !key || key === 'all' || key === 'all nepal' || key === 'nepal'
}

function locationOrClause(place) {
  if (isNationwideLocation(place)) return null
  const term = escapeIlike(place)
  if (!term) return null
  return `city.ilike.%${term}%,district.ilike.%${term}%,address_line1.ilike.%${term}%`
}

function normalizeOpts({
  specialty = null,
  q = '',
  city = null,
  district = null,
  ids = null,
} = {}) {
  const idList = Array.isArray(ids)
    ? [...new Set(ids.map((id) => String(id)).filter(Boolean))]
    : null
  return {
    specialty: specialty && specialty !== 'All' ? specialty : null,
    q: String(q || '').trim(),
    city: isNationwideLocation(city) ? null : city,
    district: isNationwideLocation(district) ? null : district,
    ids: idList?.length ? idList : null,
  }
}

function countCacheKey(opts) {
  return [
    opts.specialty || '',
    opts.q || '',
    opts.city || '',
    opts.district || '',
    opts.ids ? opts.ids.slice().sort().join(',') : '',
  ].join('|')
}

function applyCountFilters(qb, opts) {
  let next = qb.eq('provider_type', 'doctor')

  const specialtyClause = specialtyOrClause(opts.specialty)
  if (specialtyClause) next = next.or(specialtyClause)

  if (opts.q) {
    const term = escapeIlike(opts.q)
    next = next.or([
      `display_name.ilike.%${term}%`,
      `first_name.ilike.%${term}%`,
      `last_name.ilike.%${term}%`,
      `nmc_number.ilike.%${term}%`,
      `degree.ilike.%${term}%`,
      `city.ilike.%${term}%`,
      `district.ilike.%${term}%`,
      `primary_specialty.ilike.%${term}%`,
      `address_line1.ilike.%${term}%`,
    ].join(','))
  }

  const placeClause = locationOrClause(opts.city || opts.district)
  if (placeClause) next = next.or(placeClause)

  return next
}

function filterLocalList(opts) {
  const lower = (opts.q || '').toLowerCase()
  const place = (opts.city || opts.district || '').toLowerCase()
  const specialty = (opts.specialty || '').toLowerCase()
  let list = getDoctorList()

  if (opts.ids?.length) {
    const allow = new Set(opts.ids.map(String))
    list = list.filter((d) => allow.has(String(d.providerUuid || d.id)))
  }
  if (specialty) {
    list = list.filter((d) => (
      String(d.specialty || '').toLowerCase().includes(specialty)
      || String(d.degree || '').toLowerCase().includes(specialty)
    ))
  }
  if (lower) {
    list = list.filter((d) => (
      d.name.toLowerCase().includes(lower)
      || String(d.specialty || '').toLowerCase().includes(lower)
      || String(d.degree || '').toLowerCase().includes(lower)
      || String(d.city || '').toLowerCase().includes(lower)
      || String(d.district || '').toLowerCase().includes(lower)
      || String(d.nmcNumber || '').includes(lower)
    ))
  }
  if (place) {
    list = list.filter((d) => (
      String(d.city || '').toLowerCase().includes(place)
      || String(d.district || '').toLowerCase().includes(place)
      || String(d.address || '').toLowerCase().includes(place)
    ))
  }
  return list
}

export function filterLocalCount(opts = {}) {
  return filterLocalList(normalizeOpts(opts)).length
}

/**
 * Exact provider count for the given discovery filters (head-only when remote).
 * Optional `ids` limits to a provider UUID set (availability facets).
 */
export async function countProviders(rawOpts = {}) {
  const opts = normalizeOpts(rawOpts)
  const key = countCacheKey(opts)
  const hit = countCache.get(key)
  if (hit && Date.now() - hit.at < COUNT_TTL_MS) return hit.total

  if (!isSupabaseConfigured) {
    const total = filterLocalCount(opts)
    countCache.set(key, { at: Date.now(), total })
    return total
  }

  try {
    const sb = requireSupabase()
    // Chunk large id filters — PostgREST URL limits.
    if (opts.ids?.length > 120) {
      let total = 0
      for (let i = 0; i < opts.ids.length; i += 120) {
        const chunk = opts.ids.slice(i, i + 120)
        total += await countProviders({ ...opts, ids: chunk })
      }
      countCache.set(key, { at: Date.now(), total })
      return total
    }

    let qb = applyCountFilters(
      sb.from('v_provider_search').select('id', { count: 'exact', head: true }),
      opts,
    )
    if (opts.ids?.length) qb = qb.in('id', opts.ids)

    const { error, count } = await qb
    if (error) throw error
    const total = typeof count === 'number' ? count : 0
    countCache.set(key, { at: Date.now(), total })
    return total
  } catch (err) {
    console.warn('[providers] countProviders failed', err?.message || err)
    const total = filterLocalCount(opts)
    countCache.set(key, { at: Date.now(), total })
    return total
  }
}

export function clearProviderCountCache() {
  countCache.clear()
}
