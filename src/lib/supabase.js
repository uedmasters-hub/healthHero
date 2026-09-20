/**
 * @file src/lib/supabase.js
 * Browser-only Supabase client for Health Hero.
 *
 * Auth redirects always resolve to `${window.location.origin}/auth/confirm`
 * (with a safe production fallback), never a Vercel SSO-protected host.
 */
import { createClient } from '@supabase/supabase-js'
import {
  AUTH_CONFIRM_PATH,
  PRODUCTION_APP_ORIGIN,
  authConfirmUrl,
  buildAuthRedirectUrl,
  resolveAppOrigin,
} from './appOrigin'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const configuredOrigin = String(
  import.meta.env.VITE_APP_ORIGIN
  || import.meta.env.VITE_PUBLIC_APP_URL
  || '',
).trim()

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabaseConfigError = (() => {
  if (!url || !publishableKey) {
    return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them in Vercel Project Settings → Environment Variables (and .env.local for local), then redeploy.'
  }
  if (/service_role|secret/i.test(publishableKey)) {
    return 'Refusing to initialize Supabase with a secret or service-role key in the client.'
  }
  return null
})()

export const supabase = isSupabaseConfigured && !supabaseConfigError
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'healthhero.auth.v1',
      },
    })
  : null

export function getAppOrigin() {
  return resolveAppOrigin({
    configured: configuredOrigin || PRODUCTION_APP_ORIGIN,
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : '',
    isProd: Boolean(import.meta.env.PROD),
  })
}

/** Absolute redirect for OAuth / magic link / recovery — defaults to /auth/confirm. */
export function authRedirectTo(pathname = AUTH_CONFIRM_PATH) {
  if (!pathname || pathname === AUTH_CONFIRM_PATH || pathname === '/auth/confirm') {
    return authConfirmUrl()
  }
  if (pathname.startsWith('/auth/confirm?') || pathname.startsWith(`${AUTH_CONFIRM_PATH}?`)) {
    const q = pathname.includes('?') ? pathname.slice(pathname.indexOf('?') + 1) : ''
    return authConfirmUrl(q)
  }
  return buildAuthRedirectUrl(pathname, configuredOrigin || PRODUCTION_APP_ORIGIN)
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not configured.')
  }
  return supabase
}

export { AUTH_CONFIRM_PATH, PRODUCTION_APP_ORIGIN, authConfirmUrl }
