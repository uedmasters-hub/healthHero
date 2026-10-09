import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingStatus } from '../../lib/onboarding'
import { AUTH_CONFIRM_PATH, AUTH_PATHS, GUEST_PATHS } from '../../features/auth/types'
import { useAuth } from '../../features/auth/hooks/useAuth'
import GuestRoute from '../../features/auth/components/GuestRoute'
import AuthConfirmPage from '../../features/auth/pages/AuthConfirmPage'
import AuthCallbackPage from '../../features/auth/pages/AuthCallbackPage'
import VerifyEmailPage from '../../features/auth/pages/VerifyEmailPage'
import ResetPasswordPage from '../../features/auth/pages/ResetPasswordPage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import OtpPage from './OtpPage'
import { AuthSplash } from './AuthScreen'
import { SystemState } from '../system'

const EXPIRED_REDIRECT_SECONDS = 10

/**
 * Resolves auth before routing. Guests explore the app after onboarding.
 * Login is a screen they open, not a wall around the product. An identified
 * session that expires still stops on the session-expired state.
 */
export default function AuthGate({ children }) {
  const { ready, isAuthenticated, isRecovery, sessionExpired } = useAuth()
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
    return <AuthSplash watchdog={onboardingStatus === 'pending'} />
  }

  if (isRecovery && !isAuthRoute) {
    return <Navigate to="/reset" replace />
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

  if (sessionExpired && !isAuthenticated) {
    return (
      <div className="phone-app-state">
        <SystemState
          state="session-expired"
          autoRedirect={{ to: '/login', seconds: EXPIRED_REDIRECT_SECONDS, label: 'to sign in' }}
        />
      </div>
    )
  }

  return children
}
