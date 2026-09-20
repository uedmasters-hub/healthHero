/**
 * @file src/features/auth/types.js
 * Shared authentication contracts.
 */

/**
 * @typedef {'patient' | 'doctor' | 'staff' | 'admin'} AppRole
 */

export const APP_ROLES = Object.freeze(['patient', 'doctor', 'staff', 'admin'])

export const AUTH_PATHS = Object.freeze({
  login: '/login',
  register: '/register',
  forgot: '/forgot',
  reset: '/reset',
  verify: '/verify',
  otp: '/otp',
  /** Single source of truth for completing OAuth / magic-link / recovery. */
  confirm: '/auth/confirm',
  /** Legacy alias — AuthGate redirects to /auth/confirm. */
  callback: '/auth/callback',
})

export const AUTH_CONFIRM_PATH = AUTH_PATHS.confirm
/** @deprecated Use AUTH_CONFIRM_PATH */
export const AUTH_CALLBACK_PATH = AUTH_PATHS.confirm

export const GUEST_PATHS = Object.freeze([
  AUTH_PATHS.login,
  AUTH_PATHS.register,
  AUTH_PATHS.forgot,
  AUTH_PATHS.reset,
  AUTH_PATHS.verify,
  AUTH_PATHS.otp,
])
