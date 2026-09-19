/**
 * @file src/features/auth/components/GuestRoute.jsx
 * Guest-only auth screens. Signed-in patients are sent home, except during
 * password recovery which must complete on /reset.
 */
import { Navigate } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'

export default function GuestRoute({ children, allowRecovery = false }) {
  const { ready, isAuthenticated, isRecovery } = useAuth()

  if (!ready) return <AuthSplash />
  if (isRecovery && !allowRecovery) return <Navigate to="/reset" replace />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}
