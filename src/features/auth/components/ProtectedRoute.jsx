/**
 * @file src/features/auth/components/ProtectedRoute.jsx
 * Blocks unauthenticated access to healthcare pages. Recovery sessions are
 * sent to reset-password instead of the clinical app. The requested page is
 * remembered so sign-in returns there. A session that ended on its own shows
 * the Session expired state before handing over to Login.
 */
import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { SystemState } from '../../../components/system'
import { useAuth } from '../hooks/useAuth'
import { clearReturnTo, rememberReturnTo } from '../returnTo'

const EXPIRED_REDIRECT_SECONDS = 10

export default function ProtectedRoute({ children }) {
  const { ready, isAuthenticated, isRecovery, sessionExpired } = useAuth()
  const location = useLocation()
  const from = `${location.pathname}${location.search}${location.hash}`
  const signedOut = ready && !isRecovery && !isAuthenticated

  useEffect(() => {
    if (signedOut) rememberReturnTo(from)
    else if (ready && isAuthenticated) clearReturnTo()
  }, [signedOut, ready, isAuthenticated, from])

  if (!ready) return <AuthSplash />
  if (isRecovery) return <Navigate to="/reset" replace />
  if (signedOut && sessionExpired) {
    return (
      <div className="phone-app-state">
        <SystemState
          state="session-expired"
          autoRedirect={{ to: '/login', seconds: EXPIRED_REDIRECT_SECONDS, label: 'to sign in' }}
        />
      </div>
    )
  }
  if (signedOut) {
    return <Navigate to="/login" replace state={{ from }} />
  }
  return children
}
