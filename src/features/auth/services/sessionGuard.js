/**
 * @file src/features/auth/services/sessionGuard.js
 * Bounded waits for auth boot. Any Supabase call that can stall (session
 * restore, token refresh, PKCE exchange) is raced against a deadline so the
 * app always leaves the splash.
 */
import { AUTH_STORAGE_KEY } from '../../../lib/brand'

/** Resolves to the promise's value, or `fallback` on timeout / rejection. */
export function withTimeout(promise, ms, fallback = null) {
  let timer
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => { timer = setTimeout(() => resolve(fallback), ms) }),
  ]).finally(() => clearTimeout(timer))
}

/** Persisted session, only while its access token is still valid. */
export function readStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    const stored = raw ? JSON.parse(raw) : null
    const session = stored?.currentSession || stored
    if (!session?.access_token || !session?.user || !session?.expires_at) return null
    return session.expires_at * 1000 > Date.now() ? session : null
  } catch {
    return null
  }
}

/** Drop a persisted session that keeps wedging boot (last-resort recovery). */
export function clearStoredSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`)
  } catch {
    /* private mode */
  }
}
