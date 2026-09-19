/**
 * @file src/features/auth/components/ProtectedRoute.jsx
 * Blocks unauthenticated access to healthcare pages. Recovery sessions are
 * sent to reset-password instead of the clinical app.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { ready, isAuthenticated, isRecovery } = useAuth()
  const location = useLocation()

  if (!ready) return <AuthSplash />
  if (isRecovery) return <Navigate to="/reset" replace />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
