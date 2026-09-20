import { isHomePath } from '../../lib/careFlow'

/**
 * In-app notification presentation modes.
 *   dock  — Home: slide in → hold → absorb into header bell
 *   toast — other screens: slide in → hold → slide out the way it entered
 *   quiet — critical flows: no floating UI; queue for later
 */
export const PRESENTATION_MODE = Object.freeze({
  DOCK: 'dock',
  TOAST: 'toast',
  QUIET: 'quiet',
})

/**
 * High-intent / linear flows where floating toasts must not interrupt.
 * Ordered for readability; first match wins via `some`.
 */
export const CRITICAL_FLOW_RULES = Object.freeze([
  (p) => p.startsWith('/chat'),
  (p) => p.startsWith('/booking'),
  (p) => p.startsWith('/process-payment'),
  (p) => p.startsWith('/verify-payment'),
  (p) => p.startsWith('/auth/confirm'),
  (p) => p.startsWith('/auth/callback'),
  (p) => p.startsWith('/verify'),
  (p) => p.startsWith('/otp'),
  (p) => p.startsWith('/video'),
  (p) => p.startsWith('/emergency'),
  (p) => p.startsWith('/prepare-visit'),
  (p) => p.startsWith('/pre-checkin'),
  (p) => p.startsWith('/cancel-checkin'),
  (p) => p.startsWith('/reschedule'),
  (p) => p.startsWith('/confirm-reschedule'),
  (p) => p.startsWith('/login'),
  (p) => p.startsWith('/register'),
  (p) => p.startsWith('/forgot'),
  (p) => p.startsWith('/reset'),
])

export function normalizePath(pathname) {
  if (!pathname) return '/'
  const bare = String(pathname).split('?')[0].split('#')[0]
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1)
  return bare || '/'
}

export function isCriticalFlowPath(pathname) {
  const path = normalizePath(pathname)
  return CRITICAL_FLOW_RULES.some((test) => test(path))
}

/**
 * Resolve presentation for a pathname (+ optional imperative quiet override).
 * Quiet wins over dock/toast so critical flows never flash a toast.
 */
export function resolvePresentationMode(pathname, { quietOverride = false } = {}) {
  if (quietOverride || isCriticalFlowPath(pathname)) {
    return PRESENTATION_MODE.QUIET
  }
  if (isHomePath(normalizePath(pathname))) {
    return PRESENTATION_MODE.DOCK
  }
  return PRESENTATION_MODE.TOAST
}
