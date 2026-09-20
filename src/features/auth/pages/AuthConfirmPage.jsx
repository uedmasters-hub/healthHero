/**
 * /auth/confirm — single source of truth for completing authentication.
 * Handles Google OAuth PKCE, Magic Link, recovery, and session settle.
 * Shows only AuthSplash; never stays in history (replace navigation).
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { AUTH_CONFIRM_PATH, AUTH_PATHS } from '../types'
import { hasAuthCallbackParams, scrubAuthRedirectParams } from '../services/oauth'
import { exchangeCodeFromUrl, getCurrentSession } from '../services/authService'

export { AUTH_CONFIRM_PATH }

async function waitForSession({ attempts = 12, delayMs = 100 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const { session } = await getCurrentSession()
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
  // Snapshot values used only after `ready` — avoid re-running when session flips mid-exchange.
  const authRef = useRef({ isAuthenticated, isRecovery, bootError })
  authRef.current = { isAuthenticated, isRecovery, bootError }

  useEffect(() => {
    if (!ready || ran.current) return undefined
    ran.current = true

    let cancelled = false
    const nextReset = params.get('next') === 'reset' || params.get('type') === 'recovery'

    ;(async () => {
      let exchangeError = ''
      const { isAuthenticated: wasAuthed, isRecovery: recovery, bootError: boot } = authRef.current

      // detectSessionInUrl usually already exchanged; retry only if code remains.
      if (!wasAuthed && hasAuthCallbackParams()) {
        const result = await exchangeCodeFromUrl()
        if (cancelled) return
        if (result.error) exchangeError = result.error
      }

      // Wait for AuthProvider / storage to reflect the session before deciding.
      let session = (await getCurrentSession()).session
      if (!session?.user) {
        session = await waitForSession()
      }
      if (cancelled) return

      const nowAuthed = Boolean(session?.user) || authRef.current.isAuthenticated
      scrubAuthRedirectParams()
      if (cancelled) return

      if (recovery || authRef.current.isRecovery || nextReset) {
        navigate(AUTH_PATHS.reset, { replace: true })
        return
      }

      if (nowAuthed) {
        // First-time onboarding is handled by OnboardingProvider after Home.
        navigate('/', { replace: true })
        return
      }

      navigate(AUTH_PATHS.login, {
        replace: true,
        state: {
          authCallbackError:
            exchangeError
            || boot
            || authRef.current.bootError
            || 'Sign-in could not be completed. Please try again.',
        },
      })
    })()

    return () => {
      cancelled = true
    }
  }, [ready, navigate, params])

  return <AuthSplash />
}
