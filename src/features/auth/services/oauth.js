/**
 * @file src/features/auth/services/oauth.js
 * CSRF-safe OAuth via Supabase PKCE. Google is live; Apple is architected
 * and callable, but Health Hero does not require Apple credentials yet.
 */
import { AUTH_ERROR } from '../../../user/constants'
import { authRedirectTo, supabase } from '../../../lib/supabase'
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

async function startOAuth(provider, { redirectTo = '/' } = {}) {
  const options = {
    redirectTo: authRedirectTo(redirectTo),
    skipBrowserRedirect: false,
  }

  if (provider === 'google') {
    options.scopes = GOOGLE_OAUTH_SCOPES
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
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
