import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingActive } from '../../lib/onboarding'
import { GUEST_PATHS } from '../../features/auth/types'
import GuestRoute from '../../features/auth/components/GuestRoute'
import ProtectedRoute from '../../features/auth/components/ProtectedRoute'
import VerifyEmailPage from '../../features/auth/pages/VerifyEmailPage'
import ResetPasswordPage from '../../features/auth/pages/ResetPasswordPage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import { AuthSplash } from './AuthScreen'

export default function AuthGate({ children }) {
  const onboarding = useOnboardingActive()
  const location = useLocation()
  const isAuthRoute = GUEST_PATHS.includes(location.pathname)

  if (onboarding) {
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
