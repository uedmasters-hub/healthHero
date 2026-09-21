/**
 * Persistent outbox for failed / deferred sync ops.
 * Survives reloads; flushed when connectivity returns.
 */
import { BRAND_STORAGE } from '../../lib/brand'

const KEY = `${BRAND_STORAGE.syncPrefix}outbox.v1`
const MAX_ITEMS = 200

function read() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function write(items) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)))
}

export function listOutbox() {
  return read()
}

export function enqueueOutbox(job) {
  if (!job?.type) return null
  const items = read()
  const id = job.id || `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const next = {
    id,
    type: job.type,
    payload: job.payload || {},
    attempts: Number(job.attempts) || 0,
    createdAt: job.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  // Dedupe by logical identity so reconnect doesn't stack identical jobs
  const filtered = items.filter((item) => {
    if (item.type !== next.type) return true
    if (next.type === 'appointment.upsert') {
      return item.payload?.recordId !== next.payload?.recordId
    }
    if (next.type === 'profile.push') {
      return item.payload?.userId !== next.payload?.userId
    }
    if (next.type === 'notifications.upsert') {
      return item.payload?.notification?.id !== next.payload?.notification?.id
    }
    if (next.type === 'notifications.mark_read') {
      return JSON.stringify(item.payload?.ids || []) !== JSON.stringify(next.payload?.ids || [])
    }
    if (
      next.type === 'notifications.mark_all_read'
      || next.type === 'notifications.delete_all'
      || next.type === 'notifications.pull'
    ) {
      return item.payload?.userId !== next.payload?.userId
    }
    if (next.type === 'notifications.delete') {
      return item.payload?.id !== next.payload?.id
    }
    // Drop legacy bulk pushes
    if (next.type === 'notifications.push') return false
    return item.id !== next.id
  })
  if (next.type === 'notifications.push') {
    write(filtered)
    return null
  }
  filtered.push(next)
  write(filtered)
  return next
}

export function removeOutbox(id) {
  write(read().filter((item) => item.id !== id))
}

export function bumpOutboxAttempt(id) {
  const items = read().map((item) => (
    item.id === id
      ? { ...item, attempts: (item.attempts || 0) + 1, updatedAt: new Date().toISOString() }
      : item
  ))
  write(items)
}

export function clearOutbox() {
  write([])
}
