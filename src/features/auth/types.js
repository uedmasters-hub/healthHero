/**
 * @file src/features/auth/types.js
 * Shared authentication contracts. Health Hero is JavaScript; these typedefs
 * document the identity layer without introducing a second user model.
 *
 * Identity SSOT: auth.users (Supabase) → public.users (profile / RBAC)
 * Care SSOT: local health chart keyed by auth.users.id (src/user)
 */

/**
 * @typedef {'patient' | 'doctor' | 'staff' | 'admin'} AppRole
 */

/**
 * @typedef {object} AuthSessionState
 * @property {boolean} ready
 * @property {import('@supabase/supabase-js').Session | null} session
 * @property {import('@supabase/supabase-js').User | null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isRecovery
 * @property {string | null} lastEvent
 */

/**
 * @typedef {object} AuthResult
 * @property {boolean} ok
 * @property {string} [error]
 * @property {string} [code]
 * @property {boolean} [needsVerification]
 * @property {boolean} [isRecovery]
 * @property {object} [user]
 * @property {object} [session]
 */

/**
 * @typedef {object} PublicUserRow
 * @property {string} id
 * @property {string | null} email
 * @property {string | null} full_name
 * @property {string | null} phone
 * @property {AppRole} role
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 */

export const APP_ROLES = Object.freeze(['patient', 'doctor', 'staff', 'admin'])

export const AUTH_PATHS = Object.freeze({
  login: '/login',
  register: '/register',
  forgot: '/forgot',
  reset: '/reset',
  verify: '/verify',
})

export const GUEST_PATHS = Object.freeze(Object.values(AUTH_PATHS))
