import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingActive } from '../../lib/onboarding'
import { useUser } from '../../user'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import { AuthSplash } from './AuthScreen'

const AUTH_PATHS = ['/login', '/register', '/forgot']

export default function AuthGate({ children }) {
  const { ready, user } = useUser()
  const onboarding = useOnboardingActive()
  const location = useLocation()
  const isAuthRoute = AUTH_PATHS.includes(location.pathname)

  if (!ready) {
    return <AuthSplash />
  }

  if (onboarding) {
    return <AuthSplash />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPasswordPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  if (isAuthRoute) {
    return <Navigate to="/" replace />
  }

  return children
}
