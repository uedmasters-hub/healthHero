/**
 * @file src/features/auth/services/authService.js
 * Supabase Auth operations. Passwords never leave the Auth API; this module
 * never writes credentials to localStorage or public.users.
 */
import { AUTH_ERROR } from '../../../user/constants'
import { normalizeEmail } from '../../../user/models'
import { authRedirectTo, requireSupabase } from '../../../lib/supabase'
import { AUTH_CONFIRM_PATH } from '../types'

function isNetworkFailure(error) {
  const message = String(error?.message || error || '')
  return error?.name === 'AuthRetryableFetchError'
    || /failed to fetch|networkerror|load failed|network/i.test(message)
}

export function mapAuthError(error, fallback = AUTH_ERROR.GENERIC) {
  if (!error) return fallback
  if (isNetworkFailure(error)) return AUTH_ERROR.NETWORK

  const message = String(error.message || '')
  const code = String(error.code || error.name || '')

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return AUTH_ERROR.INVALID
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return AUTH_ERROR.UNVERIFIED
  }
  if (
    code === 'user_already_exists'
    || /already registered|already been registered|user already exists/i.test(message)
  ) {
    return AUTH_ERROR.EXISTS
  }
  if (code === 'otp_expired' || /token has expired|otp.*expired|expired.*otp/i.test(message)) {
    return AUTH_ERROR.EXPIRED
  }
  if (
    code === 'otp_disabled'
    || /invalid.*(otp|token|code)|token.*invalid|otp.*invalid|one-time/i.test(message)
  ) {
    return AUTH_ERROR.OTP_INVALID
  }
  if (/expired|invalid.*link/i.test(message)) {
    return AUTH_ERROR.EXPIRED
  }
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) {
    return 'Please wait a moment before requesting another email.'
  }
  if (
    code === 'access_denied'
    || /access_denied|user cancelled|authorization cancelled/i.test(message)
  ) {
    return AUTH_ERROR.OAUTH_CANCELLED
  }
  if (/provider is not enabled|unsupported provider|apple/i.test(message) && /apple/i.test(message)) {
    return AUTH_ERROR.APPLE_PENDING
  }
  if (/oauth|provider/i.test(message)) return AUTH_ERROR.OAUTH_FAILED
  return fallback
}

export function displayNameFromUser(user) {
  const meta = user?.user_metadata || {}
  return String(meta.full_name || meta.name || meta.display_name || '').trim()
}

export function phoneFromUser(user) {
  const meta = user?.user_metadata || {}
  return String(user?.phone || meta.phone || '').trim()
}

export function chartIdentityFromUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email || '',
    phone: phoneFromUser(user),
    name: displayNameFromUser(user),
  }
}

export async function getCurrentSession() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.getSession()
  if (error) return { session: null, error: mapAuthError(error) }
  return { session: data.session || null }
}

/**
 * Exchange a PKCE ?code= from the current URL exactly once.
 * Safe no-op when no code is present.
 */
export async function exchangeCodeFromUrl(href = typeof window !== 'undefined' ? window.location.href : '') {
  if (!href) return { session: null }
  let code = ''
  try {
    const url = new URL(href)
    code = url.searchParams.get('code') || ''
  } catch {
    return { session: null }
  }
  if (!code) return { session: null }

  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return { session: null, error: mapAuthError(error) }
  return { session: data.session || null, user: data.user || null }
}

export async function signInWithPassword(email, password) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })
  if (error) {
    return { ok: false, error: mapAuthError(error, AUTH_ERROR.INVALID), code: error.code }
  }
  return { ok: true, session: data.session, user: data.user }
}

/**
 * Primary email sign-in: send a 6-digit OTP (+ Magic Link fallback in the email).
 * Magic Link resolves through /auth/confirm.
 */
export async function sendEmailOtp(email) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: authRedirectTo(AUTH_CONFIRM_PATH),
      shouldCreateUser: true,
    },
  })
  if (error) return { ok: false, error: mapAuthError(error), code: error.code }
  return { ok: true }
}

/** Verify the in-app OTP code. Session is established without leaving the app. */
export async function verifyEmailOtp(email, token) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token: String(token || '').trim(),
    type: 'email',
  })
  if (error) {
    return { ok: false, error: mapAuthError(error, AUTH_ERROR.OTP_INVALID), code: error.code }
  }
  return { ok: true, session: data.session, user: data.user }
}

export async function signUpWithPassword({ name, email, phone, password }) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      emailRedirectTo: authRedirectTo(AUTH_CONFIRM_PATH),
      data: {
        full_name: String(name || '').trim(),
        phone: String(phone || '').trim(),
      },
    },
  })
  if (error) {
    return { ok: false, error: mapAuthError(error, AUTH_ERROR.GENERIC), code: error.code }
  }
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: AUTH_ERROR.EXISTS, code: 'user_already_exists' }
  }
  return {
    ok: true,
    session: data.session,
    user: data.user,
    needsVerification: !data.session,
  }
}

export async function requestPasswordReset(email) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: authRedirectTo(`${AUTH_CONFIRM_PATH}?next=reset`),
  })
  if (error) return { ok: false, error: mapAuthError(error) }
  return { ok: true }
}

export async function updatePassword(password) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: mapAuthError(error) }
  return { ok: true, user: data.user }
}

export async function resendVerification(email) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizeEmail(email),
    options: { emailRedirectTo: authRedirectTo(AUTH_CONFIRM_PATH) },
  })
  if (error) return { ok: false, error: mapAuthError(error) }
  return { ok: true }
}

export async function signOut() {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signOut()
  if (error && !isNetworkFailure(error)) return { ok: false, error: mapAuthError(error) }
  return { ok: true }
}

export async function loadAppUser(userId) {
  if (!userId) return null
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, status, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return data
}

/**
 * Fetch the user's birthday from the Google People API using the
 * provider_token supplied by Supabase after a successful Google OAuth.
 *
 * Returns `{ birthday: 'YYYY-MM-DD' | null }` on success.
 * Returns `{ birthday: null }` when the scope was denied, the birthday
 * is missing, or the request fails — never throws.
 */
export async function fetchGoogleBirthday(session) {
  const token = session?.provider_token
  if (!token) return { birthday: null }

  try {
    const res = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays',
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return { birthday: null }

    const data = await res.json()
    const birthdays = data?.birthdays
    if (!Array.isArray(birthdays) || !birthdays.length) return { birthday: null }

    const primary = birthdays.find((b) => b.metadata?.primary) || birthdays[0]
    const { year, month, day } = primary?.date || {}
    if (!month || !day) return { birthday: null }

    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const yyyy = year ? String(year) : null
    return { birthday: yyyy ? `${yyyy}-${mm}-${dd}` : `${mm}-${dd}` }
  } catch {
    return { birthday: null }
  }
}

/** Single subscription point — AuthProvider owns this; do not duplicate elsewhere. */
export function subscribeAuth(callback) {
  const supabase = requireSupabase()
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => data.subscription.unsubscribe()
}
