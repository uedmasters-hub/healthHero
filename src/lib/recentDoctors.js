import { BRAND_STORAGE } from './brand'

const STORAGE_KEY = BRAND_STORAGE.recentDoctors
const LIMIT = 40

function normalizeId(id) {
  if (id == null || id === '') return null
  return String(id)
}

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeId).filter(Boolean)
  } catch {
    return []
  }
}

export function getViewedDoctorIds() {
  return readIds()
}

export function isDoctorViewed(id) {
  const key = normalizeId(id)
  return key ? readIds().includes(key) : false
}

export function markDoctorViewed(id) {
  const key = normalizeId(id)
  if (!key) return readIds()
  const next = [key, ...readIds().filter((item) => item !== key)].slice(0, LIMIT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}
