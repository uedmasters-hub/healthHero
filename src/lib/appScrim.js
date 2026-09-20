/**
 * Global viewport scrim — ref-counted so many overlays can share one layer.
 * Mounted on #phone-screen so it covers status bar + app as one surface.
 */

let count = 0
let version = 0
let snapshot = { active: false, version: 0 }
let listeners = []
let clickListeners = []

function emit() {
  listeners.forEach((fn) => fn())
}

function refresh() {
  version += 1
  snapshot = { active: count > 0, version }
  emit()
}

export function subscribeAppScrim(onStoreChange) {
  listeners.push(onStoreChange)
  return () => {
    listeners = listeners.filter((l) => l !== onStoreChange)
  }
}

export function getAppScrimSnapshot() {
  return snapshot
}

export function acquireAppScrim() {
  count += 1
  refresh()
}

export function releaseAppScrim() {
  count = Math.max(0, count - 1)
  refresh()
}

export function subscribeScrimClick(fn) {
  clickListeners.push(fn)
  return () => {
    clickListeners = clickListeners.filter((l) => l !== fn)
  }
}

export function emitScrimClick() {
  clickListeners.forEach((fn) => fn())
}

/** Soft 12% black — calm healthcare dim (10–15% range). */
export const APP_SCRIM_COLOR = 'rgba(0, 0, 0, 0.12)'
