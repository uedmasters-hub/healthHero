/**
 * @file src/features/auth/hooks/useSession.js
 * Focused session selector. Use this when a surface only needs identity
 * state, not sign-in methods.
 */
import { useAuth } from '../AuthProvider'

export function useSession() {
  const {
    ready,
    session,
    user,
    appUser,
    isAuthenticated,
    isRecovery,
    lastEvent,
  } = useAuth()

  return {
    ready,
    session,
    user,
    appUser,
    isAuthenticated,
    isRecovery,
    lastEvent,
    accessToken: session?.access_token || null,
    userId: user?.id || null,
    email: user?.email || appUser?.email || '',
    role: appUser?.role || 'patient',
  }
}
