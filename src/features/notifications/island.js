/**
 * In-app notification island store.
 * Queue is durable (survives late subscribers). Pending IDs defer the bell badge.
 * dockPreparing brings the header bell in before the card absorbs.
 *
 * Presentation modes (set by NotificationPresentationSync):
 *   dock  — Home absorb-into-bell
 *   toast — slide out upward
 *   quiet — critical flows; hold for later (unread still updates via service notify)
 */

import { PRESENTATION_MODE } from './presentation'

let pendingIds = new Set()
let queue = []
/** Held during quiet/critical flows — flushed when presentation leaves quiet. */
let heldQueue = []
let listeners = []
let landListeners = []
let dockPreparing = false
let presentationMode = PRESENTATION_MODE.DOCK
let version = 0
let snapshot = makeSnapshot()

function makeSnapshot() {
  return {
    pendingCount: pendingIds.size,
    queueLength: queue.length,
    heldLength: heldQueue.length,
    dockPreparing,
    presentationMode,
    version,
  }
}

function refreshSnapshot() {
  snapshot = makeSnapshot()
}

function emit() {
  listeners.forEach((fn) => fn())
}

function bump() {
  version += 1
  refreshSnapshot()
  emit()
}

export function subscribeIslandStore(onStoreChange) {
  listeners.push(onStoreChange)
  return () => {
    listeners = listeners.filter((l) => l !== onStoreChange)
  }
}

/** Stable snapshot reference until the store bumps. */
export function getIslandSnapshot() {
  return snapshot
}

/**
 * Sync route/flow presentation mode.
 * Leaving quiet flushes held notifications into the display queue.
 */
export function setPresentationMode(mode) {
  const next = mode || PRESENTATION_MODE.TOAST
  if (next === presentationMode) return

  const wasQuiet = presentationMode === PRESENTATION_MODE.QUIET
  presentationMode = next

  if (next === PRESENTATION_MODE.QUIET) {
    // Park unshown cards so they don't interrupt the critical flow.
    if (queue.length > 0) {
      heldQueue.push(...queue)
      queue = []
    }
    dockPreparing = false
  } else if (wasQuiet && heldQueue.length > 0) {
    flushHeldIntoQueue()
  }

  bump()
}

export function getPresentationMode() {
  return presentationMode
}

function flushHeldIntoQueue() {
  // Unread already counted during quiet — present visually without re-deferring badge.
  while (heldQueue.length > 0) {
    queue.push(heldQueue.shift())
  }
}

/** Called by NotificationService for each new unread notification. */
export function emitIncoming(notification) {
  if (!notification?.id || notification.unread === false) return

  if (presentationMode === PRESENTATION_MODE.QUIET) {
    // Silent: unread updates via service notify(); toast waits until flow exits.
    heldQueue.push(notification)
    bump()
    return
  }

  pendingIds.add(notification.id)
  queue.push(notification)
  bump()
}

export function getPendingCount() {
  return pendingIds.size
}

export function subscribePending(onStoreChange) {
  return subscribeIslandStore(onStoreChange)
}

/** Pull next queued notification (FIFO). */
export function shiftQueue() {
  if (queue.length === 0) return null
  if (presentationMode === PRESENTATION_MODE.QUIET) return null
  const next = queue.shift()
  bump()
  return next
}

/** Reveal header capsule + bell (no badge) before the card flies home. */
export function requestDockBell() {
  if (dockPreparing) return
  dockPreparing = true
  bump()
}

export function clearDockBell() {
  if (!dockPreparing) return
  dockPreparing = false
  bump()
}

export function settlePending(id) {
  if (!id || !pendingIds.has(id)) {
    if (dockPreparing) {
      dockPreparing = false
      bump()
    }
    return
  }
  pendingIds.delete(id)
  dockPreparing = false
  bump()
}

export function subscribeBellLand(fn) {
  landListeners.push(fn)
  return () => {
    landListeners = landListeners.filter((l) => l !== fn)
  }
}

export function emitBellLand() {
  landListeners.forEach((fn) => fn())
}

export const ISLAND_MOTION = Object.freeze({
  ENTER_MS: 520,
  /** Visible pause before dock absorb or toast slide-out (2.5–3s). */
  HOLD_MS: 2750,
  TOAST_HOLD_MS: 2800,
  /** Wait for shell + bell enter before starting the fly-home. */
  DOCK_PREP_MS: 820,
  ABSORB_MS: 620,
  DISMISS_MS: 280,
  TOAST_EXIT_MS: 420,
  BADGE_DELAY_MS: 100,
  SWIPE_THRESHOLD_PX: 42,
  /** Card stays fully opaque until this progress, then dissolves into the bell. */
  DISSOLVE_AFTER: 0.9,
})
