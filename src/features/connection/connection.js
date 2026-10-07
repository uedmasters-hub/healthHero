/**
 * @file src/features/connection/connection.js
 * Global connection state: online / offline from browser events, "slow" from
 * the Network Information API and from real request timings reported by the
 * Supabase fetch wrapper. One store, read with useConnection().
 */
import { useSyncExternalStore } from 'react'

const SLOW_REQUEST_MS = 5000
const SLOW_HOLD_MS = 45000
const PROBE_TIMEOUT_MS = 5000
const SLOW_TYPES = new Set(['slow-2g', '2g'])

const listeners = new Set()
let slowUntil = 0
let slowTimer = null

function networkInfo() {
  return typeof navigator !== 'undefined' ? navigator.connection || null : null
}

function computeSlow() {
  const info = networkInfo()
  return Date.now() < slowUntil || Boolean(info && SLOW_TYPES.has(info.effectiveType))
}

let snapshot = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  slow: computeSlow(),
  changedAt: 0,
}

function emit(patch) {
  const next = { ...snapshot, ...patch }
  if (next.online === snapshot.online && next.slow === snapshot.slow) return
  snapshot = { ...next, changedAt: Date.now() }
  listeners.forEach((listener) => listener())
}

function refreshSlow() {
  emit({ slow: snapshot.online && computeSlow() })
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => emit({ online: true, slow: computeSlow() }))
  window.addEventListener('offline', () => emit({ online: false, slow: false }))
  networkInfo()?.addEventListener?.('change', refreshSlow)
}

/** Called by the Supabase fetch wrapper with each request's wall time. */
export function reportRequestTiming(ms) {
  if (ms < SLOW_REQUEST_MS) return
  slowUntil = Date.now() + SLOW_HOLD_MS
  clearTimeout(slowTimer)
  slowTimer = setTimeout(refreshSlow, SLOW_HOLD_MS + 50)
  refreshSlow()
}

export function reportRequestFailure() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) emit({ online: false, slow: false })
}

/** Active probe against our own origin (no auth, no cache). Resolves to `online`. */
export async function checkConnection() {
  if (typeof window === 'undefined') return true
  try {
    const res = await fetch(`/manifest.webmanifest?ping=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(PROBE_TIMEOUT_MS) : undefined,
    })
    const online = res.ok || res.status < 500
    emit({ online, slow: online && computeSlow() })
    return online
  } catch {
    emit({ online: false, slow: false })
    return false
  }
}

export function getConnection() {
  return snapshot
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useConnection() {
  return useSyncExternalStore(subscribe, getConnection, getConnection)
}
