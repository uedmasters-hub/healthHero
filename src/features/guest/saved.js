/**
 * Articles a guest saves before a patient record exists.
 * Migrated into the signed-in chart by adoptGuestSavedInsights.
 */
import { recordGuestEvent } from './activity'

const KEY = 'emedicalls.guest.savedInsights'

export function readGuestSavedInsights() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function writeGuestSavedInsights(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* private mode */
  }
}

export function toggleGuestSavedInsight(id) {
  const key = String(id || '')
  if (!key) return false
  const current = readGuestSavedInsights()
  const has = current.includes(key)
  writeGuestSavedInsights(has ? current.filter((item) => item !== key) : [key, ...current])
  recordGuestEvent({
    eventType: has ? 'unsave' : 'save',
    entityType: 'insight',
    entityId: key,
    dedupeKey: `insight|${key}|${has ? 'unsave' : 'save'}`,
  }).catch(() => {})
  return !has
}

export function clearGuestSavedInsights() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
