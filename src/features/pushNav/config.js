/**
 * Routes that use horizontal push / mirrored-pop navigation.
 * Tabs, booking/payment flows, sheets, and overlays are intentionally excluded.
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
  (p) => p.startsWith('/insights/'),
  (p) => p === '/notifications',
  (p) => p.startsWith('/explore/'),
  (p) => p === '/appointment',
  (p) => p === '/post-visit-summary',
])

export const PUSH_MOTION = Object.freeze({
  /** Matches `.app.is-dimmed` / `.page-layer-inner.is-dimmed`. */
  DURATION_MS: 360,
  EASING: 'cubic-bezier(0.22, 1, 0.36, 1)',
  UNDERLAY_SCALE: 0.96,
  UNDERLAY_BRIGHTNESS: 0.75,
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
