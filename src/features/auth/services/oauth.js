/**
 * @file src/features/auth/services/oauth.js
 * CSRF-safe OAuth via Supabase PKCE. Google is live; Apple is architected
 * and callable, but Health Hero does not require Apple credentials yet.
 */
import { AUTH_ERROR } from '../../../user/constants'
import { AUTH_CALLBACK_PATH } from '../types'
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

async function startOAuth(provider, { redirectTo = AUTH_CALLBACK_PATH } = {}) {
  const options = {
    redirectTo: authRedirectTo(redirectTo),
    skipBrowserRedirect: false,
  }

  if (provider === 'google') {
    options.scopes = GOOGLE_OAUTH_SCOPES
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
  return { ok: true, url: data?.url || null }
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
