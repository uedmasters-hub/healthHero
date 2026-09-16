import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingActive } from '../../lib/onboarding'
import { useUser } from '../../user'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { AuthSplash } from './AuthScreen'

export default function AuthGate({ children }) {
  const { ready, user } = useUser()
  const onboarding = useOnboardingActive()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'

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
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  if (isAuthRoute) {
    return <Navigate to="/" replace />
  }

  return children
}
