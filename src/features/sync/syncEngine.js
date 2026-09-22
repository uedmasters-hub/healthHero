/**
 * Central SyncEngine — bootstrap, outbox flush, connectivity, domain sync.
 * Local stores remain interactive SSOTs; Supabase is the durable mirror.
 */
import { isSupabaseConfigured } from '../../lib/supabase'
import { isOnline, startConnectivityMonitor, subscribeConnectivity } from './connectivity'
import { enqueueOutbox, listOutbox, removeOutbox, bumpOutboxAttempt } from './outbox'
import { runOutboxJob, handleNotificationsPull } from './domains'
import { migrateLocalDataToSupabase } from './localDataMigrator'
import { hydrateAppointmentsFromRemote } from '../../booking/appointmentSync'
import { hydrateProviders, hydratePharmacies } from '../providers'
import { hydrateCenters } from '../providers/centersRepository'
import { startRealtimeHub, stopRealtimeHub, restartRealtimeHub } from './realtimeHub'
import * as notifService from '../notifications/service'

export { mirrorAppointment, mirrorProfile } from './mirrors'

const listeners = new Set()

const state = {
  userId: null,
  sessionUser: null,
  status: 'idle', // idle | bootstrapping | ready | syncing | offline | error
  lastError: null,
  lastSyncedAt: null,
  online: isOnline(),
}

let snapshot = null

function buildSnapshot() {
  return {
    userId: state.userId,
    sessionUser: state.sessionUser,
    status: state.status,
    lastError: state.lastError,
    lastSyncedAt: state.lastSyncedAt,
    online: isOnline(),
    pending: listOutbox().length,
  }
}

function refreshSnapshot() {
  snapshot = buildSnapshot()
  return snapshot
}

refreshSnapshot()

function emit() {
  refreshSnapshot()
  listeners.forEach((fn) => {
    try { fn(snapshot) } catch { /* ignore */ }
  })
}

function setState(patch) {
  Object.assign(state, patch)
  emit()
}

let connectivityStop = null
let flushTimer = null
let flushInFlight = false
let bootstrapInFlight = null
let notifPullTimer = null

function scheduleNotificationPull(userId) {
  if (!userId) return
  if (typeof window === 'undefined') {
    handleNotificationsPull({ userId }).catch(() => {})
    return
  }
  if (notifPullTimer) window.clearTimeout(notifPullTimer)
  notifPullTimer = window.setTimeout(() => {
    notifPullTimer = null
    handleNotificationsPull({ userId }).catch(() => {})
  }, 800)
}

function handleNotificationRealtimeEvent(payload) {
  try {
    notifService.applyLiveChange(payload)
  } catch {
    // Fall back to reconcile if the payload can't be applied.
    if (state.userId) scheduleNotificationPull(state.userId)
  }
}

async function flushOutbox() {
  if (flushInFlight || !state.userId || !isOnline() || !isSupabaseConfigured) return
  const jobs = listOutbox()
  if (!jobs.length) return

  flushInFlight = true
  setState({ status: 'syncing' })
  try {
    for (const job of jobs) {
      const attempts = (job.attempts || 0) + 1
      bumpOutboxAttempt(job.id)
      const result = await runOutboxJob(job)
      if (result?.ok || result?.skipped) {
        removeOutbox(job.id)
      } else if (result?.deferred || !isOnline()) {
        break
      } else if (attempts >= 8) {
        removeOutbox(job.id)
      }
    }
    setState({
      status: isOnline() ? 'ready' : 'offline',
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    })
  } catch (err) {
    setState({
      status: isOnline() ? 'error' : 'offline',
      lastError: err?.message || String(err),
    })
  } finally {
    flushInFlight = false
  }
}

function scheduleFlush(delayMs = 400) {
  if (typeof window === 'undefined') return
  if (flushTimer) window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => {
    flushOutbox().catch(() => {})
  }, delayMs)
}

/**
 * Enqueue a durable job. Attempts immediate execution when online.
 */
export function enqueueSync(type, payload = {}) {
  const job = enqueueOutbox({ type, payload })
  emit()
  if (isOnline() && isSupabaseConfigured) scheduleFlush(120)
  return job
}

/** Prefer live sync; fall back to outbox when offline or failed. */
export async function syncNow(type, payload = {}) {
  if (!isOnline() || !isSupabaseConfigured) {
    return enqueueSync(type, payload)
  }
  const result = await runOutboxJob({ type, payload })
  if (!result?.ok && !result?.skipped) {
    return enqueueSync(type, payload)
  }
  return result
}

async function loadEngine() {
  const mod = await import('../../booking/engine')
  return mod.getBookingEngine()
}

async function hydrateProfile() {
  const mod = await import('../../user/store')
  return mod.hydrateProfileFromSupabase()
}

async function bootstrapSession(sessionUser) {
  if (!sessionUser?.id || !isSupabaseConfigured) return
  if (bootstrapInFlight) return bootstrapInFlight

  bootstrapInFlight = (async () => {
    setState({ status: 'bootstrapping', userId: sessionUser.id, sessionUser, lastError: null })
    try {
      // Scope notification cache to this user before any pull/push.
      notifService.bindOwner(sessionUser.id)

      await migrateLocalDataToSupabase(sessionUser).catch(() => {})
      await hydrateProfile().catch(() => {})

      const engine = await loadEngine()
      if (engine?.getUserId?.() === sessionUser.id || !engine?.getUserId?.()) {
        await hydrateAppointmentsFromRemote(engine, sessionUser.id).catch(() => {})
      }

      // Remote is SSOT — replace local mirror; never bulk-push local seed/unread.
      await handleNotificationsPull({ userId: sessionUser.id }).catch(() => {})

      startRealtimeHub({
        userId: sessionUser.id,
        onAppointmentsChange: async () => {
          const eng = await loadEngine()
          hydrateAppointmentsFromRemote(eng, sessionUser.id).catch(() => {})
        },
        onNotificationEvent: (payload) => {
          handleNotificationRealtimeEvent(payload)
        },
      })

      await flushOutbox()
      setState({
        status: isOnline() ? 'ready' : 'offline',
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (err) {
      setState({
        status: 'error',
        lastError: err?.message || String(err),
      })
    } finally {
      bootstrapInFlight = null
    }
  })()

  return bootstrapInFlight
}

export function startSyncSession(sessionUser) {
  if (!sessionUser?.id) {
    stopSyncSession()
    return
  }
  if (state.userId === sessionUser.id && (state.status === 'ready' || state.status === 'bootstrapping' || state.status === 'syncing')) {
    return
  }
  bootstrapSession(sessionUser).catch(() => {})
}

export function stopSyncSession() {
  stopRealtimeHub()
  bootstrapInFlight = null
  notifService.unbindOwner()
  setState({
    userId: null,
    sessionUser: null,
    status: 'idle',
    lastError: null,
  })
}

export function startSyncRuntime() {
  if (typeof window === 'undefined') return () => {}
  if (!connectivityStop) {
    connectivityStop = startConnectivityMonitor()
  }
  const unsub = subscribeConnectivity((online) => {
    setState({ online, status: online ? (state.userId ? 'ready' : 'idle') : 'offline' })
    if (online && state.userId) {
      scheduleFlush(200)
      restartRealtimeHub()
      scheduleNotificationPull(state.userId)
      if (state.status === 'idle' || state.status === 'error') {
        bootstrapSession(state.sessionUser).catch(() => {})
      }
    }
  })

  const onVisibility = () => {
    if (typeof document === 'undefined') return
    if (document.visibilityState !== 'visible') return
    if (!state.userId || !isOnline()) return
    restartRealtimeHub()
    scheduleNotificationPull(state.userId)
    scheduleFlush(100)
  }
  window.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onVisibility)

  hydrateProviders().catch(() => {})
  hydrateCenters().catch(() => {})
  hydratePharmacies().catch(() => {})

  return () => {
    unsub()
    window.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onVisibility)
    if (connectivityStop) {
      connectivityStop()
      connectivityStop = null
    }
    stopSyncSession()
  }
}

export function getSyncState() {
  return snapshot || refreshSnapshot()
}

export function subscribeSync(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function requestFlush() {
  scheduleFlush(0)
}
