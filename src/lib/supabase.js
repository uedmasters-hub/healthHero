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

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local.',
  )
}

if (/service_role|secret/i.test(publishableKey)) {
  throw new Error('Refusing to initialize Supabase with a secret or service-role key in the client.')
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'healthhero.auth.v1',
  },
})

export function getAppOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function authRedirectTo(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${getAppOrigin()}${path}`
}
