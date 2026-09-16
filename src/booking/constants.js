/** Booking Engine — lifecycle constants (enterprise SSOT) */

export const BOOKING_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_PROCESSING: 'payment_processing',
  CONFIRMED: 'confirmed',
  UPCOMING: 'upcoming',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
  NO_SHOW: 'no_show',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
})

/** Legacy appointmentJourney aliases mapped onto engine statuses */
export const LEGACY_STATUS_MAP = Object.freeze({
  booked: BOOKING_STATUS.CONFIRMED,
  payment_pending: BOOKING_STATUS.PENDING_PAYMENT,
  checked_in: BOOKING_STATUS.CHECKED_IN,
})

export const PAYMENT_STATUS = Object.freeze({
  NONE: 'none',
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
})

export const BOOKING_EVENT = Object.freeze({
  CREATED: 'booking.created',
  UPDATED: 'booking.updated',
  DRAFT_SAVED: 'booking.draft_saved',
  PAYMENT_STARTED: 'payment.started',
  PAYMENT_METHOD_SET: 'payment.method_set',
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_EXPIRED: 'payment.expired',
  PAYMENT_REFRESHED: 'payment.refreshed',
  CONFIRMED: 'booking.confirmed',
  PREP_UPDATED: 'booking.prep_updated',
  CHECKED_IN: 'booking.checked_in',
  CHECKIN_CANCELLED: 'booking.checkin_cancelled',
  RESCHEDULE_STARTED: 'booking.reschedule_started',
  RESCHEDULED: 'booking.rescheduled',
  CANCELLED: 'booking.cancelled',
  COMPLETED: 'booking.completed',
  NO_SHOW: 'booking.no_show',
  REFUNDED: 'booking.refunded',
  EXPIRED: 'booking.expired',
  RESUMED: 'booking.resumed',
  ROLLBACK: 'booking.rollback',
})

export const ACTIVE_STATUSES = Object.freeze([
  BOOKING_STATUS.DRAFT,
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PAYMENT_PROCESSING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
])

/** Confirmed visits only — drafts and unpaid checkouts are not upcoming appointments. */
export const CONFIRMED_APPOINTMENT_STATUSES = Object.freeze([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
])

export const HOME_VISIBLE_STATUSES = CONFIRMED_APPOINTMENT_STATUSES

export const STORAGE_KEYS = Object.freeze({
  DB: 'healthhero:booking-engine:v2',
  ACTIVE_ID: 'healthhero:booking-engine:active-id:v2',
  LEGACY_PAYMENT: 'healthhero:payment-session.v2',
})

export const ENGINE_VERSION = 2
