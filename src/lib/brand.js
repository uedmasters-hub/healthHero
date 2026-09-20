/**
 * eMedicalls brand constants — single source for product naming & assets.
 * Logo path matches production: https://www.emedicalls.com/img/health_hero.svg
 */
export const BRAND_NAME = 'eMedicalls'
export const BRAND_NAME_LEGAL = 'eMedicalls Technologies Private Limited'
export const BRAND_TAGLINE = 'Doctor Booking'
export const BRAND_SUPPORT_EMAIL = 'support@emedicalls.com'
export const BRAND_ORIGIN = 'https://www.emedicalls.com'

/** Served from /img — same asset as production CDN. */
export const BRAND_LOGO_PATH = '/img/health_hero.svg'
export const BRAND_LOGO_URL = `${BRAND_ORIGIN}${BRAND_LOGO_PATH}`

export const BRAND_DOCUMENT_TITLE = `${BRAND_NAME} - ${BRAND_TAGLINE}`

/** Supabase Auth localStorage key (migrated from healthhero.auth.v1). */
export const AUTH_STORAGE_KEY = 'emedicalls.auth.v1'
export const AUTH_STORAGE_KEY_LEGACY = 'healthhero.auth.v1'

export const BRAND_STORAGE = Object.freeze({
  usersDb: 'emedicalls:users.v1',
  usersDbLegacy: 'healthhero:users.v1',
  session: 'emedicalls:session.v1',
  sessionLegacy: 'healthhero:session.v1',
  onboarding: 'emedicalls.onboardingComplete',
  onboardingLegacy: 'healthhero.onboardingComplete',
  onboardingUserPrefix: 'emedicalls.onboardingComplete.user:',
  onboardingUserPrefixLegacy: 'healthhero.onboardingComplete.user:',
  bookingDb: 'emedicalls:booking-engine:v2',
  bookingDbLegacy: 'healthhero:booking-engine:v2',
  bookingActive: 'emedicalls:booking-engine:active-id:v2',
  bookingActiveLegacy: 'healthhero:booking-engine:active-id:v2',
  bookingPaymentLegacy: 'emedicalls:payment-session.v2',
  bookingPaymentLegacyOld: 'healthhero:payment-session.v2',
  paymentSessionPrefix: 'emedicalls:payment-session.v3:',
  paymentSessionPrefixLegacy: 'healthhero:payment-session.v3:',
  reviews: 'emedicalls.reviews.v2',
  reviewsLegacy: 'healthhero.reviews.v2',
  recentDoctors: 'emedicalls:viewed-doctors',
  recentDoctorsLegacy: 'healthhero:viewed-doctors',
  syncPrefix: 'emedicalls:supabase-sync.v1:',
  syncPrefixLegacy: 'healthhero:supabase-sync.v1:',
  notifications: 'emedicalls_notifications',
  notificationsLegacy: 'hh_notifications',
  notificationsSeed: 'emedicalls_notifications_seeded_v2',
  notificationsSeedLegacy: 'hh_notifications_seeded_v2',
})
