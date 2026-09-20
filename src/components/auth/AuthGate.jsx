import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingStatus } from '../../lib/onboarding'
import { AUTH_CALLBACK_PATH, GUEST_PATHS } from '../../features/auth/types'
import { useAuth } from '../../features/auth/hooks/useAuth'
import GuestRoute from '../../features/auth/components/GuestRoute'
import ProtectedRoute from '../../features/auth/components/ProtectedRoute'
import AuthCallbackPage from '../../features/auth/pages/AuthCallbackPage'
import VerifyEmailPage from '../../features/auth/pages/VerifyEmailPage'
import ResetPasswordPage from '../../features/auth/pages/ResetPasswordPage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import { AuthSplash } from './AuthScreen'

/**
 * Blocks routing until Supabase auth (and onboarding status for signed-in
 * users) is resolved. The shared /auth/callback path runs first so PKCE
 * ?code= is never redirected through Login or Vercel-gated remounts.
 */
export default function AuthGate({ children }) {
  const { ready, isAuthenticated } = useAuth()
  const onboardingStatus = useOnboardingStatus()
  const location = useLocation()
  const isCallback = location.pathname === AUTH_CALLBACK_PATH
  const isAuthRoute = GUEST_PATHS.includes(location.pathname)

  // Auth callback must run before onboarding / protected guards.
  if (isCallback) {
    return <AuthCallbackPage />
  }

  if (!ready) {
    return <AuthSplash />
  }

  // Signed-in: wait for onboarding resolve; show splash under the overlay while needed.
  if (isAuthenticated && (onboardingStatus === 'pending' || onboardingStatus === 'needed')) {
    return <AuthSplash />
  }

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/verify" element={<GuestRoute><VerifyEmailPage /></GuestRoute>} />
        <Route path="/reset" element={<GuestRoute allowRecovery><ResetPasswordPage /></GuestRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return <ProtectedRoute>{children}</ProtectedRoute>
}
