/**
 * In-app notifications service.
 *
 * Authenticated: Supabase is SSOT. Local cache is a per-user mirror.
 * Anonymous DEV only: optional seed for UI demos — never pushed remotely.
 */
import { createNotification, sortByNewest, Types, Priority } from './models'
import { MAX_NOTIFICATIONS, AUTO_GENERATE_INTERVAL_MS, SEED_KEY } from './constants'
import * as repo from './repository'
import { emitIncoming } from './island'
import {
  upsertRemoteNotification,
  markRemoteRead,
  markAllRemoteRead,
  deleteRemoteNotification,
  deleteAllRemote,
} from './remote'
import { isOnline } from '../sync/connectivity'
import { enqueueOutbox } from '../sync/outbox'
import { isSupabaseConfigured } from '../../lib/supabase'

let listeners = []
let autoTimer = null
let pullGeneration = 0
let bound = false
const pendingReadIds = new Set()
let pendingMarkAllRead = false
let pendingDeleteIds = new Set()
let pendingDeleteAll = false

function notify() {
  const notifications = repo.getAll().map((n) => ({ ...n }))
  const unreadCount = notifications.filter((n) => n.unread).length
  const snapshot = { notifications, unreadCount }
  listeners.forEach((fn) => {
    try { fn(snapshot) } catch { /* ignore */ }
  })
  return snapshot
}

function prune(list) {
  if (list.length <= MAX_NOTIFICATIONS) return list
  const trimmed = list.slice(0, MAX_NOTIFICATIONS)
  repo.save(trimmed)
  return trimmed
}

function ownerId() {
  return repo.getOwner()
}

function enqueueMutation(type, payload) {
  const userId = ownerId()
  if (!userId) return
  enqueueOutbox({ type, payload: { userId, ...payload } })
  // Ask sync engine to flush when available (dynamic to avoid cycles).
  import('../sync/syncEngine').then((mod) => {
    try { mod.requestFlush?.() } catch { /* ignore */ }
  }).catch(() => {})
}

// ── Seed data (anonymous DEV only) ───────────────────────────────────────

const SEED_NOTIFICATIONS = [
  {
    title: 'Appointment tomorrow',
    body: 'Dr. Priya Sharma at 10:30 AM. Don\u2019t forget to complete pre-visit check-in.',
    type: Types.APPOINTMENT,
    priority: Priority.HIGH,
    to: '/appointment',
    minutesAgo: 2,
  },
  {
    title: 'Lab results ready',
    body: 'Your blood test from 20 Sep is available to review in your health records.',
    type: Types.RESULTS,
    priority: Priority.NORMAL,
    to: '/post-visit-summary',
    minutesAgo: 45,
  },
  {
    title: 'Booking confirmed',
    body: 'Your visit with Dr. Arjun Mehta is confirmed for Friday at 4:00 PM.',
    type: Types.BOOKING,
    priority: Priority.NORMAL,
    to: '/treat',
    minutesAgo: 4320,
  },
]

function seedAnonymousDemo() {
  if (!import.meta.env.DEV) return false
  if (ownerId()) return false
  if (typeof localStorage === 'undefined') return false
  if (localStorage.getItem(`${SEED_KEY}:anon`)) return false
  if (repo.getAll().length) {
    localStorage.setItem(`${SEED_KEY}:anon`, '1')
    return false
  }
  const now = Date.now()
  const notifications = SEED_NOTIFICATIONS.map((item) =>
    createNotification({
      title: item.title,
      body: item.body,
      type: item.type,
      priority: item.priority,
      to: item.to,
      unread: item.minutesAgo < 1440,
      timestamp: new Date(now - item.minutesAgo * 60 * 1000).toISOString(),
    }),
  ).sort(sortByNewest)
  repo.save(notifications)
  localStorage.setItem(`${SEED_KEY}:anon`, '1')
  return true
}

// ── Public service API ───────────────────────────────────────────────────

export function init() {
  repo.purgeLegacyGlobalKey()
  if (!bound) {
    // Before auth bind: show empty rather than leaking a global demo list.
    notify()
  }
}

/**
 * Bind cache to a user (or anon). Called by SyncEngine on session start/stop.
 * Authenticated users never seed or auto-generate.
 */
export function bindOwner(userId) {
  bound = true
  stopAutoGenerate()
  pullGeneration += 1
  pendingReadIds.clear()
  pendingMarkAllRead = false
  pendingDeleteIds.clear()
  pendingDeleteAll = false
  repo.setOwner(userId || null)
  repo.purgeLegacyGlobalKey()

  if (!userId) {
    seedAnonymousDemo()
    notify()
    return
  }
  // Show per-user cache immediately; reconcile overwrites from remote next.
  notify()
}

export function unbindOwner() {
  bindOwner(null)
}

/**
 * Replace local mirror with remote rows (authoritative).
 * Ignores stale responses via generation token.
 * Preserves in-flight local mutations so optimistic UI isn't clobbered.
 */
export function applyRemoteSnapshot(userId, rows, { generation } = {}) {
  if (userId && repo.getOwner() && userId !== repo.getOwner()) {
    return { ok: false, stale: true }
  }
  if (generation != null && generation !== pullGeneration) {
    return { ok: false, stale: true }
  }

  let list = (rows || []).slice(0, MAX_NOTIFICATIONS)

  if (pendingDeleteAll) {
    list = []
  } else {
    if (pendingDeleteIds.size) {
      list = list.filter((n) => !pendingDeleteIds.has(n.id))
    }
    if (pendingMarkAllRead) {
      list = list.map((n) => ({ ...n, unread: false }))
    } else if (pendingReadIds.size) {
      list = list.map((n) => (
        pendingReadIds.has(n.id) ? { ...n, unread: false } : n
      ))
    }
  }

  repo.replaceAll(list)
  notify()
  return { ok: true, count: list.length, unreadCount: list.filter((n) => n.unread).length }
}

export function beginPullGeneration() {
  pullGeneration += 1
  return pullGeneration
}

export function currentPullGeneration() {
  return pullGeneration
}

export function subscribe(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getAll() {
  return repo.getAll()
}

export function getUnreadCount() {
  return repo.getUnreadCount()
}

export function refresh() {
  return notify()
}

export function markRead(id) {
  if (!id) return
  const item = repo.getById(id)
  if (!item || !item.unread) return
  pendingReadIds.add(id)
  repo.update(id, { unread: false, readAt: new Date().toISOString() })
  notify()

  const userId = ownerId()
  if (!userId) {
    pendingReadIds.delete(id)
    return
  }

  const clearPending = () => pendingReadIds.delete(id)

  if (isOnline() && isSupabaseConfigured) {
    markRemoteRead(userId, [id]).then((result) => {
      if (!result?.ok) enqueueMutation('notifications.mark_read', { ids: [id] })
      else clearPending()
    }).catch(() => {
      enqueueMutation('notifications.mark_read', { ids: [id] })
    })
  } else {
    enqueueMutation('notifications.mark_read', { ids: [id] })
  }
}

export function markAllRead() {
  const list = repo.getAll()
  if (!list.some((n) => n.unread)) return
  pendingMarkAllRead = true
  const now = new Date().toISOString()
  repo.save(list.map((n) => ({ ...n, unread: false, readAt: n.readAt || now })))
  notify()

  const userId = ownerId()
  if (!userId) {
    pendingMarkAllRead = false
    return
  }

  if (isOnline() && isSupabaseConfigured) {
    markAllRemoteRead(userId).then((result) => {
      if (!result?.ok) enqueueMutation('notifications.mark_all_read', {})
      else pendingMarkAllRead = false
    }).catch(() => {
      enqueueMutation('notifications.mark_all_read', {})
    })
  } else {
    enqueueMutation('notifications.mark_all_read', {})
  }
}

export function clearNotification(id) {
  if (!id) return
  pendingDeleteIds.add(id)
  repo.remove(id)
  notify()

  const userId = ownerId()
  if (!userId) {
    pendingDeleteIds.delete(id)
    return
  }

  if (isOnline() && isSupabaseConfigured) {
    deleteRemoteNotification(userId, id).then((result) => {
      if (!result?.ok) enqueueMutation('notifications.delete', { id })
      else pendingDeleteIds.delete(id)
    }).catch(() => {
      enqueueMutation('notifications.delete', { id })
    })
  } else {
    enqueueMutation('notifications.delete', { id })
  }
}

export function clearAll() {
  pendingDeleteAll = true
  repo.clear()
  notify()

  const userId = ownerId()
  if (!userId) {
    pendingDeleteAll = false
    return
  }

  if (isOnline() && isSupabaseConfigured) {
    deleteAllRemote(userId).then((result) => {
      if (!result?.ok) enqueueMutation('notifications.delete_all', {})
      else pendingDeleteAll = false
    }).catch(() => {
      enqueueMutation('notifications.delete_all', {})
    })
  } else {
    enqueueMutation('notifications.delete_all', {})
  }
}

export function pushNotification(data) {
  const notification = createNotification(data)
  prune(repo.append(notification))
  emitIncoming(notification)
  notify()

  const userId = ownerId()
  if (!userId) return notification

  if (isOnline() && isSupabaseConfigured) {
    upsertRemoteNotification(userId, notification).then((result) => {
      if (result?.ok && result.row?.id) {
        repo.update(notification.id, { remoteId: result.row.id })
      } else if (!result?.ok) {
        enqueueMutation('notifications.upsert', { notification })
      }
    })
  } else {
    enqueueMutation('notifications.upsert', { notification })
  }
  return notification
}

export function startAutoGenerate() {
  // Disabled — fake generators previously inflated unread across devices.
  stopAutoGenerate()
}

export function stopAutoGenerate() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

export function clearPendingRead(ids = []) {
  ids.forEach((id) => pendingReadIds.delete(id))
}

export function clearPendingMarkAllRead() {
  pendingMarkAllRead = false
}

export function clearPendingDelete(id) {
  if (id) pendingDeleteIds.delete(id)
}

export function clearPendingDeleteAll() {
  pendingDeleteAll = false
}

export function destroy() {
  stopAutoGenerate()
  listeners = []
  bound = false
  pendingReadIds.clear()
  pendingMarkAllRead = false
  pendingDeleteIds.clear()
  pendingDeleteAll = false
}
