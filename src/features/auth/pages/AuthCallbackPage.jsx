/**
 * Shared Supabase auth callback for email verification, recovery, and OAuth.
 * Processes the PKCE ?code= payload once, then routes to Home / recovery
 * without bouncing through Login.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { AUTH_CALLBACK_PATH } from '../types'
import { hasAuthCallbackParams, scrubAuthRedirectParams } from '../services/oauth'
import { exchangeCodeFromUrl, getCurrentSession } from '../services/authService'

export { AUTH_CALLBACK_PATH }

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { ready, isAuthenticated, isRecovery, bootError } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (!ready || ran.current) return undefined
    ran.current = true

    let cancelled = false

    ;(async () => {
      let exchangeError = ''

      // detectSessionInUrl usually already exchanged; only retry if code remains.
      if (!isAuthenticated && hasAuthCallbackParams()) {
        const result = await exchangeCodeFromUrl()
        if (cancelled) return
        if (result.error) exchangeError = result.error
      }

      scrubAuthRedirectParams()
      if (cancelled) return

      const { session } = await getCurrentSession()
      if (cancelled) return

      if (isRecovery || params.get('next') === 'reset') {
        navigate('/reset', { replace: true })
        return
      }

      if (session?.user) {
        // OnboardingProvider resolves status and shows overlay if needed.
        navigate('/', { replace: true })
        return
      }

      navigate('/login', {
        replace: true,
        state: {
          authCallbackError:
            exchangeError
            || bootError
            || 'Sign-in could not be completed. Please try again.',
        },
      })
    })()

    return () => {
      cancelled = true
    }
  }, [ready, isAuthenticated, isRecovery, bootError, navigate, params])

  return <AuthSplash />
}
