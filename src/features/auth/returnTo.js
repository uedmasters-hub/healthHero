/**
 * @file src/features/auth/returnTo.js
 * Where to land after authentication. ProtectedRoute remembers the page a
 * signed-out visitor asked for; every auth exit (password, OTP, OAuth, magic
 * link, verify) resolves back to it, or Home. Stored in localStorage so a
 * magic link opened in a new tab still returns to the origin page.
 */
import { AUTH_PATHS, GUEST_PATHS } from './types'

const KEY = 'emedicalls.auth.returnTo'
const TTL_MS = 30 * 60 * 1000
const HOME = '/'

let suppressUntil = 0

function pathnameOf(value) {
  return String(value).split(/[?#]/)[0] || HOME
}

/** Same-origin app path that is not an auth screen, else null. */
export function safeReturnPath(value) {
  if (typeof value !== 'string') return null
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null
  const pathname = pathnameOf(path)
  if (GUEST_PATHS.includes(pathname)) return null
  if (pathname.startsWith('/auth/') || pathname === AUTH_PATHS.confirm) return null
  return path
}

export function rememberReturnTo(path) {
  if (Date.now() < suppressUntil) return
  const safe = safeReturnPath(path)
  if (!safe || safe === HOME) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() }))
  } catch {
    /* private mode */
  }
}

function readStored() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { path, at } = JSON.parse(raw)
    if (!at || Date.now() - at > TTL_MS) return null
    return safeReturnPath(path)
  } catch {
    return null
  }
}

/** Target after sign-in: explicit `from`, then the remembered page, then Home. Non-destructive. */
export function resolveReturnTo(from) {
  return safeReturnPath(from) || readStored() || HOME
}

export function clearReturnTo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

/** Intentional sign-out: forget the origin and don't re-record the page being left. */
export function forgetReturnTo(ms = 4000) {
  suppressUntil = Date.now() + ms
  clearReturnTo()
}
