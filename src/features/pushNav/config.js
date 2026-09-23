import { MOTION } from '../../lib/motion'

/**
 * Routes that use horizontal push / mirrored-pop navigation.
 * Tabs, sheets, and overlays are excluded. Booking steps are sibling push
 * screens so each stays mounted as an underlay for native pop.
 */

const TAB_ROOTS = new Set([
  '/',
  '/search',
  '/treat',
  '/pharmacy',
  '/centers',
  '/calendar',
  '/settings',
])

/** Ordered matchers — first hit wins. */
const PUSH_DETAIL_RULES = Object.freeze([
  (p) => p === '/profile' || p.startsWith('/profile/'),
  (p) => p.startsWith('/doctor/'),
  (p) => p.startsWith('/centers/'),
  (p) => p.startsWith('/pharmacy/'),
  (p) => p.startsWith('/insights/'),
  (p) => p === '/notifications',
  (p) => p.startsWith('/explore/'),
  (p) => p === '/booking' || p.startsWith('/booking/'),
  (p) => p === '/appointment',
  (p) => p === '/pre-checkin',
  (p) => p === '/prepare-visit',
  (p) => p === '/post-visit-summary',
  (p) => p === '/chat' || p.startsWith('/chat/'),
])

export const PUSH_MOTION = Object.freeze({
  /** Calm iOS-style ease — no overshoot (y2 ≤ 1). */
  DURATION_MS: MOTION.PAGE_MS,
  EASING: MOTION.EASE,
  UNDERLAY_SCALE: MOTION.PAGE_UNDERLAY_SCALE,
  UNDERLAY_BRIGHTNESS: MOTION.PAGE_UNDERLAY_BRIGHTNESS,
  /** Edge width that can start an interactive swipe-back. */
  EDGE_PX: 22,
  /** Progress (0–1) that commits the pop on release. */
  COMMIT_PROGRESS: 0.32,
  /** Velocity (px/ms) that commits even below progress threshold. */
  COMMIT_VELOCITY: 0.55,
})

export function normalizePath(pathname) {
  if (!pathname) return '/'
  const bare = String(pathname).split('?')[0].split('#')[0]
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1)
  return bare || '/'
}

export function isTabRootPath(pathname) {
  return TAB_ROOTS.has(normalizePath(pathname))
}

export function isPushDetailPath(pathname) {
  const path = normalizePath(pathname)
  if (isTabRootPath(path)) return false
  return PUSH_DETAIL_RULES.some((test) => test(path))
}

