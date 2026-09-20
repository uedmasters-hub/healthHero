/**
 * @file src/lib/supabase.js
 * Browser-only Supabase client for Health Hero.
 *
 * Uses the publishable (anon) key exclusively. The Secret / Service Role key
 * must never appear in this bundle, environment prefixes, or client storage.
 *
 * Session handling:
 * - persistSession: restore login across reloads via localStorage
 * - autoRefreshToken: refresh JWTs before expiry
 * - detectSessionInUrl: complete email-confirm, recovery, and OAuth redirects
 * - flowType pkce: CSRF-safe OAuth / magic-link exchange
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

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
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function authRedirectTo(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${getAppOrigin()}${path}`
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not configured.')
  }
  return supabase
}
