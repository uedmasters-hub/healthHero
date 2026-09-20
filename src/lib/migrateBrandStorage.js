/**
 * One-time localStorage migration from Health Hero → eMedicalls keys.
 * Preserves auth sessions and local care data. Safe to call repeatedly.
 */
import {
  AUTH_STORAGE_KEY,
  AUTH_STORAGE_KEY_LEGACY,
  BRAND_STORAGE,
} from './brand'

function copyKey(from, to) {
  if (typeof localStorage === 'undefined') return
  try {
    if (localStorage.getItem(to) != null) return
    const value = localStorage.getItem(from)
    if (value == null) return
    localStorage.setItem(to, value)
  } catch {
    /* private mode / quota */
  }
}

function copyPrefixedKeys(legacyPrefix, nextPrefix) {
  if (typeof localStorage === 'undefined') return
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(legacyPrefix)) keys.push(key)
    }
    keys.forEach((legacyKey) => {
      const nextKey = `${nextPrefix}${legacyKey.slice(legacyPrefix.length)}`
      copyKey(legacyKey, nextKey)
    })
  } catch {
    /* ignore */
  }
}

let migrated = false

export function migrateLegacyBrandStorage() {
  if (migrated || typeof localStorage === 'undefined') return
  migrated = true

  copyKey(AUTH_STORAGE_KEY_LEGACY, AUTH_STORAGE_KEY)
  copyKey(BRAND_STORAGE.usersDbLegacy, BRAND_STORAGE.usersDb)
  copyKey(BRAND_STORAGE.sessionLegacy, BRAND_STORAGE.session)
  copyKey(BRAND_STORAGE.onboardingLegacy, BRAND_STORAGE.onboarding)
  copyKey(BRAND_STORAGE.bookingDbLegacy, BRAND_STORAGE.bookingDb)
  copyKey(BRAND_STORAGE.bookingActiveLegacy, BRAND_STORAGE.bookingActive)
  copyKey(BRAND_STORAGE.bookingPaymentLegacyOld, BRAND_STORAGE.bookingPaymentLegacy)
  copyKey(BRAND_STORAGE.reviewsLegacy, BRAND_STORAGE.reviews)
  copyKey(BRAND_STORAGE.recentDoctorsLegacy, BRAND_STORAGE.recentDoctors)
  copyKey(BRAND_STORAGE.notificationsLegacy, BRAND_STORAGE.notifications)
  copyKey(BRAND_STORAGE.notificationsSeedLegacy, BRAND_STORAGE.notificationsSeed)

  copyPrefixedKeys(BRAND_STORAGE.onboardingUserPrefixLegacy, BRAND_STORAGE.onboardingUserPrefix)
  copyPrefixedKeys(BRAND_STORAGE.paymentSessionPrefixLegacy, BRAND_STORAGE.paymentSessionPrefix)
  copyPrefixedKeys(BRAND_STORAGE.syncPrefixLegacy, BRAND_STORAGE.syncPrefix)
  // Scoped booking engine keys: healthhero:booking-engine:v2:<scope>
  copyPrefixedKeys(`${BRAND_STORAGE.bookingDbLegacy}:`, `${BRAND_STORAGE.bookingDb}:`)
  copyPrefixedKeys(`${BRAND_STORAGE.bookingActiveLegacy}:`, `${BRAND_STORAGE.bookingActive}:`)
}

// Run as soon as this module is evaluated (before Supabase client init).
migrateLegacyBrandStorage()
