/**
 * /auth/confirm — single source of truth for completing authentication.
 * Handles Google OAuth PKCE, Magic Link, recovery, and session settle.
 * Shows only AuthSplash; never stays in history (replace navigation).
 * Every step is time-bounded and a hard deadline always routes somewhere:
 * the origin page when a session exists, otherwise Login with an error.
 */
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { AUTH_CONFIRM_PATH, AUTH_PATHS } from '../types'
import { hasAuthCallbackParams, scrubAuthRedirectParams } from '../services/oauth'
import { exchangeCodeFromUrl, getCurrentSession } from '../services/authService'
import { readStoredSession, withTimeout } from '../services/sessionGuard'
import { resolveReturnTo } from '../returnTo'

export { AUTH_CONFIRM_PATH }

const STEP_TIMEOUT_MS = 6000
const CONFIRM_DEADLINE_MS = 15000
const FAILED_MESSAGE = 'Sign-in could not be completed. Please try again.'

async function currentSession() {
  const result = await withTimeout(getCurrentSession(), STEP_TIMEOUT_MS)
  return result?.session || null
}

async function waitForSession({ attempts = 12, delayMs = 100 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const session = await currentSession()
    if (session?.user) return session
    await new Promise((resolve) => {
      window.setTimeout(resolve, delayMs)
    })
  }
  return null
}

export default function AuthConfirmPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { ready, isAuthenticated, isRecovery, bootError } = useAuth()
  const ran = useRef(false)
  const mounted = useRef(false)
  const settled = useRef(false)
  // Snapshot values used only after `ready` — avoid re-running when session flips mid-exchange.
  const authRef = useRef({ isAuthenticated, isRecovery, bootError })
  authRef.current = { isAuthenticated, isRecovery, bootError }
  const nextReset = params.get('next') === 'reset' || params.get('type') === 'recovery'

  const settle = useCallback((to, options) => {
    if (settled.current) return
    settled.current = true
    scrubAuthRedirectParams()
    navigate(to, { replace: true, ...options })
  }, [navigate])

  // Deadline runs from mount, independent of `ready`.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (settled.current) return
      const { isAuthenticated: authed, isRecovery: recovery, bootError: boot } = authRef.current
      if (recovery || nextReset) {
        settle(AUTH_PATHS.reset)
      } else if (authed || readStoredSession()) {
        settle(resolveReturnTo())
      } else {
        settle(AUTH_PATHS.login, { state: { authCallbackError: boot || FAILED_MESSAGE } })
      }
    }, CONFIRM_DEADLINE_MS)
    return () => window.clearTimeout(id)
  }, [nextReset, settle])

  // Run-once guard + StrictMode: cancel on unmount, not on effect cleanup.
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!ready || ran.current) return
    ran.current = true
    const cancelledNow = () => !mounted.current

    ;(async () => {
      let exchangeError = ''
      const { isAuthenticated: wasAuthed, isRecovery: recovery, bootError: boot } = authRef.current

      // detectSessionInUrl usually already exchanged; retry only if code remains.
      if (!wasAuthed && hasAuthCallbackParams()) {
        const result = await withTimeout(exchangeCodeFromUrl(), STEP_TIMEOUT_MS, { session: null })
        if (cancelledNow()) return
        if (result.error) exchangeError = result.error
      }

      // Wait for AuthProvider / storage to reflect the session before deciding.
      let session = await currentSession()
      if (!session?.user) {
        session = await waitForSession()
      }
      if (cancelledNow()) return

      const nowAuthed = Boolean(session?.user) || authRef.current.isAuthenticated

      if (recovery || authRef.current.isRecovery || nextReset) {
        settle(AUTH_PATHS.reset)
        return
      }

      if (nowAuthed) {
        // First-time onboarding is handled by OnboardingProvider after landing.
        settle(resolveReturnTo())
        return
      }

      settle(AUTH_PATHS.login, {
        state: {
          authCallbackError:
            exchangeError
            || boot
            || authRef.current.bootError
            || FAILED_MESSAGE,
        },
      })
    })()
  }, [ready, nextReset, settle])

  return <AuthSplash />
}
