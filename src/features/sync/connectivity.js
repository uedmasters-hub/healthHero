/**
 * Connectivity — single online/offline signal for the sync hub.
 */
const listeners = new Set()

let online = typeof navigator === 'undefined' ? true : navigator.onLine !== false

function emit() {
  listeners.forEach((fn) => {
    try { fn(online) } catch { /* ignore */ }
  })
}

function setOnline(next) {
  const value = Boolean(next)
  if (value === online) return
  online = value
  emit()
}

export function isOnline() {
  return online
}

export function subscribeConnectivity(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function startConnectivityMonitor() {
  if (typeof window === 'undefined') return () => {}
  const onOnline = () => setOnline(true)
  const onOffline = () => setOnline(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  setOnline(navigator.onLine !== false)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
