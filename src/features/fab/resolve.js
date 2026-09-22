import { FAB_MODE, FAB_MOTION, FAB_ROUTE_RULES, hasStickyCta } from './config'

/**
 * Resolve FAB presentation for a pathname (+ optional screen override).
 * Override wins when a screen declares `{ mode, action?, actions?, motion? }` via useFabConfig.
 *
 * Sticky-CTA enforcement: scroll motion is never allowed on sticky-footer routes.
 */
export function resolveFabConfig(pathname, override = null) {
  const path = normalizePath(pathname)
  const sticky = hasStickyCta(path)

  if (override && override.mode) {
    return normalizeResult(override, sticky)
  }

  for (const rule of FAB_ROUTE_RULES) {
    if (rule.test(path)) {
      return normalizeResult(rule, sticky)
    }
  }

  return { mode: FAB_MODE.HIDDEN, motion: FAB_MOTION.FIXED, actions: null, action: null }
}

function normalizePath(pathname) {
  if (!pathname) return '/'
  const bare = String(pathname).split('?')[0].split('#')[0]
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1)
  return bare || '/'
}

function normalizeResult(rule, sticky) {
  const mode = rule.mode || FAB_MODE.HIDDEN
  let motion = rule.motion || (mode === FAB_MODE.HUB ? FAB_MOTION.SCROLL : FAB_MOTION.FIXED)

  // Sticky bottom CTA owns the safe area — never ride nav-hide scroll motion.
  if (sticky && motion === FAB_MOTION.SCROLL) {
    motion = FAB_MOTION.FIXED
  }
  // Sticky screens should not show a floating FAB at all unless explicitly FIXED.
  if (sticky && mode !== FAB_MODE.HIDDEN && motion !== FAB_MOTION.FIXED) {
    return { mode: FAB_MODE.HIDDEN, motion: FAB_MOTION.FIXED, actions: null, action: null }
  }

  if (mode === FAB_MODE.HUB) {
    return { mode, motion, actions: rule.actions || [], action: null }
  }
  if (mode === FAB_MODE.UTILITY) {
    return { mode, motion, actions: null, action: rule.action || null }
  }
  return { mode: FAB_MODE.HIDDEN, motion: FAB_MOTION.FIXED, actions: null, action: null }
}
