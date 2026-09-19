/**
 * @file src/features/auth/index.js
 * Public surface of the authentication feature. Healthcare modules should
 * import from here rather than reaching into services.
 */
export { AuthProvider, useAuth } from './AuthProvider'
export { useSession } from './hooks/useSession'
export { GUEST_PATHS, AUTH_PATHS, APP_ROLES } from './types'
export { default as ProtectedRoute } from './components/ProtectedRoute'
export { default as GuestRoute } from './components/GuestRoute'
export { signInWithGoogle, signInWithApple } from './services/oauth'
