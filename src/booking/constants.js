/** Booking Engine — lifecycle constants (enterprise SSOT) */

export const BOOKING_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_PROCESSING: 'payment_processing',
  CONFIRMED: 'confirmed',
  UPCOMING: 'upcoming',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  /** Patient kept the visit open from Visit Check-in ("Not yet"). */
  VISIT_ACTIVE: 'visit_active',
  TESTS_IN_PROGRESS: 'tests_in_progress',
  PAUSED: 'paused',
  AWAITING_COMPLETION: 'awaiting_completion',
  COMPLETED: 'completed',
  COMPLETED_PENDING_PROVIDER: 'completed_pending_provider',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
  RESCHEDULE_REQUESTED: 'reschedule_requested',
  NO_SHOW: 'no_show',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
})

export const PATIENT_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  REPORTED: 'reported',
})

export const PROVIDER_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
})

export const RECONCILIATION_STATUS = Object.freeze({
  PENDING: 'pending',
  AWAITING_PROVIDER: 'awaiting_provider',
  AWAITING_PATIENT: 'awaiting_patient',
  RECONCILED: 'reconciled',
  CONFLICT: 'conflict',
})

export const CARE_PATH = Object.freeze({
  PRESCRIPTION: 'prescription',
  INVESTIGATIONS: 'investigations',
  REFERRAL: 'referral',
  FOLLOW_UP: 'follow_up',
  SURGERY: 'surgery',
  INVOICE: 'invoice',
  MEDICAL_DOCUMENTS: 'medical_documents',
  POST_VISIT_SUMMARY: 'post_visit_summary',
})

export function carePathToRoute(path, bookingId) {
  const focus = path || CARE_PATH.POST_VISIT_SUMMARY
  return {
    pathname: '/post-visit-summary',
    state: {
      bookingId,
      careFocus: focus,
      origin: 'visit-yes',
    },
  }
}

/** Legacy appointmentJourney aliases mapped onto engine statuses */
export const LEGACY_STATUS_MAP = Object.freeze({
  booked: BOOKING_STATUS.CONFIRMED,
  payment_pending: BOOKING_STATUS.PENDING_PAYMENT,
  checked_in: BOOKING_STATUS.CHECKED_IN,
  consultation_active: BOOKING_STATUS.IN_PROGRESS,
  visit_in_progress: BOOKING_STATUS.VISIT_ACTIVE,
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
  VISIT_STARTED: 'booking.visit_started',
  VISIT_KEPT_ACTIVE: 'booking.visit_kept_active',
  VISIT_AWAITING_CONFIRMATION: 'booking.visit_awaiting_confirmation',
  VISIT_COMPLETED: 'booking.completed',
  VISIT_SNOOZED: 'booking.visit_snoozed',
  VISIT_EXCEPTION: 'booking.visit_exception',
  PATIENT_CONFIRMED_COMPLETE: 'booking.patient_confirmed_complete',
  COMPLETED_PENDING_PROVIDER: 'booking.completed_pending_provider',
  PATIENT_VISIT_REPORTED: 'booking.patient_visit_reported',
  PROVIDER_COMPLETED: 'booking.provider_completed',
  VISIT_RECONCILED: 'booking.visit_reconciled',
  TESTS_IN_PROGRESS: 'booking.tests_in_progress',
  VISIT_PAUSED: 'booking.visit_paused',
  RESCHEDULE_STARTED: 'booking.reschedule_started',
  RESCHEDULE_REQUESTED: 'booking.reschedule_requested',
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
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.VISIT_ACTIVE,
  BOOKING_STATUS.TESTS_IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
  BOOKING_STATUS.AWAITING_COMPLETION,
  BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
  BOOKING_STATUS.RESCHEDULE_REQUESTED,
])

/** Confirmed visits only — drafts and unpaid checkouts are not upcoming appointments. */
export const CONFIRMED_APPOINTMENT_STATUSES = Object.freeze([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
])

/** Statuses that may appear on Home (phase filter still applies). */
export const HOME_VISIBLE_STATUSES = Object.freeze([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.VISIT_ACTIVE,
  BOOKING_STATUS.TESTS_IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
  BOOKING_STATUS.AWAITING_COMPLETION,
  BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.RESCHEDULE_REQUESTED,
])

import { BRAND_STORAGE } from '../lib/brand'

export const STORAGE_KEYS = Object.freeze({
  DB: BRAND_STORAGE.bookingDb,
  ACTIVE_ID: BRAND_STORAGE.bookingActive,
  LEGACY_PAYMENT: BRAND_STORAGE.bookingPaymentLegacy,
})

export const ENGINE_VERSION = 2
