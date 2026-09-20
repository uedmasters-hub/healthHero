/**
 * @file src/features/auth/index.js
 * Public surface of the authentication feature. Healthcare modules should
 * import from here rather than reaching into services.
 */
export { AuthProvider, useAuth } from './AuthProvider'
export { useSession } from './hooks/useSession'
export {
  GUEST_PATHS,
  AUTH_PATHS,
  AUTH_CONFIRM_PATH,
  AUTH_CALLBACK_PATH,
  APP_ROLES,
} from './types'
export { default as AuthConfirmPage } from './pages/AuthConfirmPage'
export { default as AuthCallbackPage } from './pages/AuthCallbackPage'
export { default as ProtectedRoute } from './components/ProtectedRoute'
export { default as GuestRoute } from './components/GuestRoute'
export { default as EmailOtpVerify } from './components/EmailOtpVerify'
export { default as OtpBoxes, maskEmail } from './components/OtpBoxes'
export { signInWithGoogle, signInWithApple } from './services/oauth'
