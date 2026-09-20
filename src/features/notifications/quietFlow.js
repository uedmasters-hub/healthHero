/**
 * Imperative quiet-flow override (ref-counted).
 * Use when a critical experience is not fully expressed by the route
 * (e.g. modal OTP, emergency sheet over a non-critical path).
 */

let quietDepth = 0
let listeners = []

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribeQuietOverride(onChange) {
  listeners.push(onChange)
  return () => {
    listeners = listeners.filter((l) => l !== onChange)
  }
}

export function getQuietOverride() {
  return quietDepth > 0
}

/** Enter a critical / focused flow — floating toasts pause until exit. */
export function enterQuietFlow() {
  quietDepth += 1
  if (quietDepth === 1) emit()
  return () => exitQuietFlow()
}

export function exitQuietFlow() {
  if (quietDepth <= 0) return
  quietDepth -= 1
  if (quietDepth === 0) emit()
}

/** Force-clear (e.g. on hard navigation / logout). */
export function resetQuietFlow() {
  if (quietDepth === 0) return
  quietDepth = 0
  emit()
}
