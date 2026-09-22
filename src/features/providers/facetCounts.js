/**
 * Live facet counts for doctor discovery filter sheets.
 * Count-only Supabase head queries — same filters as list discovery.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  ALL_NEPAL_LOCATION,
  NEPAL_LOCATION_OPTIONS,
} from '../../data/nepalGeography'
import { ALL_SPECIALISATIONS } from '../../data/specialisations'
import { countProviders } from './countProviders'

const FACET_TTL_MS = 90_000
/** @type {Map<string, { at: number, counts: Record<string, number> }>} */
const facetCache = new Map()

const AVAILABILITY_OPTIONS = ['All', 'Today', 'Tomorrow', 'This Week']

function isNationwideLocation(value) {
  const key = String(value || '').trim().toLowerCase()
  return !key || key === 'all' || key === 'all nepal' || key === 'nepal'
}

function normalizeBase({
  specialty = null,
  city = null,
  q = '',
  availability = null,
} = {}) {
  return {
    specialty: specialty && specialty !== 'All' ? specialty : null,
    city: isNationwideLocation(city) ? null : city,
    q: String(q || '').trim(),
    availability: availability && availability !== 'All' ? availability : null,
  }
}

function facetCacheKey(facet, base) {
  return [
    facet,
    base.specialty || '',
    base.city || '',
    base.q || '',
    base.availability || '',
  ].join('|')
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function availabilityWindow(option) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (option === 'Today') {
    return { from: isoDate(start), to: isoDate(start) }
  }
  if (option === 'Tomorrow') {
    const next = new Date(start)
    next.setDate(next.getDate() + 1)
    return { from: isoDate(next), to: isoDate(next) }
  }
  if (option === 'This Week') {
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { from: isoDate(start), to: isoDate(end) }
  }
  return null
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

async function fetchDistinctSlotProviders(from, to) {
  if (!isSupabaseConfigured) return []
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('available_slots')
      .select('provider_id')
      .eq('is_available', true)
      .gte('slot_date', from)
      .lte('slot_date', to)
      .limit(4000)
    if (error) throw error
    return [...new Set((data || []).map((row) => row.provider_id).filter(Boolean))]
  } catch (err) {
    console.warn('[providers] availability facet failed', err?.message || err)
    return []
  }
}

async function countAvailabilityOption(option, base) {
  if (option === 'All') {
    return countProviders({
      specialty: base.specialty,
      city: base.city,
      q: base.q,
    })
  }

  const window = availabilityWindow(option)
  if (!window) return 0

  const ids = await fetchDistinctSlotProviders(window.from, window.to)
  if (!ids.length) return 0
  return countProviders({
    specialty: base.specialty,
    city: base.city,
    q: base.q,
    ids,
  })
}

async function buildSpecialtyCounts(base, onPartial) {
  const options = ['All', ...ALL_SPECIALISATIONS.map((item) => item.name)]
  const counts = {}
  await mapPool(options, 6, async (name) => {
    const total = name === 'All'
      ? await countProviders({ city: base.city, q: base.q })
      : await countProviders({ specialty: name, city: base.city, q: base.q })
    counts[name] = total || 0
    onPartial?.({ ...counts })
    return total
  })
  return counts
}

async function buildLocationCounts(base, onPartial) {
  const options = NEPAL_LOCATION_OPTIONS
  const counts = {}
  await mapPool(options, 6, async (name) => {
    const total = (name === ALL_NEPAL_LOCATION || isNationwideLocation(name))
      ? await countProviders({ specialty: base.specialty, q: base.q })
      : await countProviders({ specialty: base.specialty, city: name, q: base.q })
    counts[name] = total || 0
    onPartial?.({ ...counts })
    return total
  })
  return counts
}

async function buildAvailabilityCounts(base, onPartial) {
  const counts = {}
  await mapPool(AVAILABILITY_OPTIONS, 4, async (name) => {
    const total = await countAvailabilityOption(name, base)
    counts[name] = total || 0
    onPartial?.({ ...counts })
    return total
  })
  return counts
}

/** Synchronous cache read — used to skip skeletons when reopening the same context. */
export function peekDoctorFilterFacets(facet, context = {}) {
  if (facet === 'Sort') return null
  const base = normalizeBase(context)
  const key = facetCacheKey(facet, base)
  const hit = facetCache.get(key)
  if (!hit || Date.now() - hit.at >= FACET_TTL_MS) return null
  return { ...hit.counts }
}

/**
 * Live option → count map for a filter sheet.
 * @param {'Specialties'|'Location'|'Availability'} facet
 * @param {{ specialty?: string|null, city?: string|null, q?: string, availability?: string|null }} context
 * @param {{ onPartial?: (counts: Record<string, number>) => void }} [opts]
 */
export async function fetchDoctorFilterFacets(facet, context = {}, opts = {}) {
  if (facet === 'Sort') return {}

  const base = normalizeBase(context)
  const key = facetCacheKey(facet, base)
  const hit = facetCache.get(key)
  if (hit && Date.now() - hit.at < FACET_TTL_MS) {
    opts.onPartial?.({ ...hit.counts })
    return { ...hit.counts }
  }

  const onPartial = (partial) => {
    facetCache.set(key, { at: Date.now(), counts: { ...partial } })
    opts.onPartial?.(partial)
  }

  let counts = {}
  if (facet === 'Specialties') counts = await buildSpecialtyCounts(base, onPartial)
  else if (facet === 'Location') counts = await buildLocationCounts(base, onPartial)
  else if (facet === 'Availability') counts = await buildAvailabilityCounts(base, onPartial)

  facetCache.set(key, { at: Date.now(), counts })
  return { ...counts }
}

export function clearDoctorFilterFacetCache() {
  facetCache.clear()
}

export { AVAILABILITY_OPTIONS }
