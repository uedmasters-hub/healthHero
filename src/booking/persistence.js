/** Local persistence adapter — swap for API client later */

import { ENGINE_VERSION, STORAGE_KEYS } from './constants'
import { reviveBookingRecord, serializeBookingRecord } from './models'

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function createLocalPersistence({
  dbKey = STORAGE_KEYS.DB,
  activeKey = STORAGE_KEYS.ACTIVE_ID,
} = {}) {
  return {
    load() {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(dbKey) : null
      const parsed = raw ? safeParse(raw) : null
      if (!parsed || !Array.isArray(parsed.bookings)) {
        return {
          version: ENGINE_VERSION,
          bookings: [],
          activeBookingId: null,
        }
      }
      const activeFromDb = parsed.activeBookingId || null
      const activeFromKey =
        typeof localStorage !== 'undefined' ? localStorage.getItem(activeKey) : null
      return {
        version: parsed.version || ENGINE_VERSION,
        bookings: parsed.bookings.map(reviveBookingRecord).filter(Boolean),
        activeBookingId: activeFromKey || activeFromDb,
      }
    },

    save(state) {
      if (typeof localStorage === 'undefined') return
      const payload = {
        version: ENGINE_VERSION,
        activeBookingId: state.activeBookingId || null,
        bookings: (state.bookings || []).map(serializeBookingRecord),
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(dbKey, JSON.stringify(payload))
      if (state.activeBookingId) localStorage.setItem(activeKey, state.activeBookingId)
      else localStorage.removeItem(activeKey)
    },

    clear() {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(dbKey)
      localStorage.removeItem(activeKey)
    },
  }
}
