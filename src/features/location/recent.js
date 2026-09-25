/**
 * Pure MRU helpers for recent locations (no I/O).
 */
import {
  LOCATION_RECENTS_MAX,
  locationIdentity,
  canonicalLocality,
} from './constants'

function asRecentEntry(item) {
  if (!item) return null
  const locality = canonicalLocality(item) || String(item.locality || '').trim()
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)
  if (!locality || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    locality,
    latitude,
    longitude,
    source: item.source || 'manual',
    placeId: item.placeId || item.id || null,
    at: item.at || new Date().toISOString(),
  }
}

/**
 * Deduplicate an existing history list (migration / load path).
 * Keeps first occurrence order (already MRU-sorted lists stay newest-first).
 */
export function dedupeRecentList(list, { limit = LOCATION_RECENTS_MAX } = {}) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const entry = asRecentEntry(raw)
    if (!entry) continue
    const key = locationIdentity(entry)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(entry)
    if (out.length >= limit) break
  }
  return out
}

/**
 * MRU insert: drop any matching identity, prepend the new entry, cap length.
 */
export function normalizeRecent(list, entry) {
  const nextEntry = asRecentEntry({
    ...entry,
    at: new Date().toISOString(),
  })
  if (!nextEntry) return dedupeRecentList(list)

  const nextKey = locationIdentity(nextEntry)
  const filtered = dedupeRecentList(list).filter((item) => locationIdentity(item) !== nextKey)
  return [nextEntry, ...filtered].slice(0, LOCATION_RECENTS_MAX)
}

export function pushRecentLocation(cache, entry) {
  if (!entry?.locality || !Number.isFinite(Number(entry.latitude))) {
    return dedupeRecentList(cache?.recent)
  }
  return normalizeRecent(cache?.recent, entry)
}
