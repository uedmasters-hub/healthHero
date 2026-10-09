/**
 * @file src/features/auth/components/GuestRoute.jsx
 * Guest-only auth screens. Signed-in patients are sent back to the page they
 * came from (or Home), except during password recovery which must complete
 * on /reset.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { AuthSplash } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { resolveReturnTo } from '../returnTo'
import { peekGuestResume } from '../../guest/resume'

export default function GuestRoute({ children, allowRecovery = false }) {
  const { ready, isAuthenticated, isRecovery } = useAuth()
  const location = useLocation()

  if (!ready) return <AuthSplash />
  if (isRecovery && !allowRecovery) return <Navigate to="/reset" replace />
  if (isAuthenticated) {
    const to = resolveReturnTo(location.state?.from)
    const resume = peekGuestResume()
    const state = resume && resume.path === to ? resume.state : undefined
    return <Navigate to={to} replace state={state} />
  }
  return children
}
