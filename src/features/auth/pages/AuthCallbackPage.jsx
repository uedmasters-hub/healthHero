/**
 * Legacy alias: /auth/callback → /auth/confirm (preserve query + hash).
 * Prefer AUTH_CONFIRM_PATH for all new redirects.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { AUTH_CONFIRM_PATH } from '../types'

export default function AuthCallbackPage() {
  const location = useLocation()
  const to = {
    pathname: AUTH_CONFIRM_PATH,
    search: location.search,
    hash: location.hash,
  }
  return <Navigate to={to} replace />
}

export { AUTH_CONFIRM_PATH as AUTH_CALLBACK_PATH }
