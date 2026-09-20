import { FAB_MODE, FAB_ROUTE_RULES } from './config'

/**
 * Resolve FAB presentation for a pathname (+ optional screen override).
 * Override wins when a screen declares `{ mode, action?, actions? }` via useFabConfig.
 */
export function resolveFabConfig(pathname, override = null) {
  const path = normalizePath(pathname)

  if (override && override.mode) {
    return normalizeResult(override)
  }

  for (const rule of FAB_ROUTE_RULES) {
    if (rule.test(path)) {
      return normalizeResult(rule)
    }
  }

  return { mode: FAB_MODE.HIDDEN, actions: null, action: null }
}

function normalizePath(pathname) {
  if (!pathname) return '/'
  const bare = String(pathname).split('?')[0].split('#')[0]
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1)
  return bare || '/'
}

function normalizeResult(rule) {
  const mode = rule.mode || FAB_MODE.HIDDEN
  if (mode === FAB_MODE.HUB) {
    return { mode, actions: rule.actions || [], action: null }
  }
  if (mode === FAB_MODE.UTILITY) {
    return { mode, actions: null, action: rule.action || null }
  }
  return { mode: FAB_MODE.HIDDEN, actions: null, action: null }
}
