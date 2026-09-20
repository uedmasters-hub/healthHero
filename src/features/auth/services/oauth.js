/**
 * @file src/features/auth/services/oauth.js
 * CSRF-safe OAuth via Supabase PKCE. Google is live; Apple is architected
 * and callable, but eMedicalls does not require Apple credentials yet.
 */
import { AUTH_ERROR } from '../../../user/constants'
import { AUTH_CONFIRM_PATH } from '../types'
import { authRedirectTo, requireSupabase } from '../../../lib/supabase'
import { mapAuthError } from './authService'

export const OAUTH_PROVIDERS = Object.freeze({
  google: 'google',
  apple: 'apple',
})

const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/user.birthday.read',
].join(' ')

async function startOAuth(provider, { redirectTo = AUTH_CONFIRM_PATH } = {}) {
  const safeRedirect = authRedirectTo(redirectTo)

  // Hard fail in the client if a protected host ever slipped through —
  // better than sending the user to vercel.com/login.
  if (/vercel\.app|vercel\.com/i.test(safeRedirect)) {
    return {
      ok: false,
      error: 'Sign-in is misconfigured: OAuth must return to emedicalls.com, not a Vercel URL.',
    }
  }

  const options = {
    redirectTo: safeRedirect,
    skipBrowserRedirect: false,
  }

  if (provider === 'google') {
    options.scopes = GOOGLE_OAUTH_SCOPES
    options.queryParams = {
      // Keep consent on Google's domain; avoid intermediate hosted UIs.
      access_type: 'offline',
      prompt: 'select_account',
    }
  }

  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider,
    options,
  })
  if (error) {
    return {
      ok: false,
      error: provider === 'apple'
        ? mapAuthError(error, AUTH_ERROR.APPLE_PENDING)
        : mapAuthError(error, AUTH_ERROR.OAUTH_FAILED),
    }
  }

  // Defense: if Supabase returned an authorize URL that embeds a bad
  // redirect_to, refuse before navigating.
  const authorizeUrl = data?.url || ''
  try {
    if (authorizeUrl) {
      const parsed = new URL(authorizeUrl)
      const embedded = parsed.searchParams.get('redirect_to') || ''
      if (embedded && /vercel\.app|vercel\.com\/login/i.test(decodeURIComponent(embedded))) {
        return {
          ok: false,
          error: 'Sign-in is misconfigured: Supabase Site URL must be https://www.emedicalls.com.',
        }
      }
    }
  } catch {
    /* ignore parse errors; Supabase will still navigate */
  }

  return { ok: true, url: authorizeUrl || null, redirectTo: safeRedirect }
}

export function signInWithGoogle() {
  return startOAuth(OAUTH_PROVIDERS.google)
}

/**
 * Prepared Apple Sign-In. Enable the Apple provider in Supabase and add
 * Services ID / key credentials there when they are available.
 */
export function signInWithApple() {
  return startOAuth(OAUTH_PROVIDERS.apple)
}

export function oauthErrorFromLocation(search = window.location.search, hash = window.location.hash) {
  const query = new URLSearchParams(search)
  const hashQuery = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  const error = query.get('error') || hashQuery.get('error')
  const description = query.get('error_description') || hashQuery.get('error_description') || ''
  if (!error) return null
  if (error === 'access_denied' || /cancel/i.test(description)) return AUTH_ERROR.OAUTH_CANCELLED
  return mapAuthError({ message: description || error }, AUTH_ERROR.OAUTH_FAILED)
}

/** True while the URL still carries an OAuth / magic-link callback payload. */
export function hasAuthCallbackParams(search = window.location.search, hash = window.location.hash) {
  const query = new URLSearchParams(search)
  const hashQuery = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  return Boolean(
    query.get('code')
    || hashQuery.get('access_token')
    || hashQuery.get('refresh_token')
    || hashQuery.get('provider_token'),
  )
}

/**
 * Strip OAuth / recovery callback params so refresh does not re-process the
 * redirect. Safe to call repeatedly (idempotent).
 */
export function scrubAuthRedirectParams() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    const keys = ['code', 'state', 'error', 'error_description', 'error_code']
    let changed = false
    keys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        changed = true
      }
    })
    const hash = String(url.hash || '').replace(/^#/, '')
    if (hash && /access_token|refresh_token|type=|provider_token|code=/.test(hash)) {
      url.hash = ''
      changed = true
    }
    if (!changed) return
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(window.history.state || {}, document.title, next)
  } catch {
    /* ignore */
  }
}
