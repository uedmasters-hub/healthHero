/**
 * @file src/features/auth/AuthProvider.jsx
 * Owns the Supabase JWT session. Restores login on launch, refreshes tokens,
 * and mirrors identity into the local health-chart store without duplicating
 * auth.users. public.users is read-only from the client (created by trigger).
 *
 * Boot rule: routing must wait until the first auth state is resolved
 * (INITIAL_SESSION / first onAuthStateChange). Never route on a premature
 * getSession() null during the OAuth PKCE URL exchange.
 *
 * Scrubbing of ?code= is owned by /auth/confirm — not here — to avoid races.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  attachAuthenticatedUser,
  hydrateProfileFromSupabase,
  logout as detachLocalSession,
  setGoogleBirthday,
} from '../../user/store'
import {
  chartIdentityFromUser,
  fetchGoogleBirthday,
  getCurrentSession,
  loadAppUser,
  requestPasswordReset,
  resendVerification,
  sendEmailOtp as sendEmailOtpRemote,
  signInWithPassword as signInWithEmail,
  signOut as signOutRemote,
  signUpWithPassword,
  subscribeAuth,
  updatePassword as updateRemotePassword,
  verifyEmailOtp as verifyEmailOtpRemote,
} from './services/authService'
import {
  signInWithApple,
  signInWithGoogle,
  oauthErrorFromLocation,
  hasAuthCallbackParams,
} from './services/oauth'
import { AUTH_CONFIRM_PATH, AUTH_PATHS } from './types'
import { migrateLocalDataToSupabase } from '../sync/localDataMigrator'

const AuthContext = createContext(null)

function locationLooksLikeRecovery() {
  if (typeof window === 'undefined') return false
  const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  return hash.get('type') === 'recovery' || search.get('type') === 'recovery'
}

function isAuthConfirmRoute() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === AUTH_CONFIRM_PATH || path === AUTH_PATHS.callback
}

function applyLocalChart(session) {
  if (session?.user) {
    attachAuthenticatedUser(chartIdentityFromUser(session.user))
    return
  }
  detachLocalSession()
}

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState(null)
  const [appUser, setAppUser] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [isRecovery, setIsRecovery] = useState(() => locationLooksLikeRecovery())
  const [bootError, setBootError] = useState(null)
  const [googleBirthday, setGoogleBirthdayState] = useState(null)

  useEffect(() => {
    let cancelled = false
    let bootstrapped = false

    const finishBoot = (nextSession, event) => {
      if (cancelled || bootstrapped) return
      bootstrapped = true
      // Surface OAuth errors from the URL, but leave scrubbing to /auth/confirm
      // so PKCE ?code= is never stripped mid-exchange.
      if (!isAuthConfirmRoute()) {
        const oauthError = oauthErrorFromLocation()
        if (oauthError) setBootError(oauthError)
      }
      applyLocalChart(nextSession)
      setSession(nextSession)
      if (event) setLastEvent(event)
      setReady(true)
    }

    const unsubscribe = subscribeAuth((event, next) => {
      if (cancelled) return

      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') setIsRecovery(false)
      if (event === 'USER_UPDATED') setIsRecovery(false)

      if (!bootstrapped) {
        // PKCE exchange may emit INITIAL_SESSION(null) before SIGNED_IN.
        // Keep splash up until we have a session or callback params clear.
        if (!next && hasAuthCallbackParams()) {
          return
        }
        finishBoot(next, event)
        return
      }

      setLastEvent(event)
      applyLocalChart(next)
      setSession(next)
    })

    // Fallback if onAuthStateChange never unlocks routing.
    const fallbackTimer = window.setTimeout(() => {
      if (cancelled || bootstrapped) return
      getCurrentSession().then(({ session: next, error }) => {
        if (cancelled || bootstrapped) return
        if (error) setBootError(error)
        if (!next && hasAuthCallbackParams()) return
        finishBoot(next, 'FALLBACK_SESSION')
      })
    }, 2800)

    const forceTimer = window.setTimeout(() => {
      if (cancelled || bootstrapped) return
      getCurrentSession().then(({ session: next, error }) => {
        if (cancelled || bootstrapped) return
        if (error) setBootError(error)
        finishBoot(next, 'FORCE_SESSION')
      })
    }, 6000)

    return () => {
      cancelled = true
      window.clearTimeout(fallbackTimer)
      window.clearTimeout(forceTimer)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      setAppUser(null)
      return
    }
    let cancelled = false
    loadAppUser(userId).then((row) => {
      if (!cancelled) setAppUser(row)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id || isRecovery) return
    migrateLocalDataToSupabase(session.user).catch(() => {
      /* keep the local chart if remote sync is unavailable */
    })
  }, [session?.user?.id, isRecovery])

  useEffect(() => {
    if (!session?.user?.id || isRecovery) return
    hydrateProfileFromSupabase().catch(() => {
      /* fall back to local profile if Supabase is unreachable */
    })
  }, [session?.user?.id, isRecovery])

  useEffect(() => {
    if (!session?.provider_token || !session?.user?.id) return
    let cancelled = false
    fetchGoogleBirthday(session).then(({ birthday }) => {
      if (cancelled || !birthday) return
      setGoogleBirthday(birthday)
      setGoogleBirthdayState(birthday)
    })
    return () => { cancelled = true }
  }, [session?.provider_token, session?.user?.id])

  const signInWithPassword = useCallback(async (email, password) => (
    signInWithEmail(email, password)
  ), [])

  const sendEmailOtp = useCallback(async (email) => sendEmailOtpRemote(email), [])
  const verifyEmailOtp = useCallback(async (email, token) => verifyEmailOtpRemote(email, token), [])

  const signUp = useCallback(async (input) => signUpWithPassword(input), [])

  const signOut = useCallback(async () => {
    const result = await signOutRemote()
    detachLocalSession()
    setSession(null)
    setAppUser(null)
    setIsRecovery(false)
    return result
  }, [])

  const forgotPassword = useCallback(async (email) => requestPasswordReset(email), [])
  const updatePassword = useCallback(async (password) => updateRemotePassword(password), [])
  const resendEmail = useCallback(async (email) => resendVerification(email), [])
  const googleSignIn = useCallback(() => signInWithGoogle(), [])
  const appleSignIn = useCallback(() => signInWithApple(), [])

  const value = useMemo(() => {
    const user = session?.user || null
    const emailVerified = Boolean(
      user?.email_confirmed_at
      || user?.app_metadata?.provider === 'google'
      || user?.user_metadata?.email_verified,
    )
    return {
      ready,
      session,
      user,
      appUser,
      lastEvent,
      isRecovery,
      isAuthenticated: Boolean(user) && !isRecovery,
      bootError,
      googleBirthday,
      emailVerified,
      signInWithPassword,
      sendEmailOtp,
      verifyEmailOtp,
      signUp,
      signOut,
      forgotPassword,
      updatePassword,
      resendEmail,
      googleSignIn,
      appleSignIn,
    }
  }, [
    ready, session, appUser, lastEvent, isRecovery, bootError, googleBirthday,
    signInWithPassword, sendEmailOtp, verifyEmailOtp, signUp, signOut,
    forgotPassword, updatePassword, resendEmail, googleSignIn, appleSignIn,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
