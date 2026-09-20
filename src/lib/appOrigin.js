/**
 * Canonical public origin for eMedicalls production auth redirects.
 * Never use a Vercel preview / SSO-protected *.vercel.app host here.
 */
export const PRODUCTION_APP_ORIGIN = 'https://www.emedicalls.com'
export const AUTH_CONFIRM_PATH = '/auth/confirm'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

export function isVercelProtectedHost(hostname = '') {
  const host = String(hostname || '').toLowerCase()
  return host === 'vercel.com'
    || host.endsWith('.vercel.com')
    || host.endsWith('.vercel.app')
}

export function isLocalHost(hostname = '') {
  return LOCAL_HOSTS.has(String(hostname || '').toLowerCase())
}

/**
 * Normalize an origin string. Returns '' when invalid / empty.
 */
export function normalizeOrigin(value) {
  const raw = String(value || '').trim().replace(/\/$/, '')
  if (!raw) return ''
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.protocol}//${url.host}`
  } catch {
    return ''
  }
}

function canonicalizeEmedicalls(origin) {
  try {
    const url = new URL(origin)
    if (url.hostname === 'emedicalls.com') {
      url.hostname = 'www.emedicalls.com'
      return url.origin
    }
  } catch {
    /* ignore */
  }
  return origin
}

/**
 * Resolve the origin used for every Supabase redirectTo / emailRedirectTo.
 *
 * Prefer the live window origin (localhost ↔ production) so the same build
 * works everywhere. Never return a Vercel SSO-protected host.
 */
export function resolveAppOrigin({
  configured = '',
  windowOrigin = '',
  isProd = false,
} = {}) {
  const fromWindow = normalizeOrigin(windowOrigin)
  if (fromWindow) {
    try {
      const host = new URL(fromWindow).hostname
      if (isLocalHost(host)) return fromWindow
      if (!isVercelProtectedHost(host)) return canonicalizeEmedicalls(fromWindow)
    } catch {
      /* fall through */
    }
  }

  const fromEnv = normalizeOrigin(configured)
  if (fromEnv) {
    try {
      const host = new URL(fromEnv).hostname
      if (!isVercelProtectedHost(host)) return canonicalizeEmedicalls(fromEnv)
    } catch {
      /* fall through */
    }
  }

  return isProd ? PRODUCTION_APP_ORIGIN : (fromWindow || PRODUCTION_APP_ORIGIN)
}

/**
 * Dynamic auth completion URL: `${origin}/auth/confirm`.
 * Works on localhost:5173 and https://www.emedicalls.com without hardcoding.
 */
export function buildAuthRedirectUrl(pathname = AUTH_CONFIRM_PATH, origin) {
  const base = resolveAppOrigin({
    configured: origin,
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : '',
    isProd: Boolean(import.meta.env?.PROD),
  })
  const path = String(pathname || AUTH_CONFIRM_PATH)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

/** Convenience: current origin's /auth/confirm (optional query string). */
export function authConfirmUrl(search = '') {
  const query = search
    ? (String(search).startsWith('?') ? String(search) : `?${search}`)
    : ''
  return `${buildAuthRedirectUrl(AUTH_CONFIRM_PATH)}${query}`
}
