/**
 * Provider chat eligibility and booking status display helpers.
 * Chat is part of the appointment journey — only after check-in (and related care states).
 */
import { BOOKING_STATUS } from '../../booking/constants'
import { flowState } from '../../lib/careFlow'

/** Statuses where messaging the care provider is allowed. */
export const PROVIDER_CHAT_ENABLED_STATUSES = Object.freeze([
  BOOKING_STATUS.CHECKED_IN,
  'in_progress',
  'consultation_active',
  BOOKING_STATUS.COMPLETED,
])

const STATUS_LABELS = Object.freeze({
  [BOOKING_STATUS.DRAFT]: 'Draft',
  [BOOKING_STATUS.PENDING_PAYMENT]: 'Payment pending',
  [BOOKING_STATUS.PAYMENT_PROCESSING]: 'Processing payment',
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.UPCOMING]: 'Upcoming',
  [BOOKING_STATUS.CHECKED_IN]: 'Checked in',
  in_progress: 'In consultation',
  consultation_active: 'In consultation',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.RESCHEDULED]: 'Rescheduled',
  [BOOKING_STATUS.NO_SHOW]: 'No show',
  [BOOKING_STATUS.EXPIRED]: 'Expired',
  [BOOKING_STATUS.REFUNDED]: 'Refunded',
  // Legacy journey aliases
  booked: 'Confirmed',
  payment_pending: 'Payment pending',
  checked_in: 'Checked in',
})

export function isProviderChatEnabled(bookingOrStatus) {
  const status = typeof bookingOrStatus === 'string'
    ? bookingOrStatus
    : bookingOrStatus?.status
  return PROVIDER_CHAT_ENABLED_STATUSES.includes(status)
}

export function formatBookingStatusLabel(status) {
  if (!status) return ''
  return STATUS_LABELS[status] || String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function providerThreadPath(conversationId) {
  return `/chat/${conversationId}`
}

/**
 * Navigation state for opening a chat thread while preserving origin.
 * Back returns to `returnTo` (source route); inbox opens use `/chat`.
 */
export function chatLaunchState(source, {
  from = 'contextual',
  returnTo,
  ...extra
} = {}) {
  const prev = source?.state ? source.state : (source || {})
  const path = typeof source === 'string'
    ? source
    : (source?.pathname || prev.returnTo || '/chat')
  return flowState(prev, {
    from,
    returnTo: returnTo || path,
    ...extra,
  })
}

/** Build metadata stored on a provider conversation from a booking record. */
export function providerMetadataFromBooking(booking = {}) {
  const doctor = booking.doctor || {}
  const date = booking.date
  const visitLabel = [
    date?.dayName || null,
    booking.slot || booking.time || null,
  ].filter(Boolean).join(' · ')

  return {
    provider_name: doctor.name || '',
    specialty: doctor.specialty || '',
    visit_type: booking.visitType || booking.visit_type || '',
    visit_label: visitLabel || booking.slot || booking.time || '',
    booking_status: booking.status || '',
    doctor_id: doctor.id ?? null,
    photo: doctor.photo || '',
  }
}
