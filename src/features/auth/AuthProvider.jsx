/**
 * @file src/features/auth/AuthProvider.jsx
 * Owns the Supabase JWT session. Restores login on launch, refreshes tokens,
 * and mirrors identity into the local health-chart store without duplicating
 * auth.users. public.users is read-only from the client (created by trigger).
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
  signInWithPassword as signInWithEmail,
  signOut as signOutRemote,
  signUpWithPassword,
  subscribeAuth,
  updatePassword as updateRemotePassword,
} from './services/authService'
import { signInWithApple, signInWithGoogle, oauthErrorFromLocation } from './services/oauth'
import { migrateLocalDataToSupabase } from '../sync/localDataMigrator'

const AuthContext = createContext(null)

function locationLooksLikeRecovery() {
  if (typeof window === 'undefined') return false
  const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  return hash.get('type') === 'recovery' || search.get('type') === 'recovery'
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

    getCurrentSession().then(({ session: next, error }) => {
      if (cancelled) return
      if (error) setBootError(error)
      applyLocalChart(next)
      setSession(next)
      setReady(true)
    })

    const unsubscribe = subscribeAuth((event, next) => {
      if (cancelled) return
      setLastEvent(event)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') setIsRecovery(false)
      if (event === 'USER_UPDATED') setIsRecovery(false)
      applyLocalChart(next)
      setSession(next)
    })

    const oauthError = oauthErrorFromLocation()
    if (oauthError) setBootError(oauthError)

    return () => {
      cancelled = true
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

  // Hydrate profile from Supabase on every login/reload so the local store
  // reflects the latest database state (source of truth).
  useEffect(() => {
    if (!session?.user?.id || isRecovery) return
    hydrateProfileFromSupabase().catch(() => {
      /* fall back to local profile if Supabase is unreachable */
    })
  }, [session?.user?.id, isRecovery])

  // Fetch birthday from Google People API after a Google OAuth sign-in.
  // The provider_token is only present immediately after a Google session
  // is established; it is not available on reload (Supabase strips it from
  // the persisted session).  We therefore store the result in the local
  // health-chart so it survives reloads.
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
    signInWithPassword, signUp, signOut, forgotPassword, updatePassword,
    resendEmail, googleSignIn, appleSignIn,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
