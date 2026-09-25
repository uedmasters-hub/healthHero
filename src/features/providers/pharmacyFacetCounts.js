/**
 * Live facet counts for pharmacy discovery filter sheets.
 * Count-only Supabase head queries — same filters as list discovery.
 */
import {
  ALL_NEPAL_LOCATION,
  NEPAL_LOCATION_OPTIONS,
  isAllNepalLocation,
} from '../../data/nepalGeography'
import {
  countPharmacies,
  PHARMACY_TYPE_FILTERS,
} from './pharmaciesRepository'

const FACET_TTL_MS = 90_000
/** @type {Map<string, { at: number, counts: Record<string, number> }>} */
const facetCache = new Map()

function normalizeBase({
  city = null,
  q = '',
  type = 'all',
} = {}) {
  return {
    city: isAllNepalLocation(city) ? null : city,
    q: String(q || '').trim(),
    type: type && type !== 'all' ? type : 'all',
  }
}

function facetCacheKey(facet, base) {
  return [
    facet,
    base.city || '',
    base.q || '',
    base.type || 'all',
  ].join('|')
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

async function buildLocationCounts(base, onPartial) {
  const options = NEPAL_LOCATION_OPTIONS
  const counts = {}
  await mapPool(options, 6, async (name) => {
    const total = (name === ALL_NEPAL_LOCATION || isAllNepalLocation(name))
      ? await countPharmacies({ q: base.q, type: base.type, city: ALL_NEPAL_LOCATION })
      : await countPharmacies({ q: base.q, type: base.type, city: name })
    counts[name] = total || 0
    onPartial?.({ ...counts })
    return total
  })
  return counts
}

async function buildTypeCounts(base, onPartial) {
  const options = PHARMACY_TYPE_FILTERS
  const counts = {}
  await mapPool(options, 4, async (opt) => {
    const total = await countPharmacies({
      q: base.q,
      city: base.city || ALL_NEPAL_LOCATION,
      type: opt.id,
    })
    counts[opt.id] = total || 0
    counts[opt.label] = total || 0
    onPartial?.({ ...counts })
    return total
  })
  return counts
}

/** Synchronous cache read — skip skeletons when reopening the same context. */
export function peekPharmacyFilterFacets(facet, context = {}) {
  if (facet === 'sort') return null
  const base = normalizeBase(context)
  const key = facetCacheKey(facet, base)
  const hit = facetCache.get(key)
  if (!hit || Date.now() - hit.at >= FACET_TTL_MS) return null
  return { ...hit.counts }
}

/**
 * Live option → count map for a pharmacy filter sheet.
 * @param {'location'|'type'} facet
 * @param {{ city?: string|null, q?: string, type?: string }} context
 * @param {{ onPartial?: (counts: Record<string, number>) => void }} [opts]
 */
export async function fetchPharmacyFilterFacets(facet, context = {}, opts = {}) {
  if (facet === 'sort') return {}

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
  if (facet === 'location') counts = await buildLocationCounts(base, onPartial)
  else if (facet === 'type') counts = await buildTypeCounts(base, onPartial)

  facetCache.set(key, { at: Date.now(), counts })
  return { ...counts }
}

export function clearPharmacyFilterFacetCache() {
  facetCache.clear()
}
