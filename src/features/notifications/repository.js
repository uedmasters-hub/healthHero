/**
 * Per-user notification cache. Authenticated users never share a bucket.
 * Remote (Supabase) is SSOT when online; this is only a mirror.
 */
import { BRAND_STORAGE } from '../../lib/brand'

const LEGACY_KEY = BRAND_STORAGE.notifications

let ownerId = null // null = anonymous demo bucket

function storageKey() {
  return ownerId
    ? `${LEGACY_KEY}:user:${ownerId}`
    : `${LEGACY_KEY}:anon`
}

function read() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey()) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function write(notifications) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKey(), JSON.stringify(notifications))
}

export function getOwner() {
  return ownerId
}

/**
 * Switch cache scope. Does not migrate cross-user data — each account
 * has its own key so badges cannot leak between sessions.
 */
export function setOwner(userId) {
  ownerId = userId || null
}

export function getAll() {
  return read()
}

export function getById(id) {
  return read().find((n) => n.id === id) || null
}

export function save(notifications) {
  write(Array.isArray(notifications) ? notifications : [])
}

export function replaceAll(notifications) {
  write(Array.isArray(notifications) ? notifications : [])
  return read()
}

export function append(notification) {
  const list = read()
  list.unshift(notification)
  write(list)
  return list
}

export function update(id, patch) {
  const list = read().map((n) => (n.id === id ? { ...n, ...patch } : n))
  write(list)
  return list
}

export function remove(id) {
  const list = read().filter((n) => n.id !== id)
  write(list)
  return list
}

export function clear() {
  write([])
  return []
}

export function getUnreadCount() {
  return read().filter((n) => n.unread).length
}

/** Drop legacy device-global key so it cannot re-inflate unread. */
export function purgeLegacyGlobalKey() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(LEGACY_KEY)
    if (BRAND_STORAGE.notificationsLegacy) {
      localStorage.removeItem(BRAND_STORAGE.notificationsLegacy)
    }
  } catch { /* ignore */ }
}
