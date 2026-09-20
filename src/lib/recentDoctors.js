import { BRAND_STORAGE } from './brand'

const STORAGE_KEY = BRAND_STORAGE.recentDoctors
const LIMIT = 40

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
  } catch {
    return []
  }
}

export function getViewedDoctorIds() {
  return readIds()
}

export function isDoctorViewed(id) {
  return readIds().includes(Number(id))
}

export function markDoctorViewed(id) {
  const next = [Number(id), ...readIds().filter((item) => item !== Number(id))].slice(0, LIMIT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}
