import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingStatus } from '../../lib/onboarding'
import { AUTH_CONFIRM_PATH, AUTH_PATHS, GUEST_PATHS } from '../../features/auth/types'
import { useAuth } from '../../features/auth/hooks/useAuth'
import GuestRoute from '../../features/auth/components/GuestRoute'
import ProtectedRoute from '../../features/auth/components/ProtectedRoute'
import AuthConfirmPage from '../../features/auth/pages/AuthConfirmPage'
import AuthCallbackPage from '../../features/auth/pages/AuthCallbackPage'
import VerifyEmailPage from '../../features/auth/pages/VerifyEmailPage'
import ResetPasswordPage from '../../features/auth/pages/ResetPasswordPage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import OtpPage from './OtpPage'
import { AuthSplash } from './AuthScreen'

/**
 * Blocks routing until Supabase auth (and onboarding status for signed-in
 * users) is resolved. /auth/confirm runs first so PKCE / Magic Link never
 * bounce through Login or duplicate session probes.
 */
export default function AuthGate({ children }) {
  const { ready, isAuthenticated } = useAuth()
  const onboardingStatus = useOnboardingStatus()
  const location = useLocation()
  const isConfirm = location.pathname === AUTH_CONFIRM_PATH
  const isLegacyCallback = location.pathname === AUTH_PATHS.callback
  const isAuthRoute = GUEST_PATHS.includes(location.pathname)

  // Legacy /auth/callback → /auth/confirm (preserve query).
  if (isLegacyCallback) {
    return <AuthCallbackPage />
  }

  // Confirm must run before onboarding / protected / guest guards.
  if (isConfirm) {
    return <AuthConfirmPage />
  }

  if (!ready) {
    return <AuthSplash />
  }

  // Signed-in: wait for onboarding resolve; splash under the overlay while needed.
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
        <Route path="/otp" element={<GuestRoute><OtpPage /></GuestRoute>} />
        <Route path="/reset" element={<GuestRoute allowRecovery><ResetPasswordPage /></GuestRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return <ProtectedRoute>{children}</ProtectedRoute>
}
