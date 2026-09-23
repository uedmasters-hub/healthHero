/** Appointment lifecycle — path, CTAs, menus, and cancel policy SSOT */

import {
  EDIT_LOCK_MINUTES,
  PREP_LOCK_MESSAGE,
  getAppointmentStart,
  getBookingWindow,
} from './bookingPolicy'
import { readPaymentSession } from './paymentSession'
import { getBookingEngine } from '../booking/engine'
import { BOOKING_STATUS, PAYMENT_STATUS } from '../booking/constants'
import {
  VISIT_PHASE,
  resolveVisitPhase,
} from '../booking/visitLifecycle'

function sessionPathForPayment(booking) {
  try {
    const path = getBookingEngine().getResumePath(booking?.engineId || booking?.id)
    if (path === '/verify-payment' || path === '/process-payment') return path
  } catch {
    /* fall through */
  }
  const session = readPaymentSession()
  if (session?.step === 'verify') return '/verify-payment'
  return '/process-payment'
}

export const APPOINTMENT_STATUS = {
  BOOKED: 'booked',
  CHECKED_IN: 'checked_in',
  PAYMENT_PENDING: 'payment_pending',
  // Engine-aligned aliases for gradual migration
  CONFIRMED: BOOKING_STATUS.CONFIRMED,
  IN_PROGRESS: BOOKING_STATUS.IN_PROGRESS,
  AWAITING_COMPLETION: BOOKING_STATUS.AWAITING_COMPLETION,
  EXPIRED: BOOKING_STATUS.EXPIRED,
  CANCELLED: BOOKING_STATUS.CANCELLED,
  COMPLETED: BOOKING_STATUS.COMPLETED,
  REFUNDED: BOOKING_STATUS.REFUNDED,
  NO_SHOW: BOOKING_STATUS.NO_SHOW,
  RESCHEDULED: BOOKING_STATUS.RESCHEDULED,
}

export { BOOKING_STATUS, PAYMENT_STATUS, VISIT_PHASE }

export const APPOINTMENT_STAGE = {
  PAYMENT_PENDING: 'payment_pending',
  NEEDS_PREP: 'needs_prep',
  PREPARED: 'prepared',
  READY: 'ready',
  ACTIVE_VISIT: 'active_visit',
  VISIT_CHECKIN: 'visit_checkin',
  POST_VISIT: 'post_visit',
}

export const MENU_ACTION = {
  VIEW_APPOINTMENT: 'view_appointment',
  RESCHEDULE: 'reschedule',
  CONTACT: 'contact',
  CALENDAR: 'calendar',
  SHARE: 'share',
  INVOICE: 'invoice',
  CANCEL_CHECKIN: 'cancel_checkin',
  CANCEL_APPOINTMENT: 'cancel_appointment',
}

export const PREP_STEPS = [
  { id: 'review', title: 'Review Appointment Details' },
  { id: 'id', title: 'Bring Photo ID & Insurance' },
  { id: 'consultations', title: 'Review Previous Consultations' },
  { id: 'notes', title: 'Add Notes for Your Doctor' },
  { id: 'faqs', title: 'Read FAQs or Related Articles' },
  { id: 'ready', title: "You're Ready for Your Visit" },
]

export function getAppointmentStatus(booking) {
  if (!booking) return null
  return booking.status || APPOINTMENT_STATUS.BOOKED
}

export function isPreparationComplete(booking) {
  return Boolean(booking?.preparationCompleted)
}

export function getPrepStepIndex(booking) {
  const max = PREP_STEPS.length
  const idx = Number(booking?.prepStepIndex) || 0
  return Math.max(0, Math.min(idx, max))
}

export function getAppointmentStage(booking) {
  if (!booking) return null
  if (
    getAppointmentStatus(booking) === APPOINTMENT_STATUS.PAYMENT_PENDING
    || booking.paymentPending
  ) {
    return APPOINTMENT_STAGE.PAYMENT_PENDING
  }
  if (getAppointmentStatus(booking) === APPOINTMENT_STATUS.CHECKED_IN) {
    return APPOINTMENT_STAGE.READY
  }
  if (!isPreparationComplete(booking)) return APPOINTMENT_STAGE.NEEDS_PREP
  return APPOINTMENT_STAGE.PREPARED
}

/**
 * Active context for the current booking.
 * Time phase wins after visit start; prep/check-in apply only while Upcoming.
 */
export function getAppointmentJourney(booking, now = new Date()) {
  const status = getAppointmentStatus(booking)
  const phase = resolveVisitPhase(booking, now)

  if (phase === VISIT_PHASE.VISIT_CHECKIN) {
    return {
      status: APPOINTMENT_STATUS.AWAITING_COMPLETION,
      stage: APPOINTMENT_STAGE.VISIT_CHECKIN,
      phase,
      path: '/appointment',
      badge: 'Visit check-in',
      badgeTone: 'checked_in',
      cta: 'Confirm visit',
      sectionLabel: 'Visit Check-in',
      targetLayout: 'hero',
      sourceLayout: 'appointment',
      prompt: 'Have you completed your visit?',
    }
  }

  if (phase === VISIT_PHASE.ACTIVE_VISIT) {
    return {
      status: APPOINTMENT_STATUS.IN_PROGRESS,
      stage: APPOINTMENT_STAGE.ACTIVE_VISIT,
      phase,
      path: '/appointment',
      badge: 'Active visit',
      badgeTone: 'checked_in',
      cta: 'View visit',
      sectionLabel: 'Active Visit',
      targetLayout: 'hero',
      sourceLayout: 'appointment',
    }
  }

  if (phase === VISIT_PHASE.POST_VISIT) {
    return {
      status: APPOINTMENT_STATUS.COMPLETED,
      stage: APPOINTMENT_STAGE.POST_VISIT,
      phase,
      path: '/post-visit-summary',
      badge: 'Post visit',
      badgeTone: 'prepared',
      cta: 'Open care hub',
      sectionLabel: 'Post Visit',
      targetLayout: 'hero',
      sourceLayout: 'appointment',
    }
  }

  if (phase === VISIT_PHASE.CARE_HISTORY) {
    return {
      status: status || APPOINTMENT_STATUS.COMPLETED,
      stage: APPOINTMENT_STAGE.POST_VISIT,
      phase,
      path: '/post-visit-summary',
      badge: 'Completed',
      badgeTone: 'prepared',
      cta: 'View summary',
      sectionLabel: 'Care History',
      targetLayout: 'appointment',
      sourceLayout: 'appointment',
    }
  }

  const stage = getAppointmentStage(booking)

  switch (stage) {
    case APPOINTMENT_STAGE.PAYMENT_PENDING:
      return {
        status: APPOINTMENT_STATUS.PAYMENT_PENDING,
        stage,
        phase,
        path: sessionPathForPayment(booking),
        badge: 'Payment pending',
        badgeTone: 'booked',
        cta: 'Complete payment',
        sectionLabel: 'Pending Booking',
        targetLayout: 'appointment',
        sourceLayout: 'appointment',
      }
    case APPOINTMENT_STAGE.READY:
      return {
        status: APPOINTMENT_STATUS.CHECKED_IN,
        stage,
        phase,
        path: '/pre-checkin',
        badge: 'Ready for Visit',
        badgeTone: 'checked_in',
        cta: 'Ready for Visit',
        sectionLabel: 'Upcoming Appointment',
        targetLayout: 'hero',
        sourceLayout: 'appointment',
      }
    case APPOINTMENT_STAGE.NEEDS_PREP:
      return {
        status: APPOINTMENT_STATUS.BOOKED,
        stage,
        phase,
        path: '/prepare-visit',
        badge: 'Booked',
        badgeTone: 'booked',
        cta: 'Prepare for My Visit',
        sectionLabel: 'Upcoming Appointment',
        targetLayout: 'appointment',
        sourceLayout: 'appointment',
      }
    case APPOINTMENT_STAGE.PREPARED:
    default:
      return {
        status: status || APPOINTMENT_STATUS.BOOKED,
        stage: APPOINTMENT_STAGE.PREPARED,
        phase,
        path: '/appointment',
        badge: 'Prepared',
        badgeTone: 'prepared',
        cta: 'View appointment',
        sectionLabel: 'Upcoming Appointment',
        targetLayout: 'appointment',
        sourceLayout: 'appointment',
      }
  }
}

export function resolveAppointmentPath(booking, now = new Date()) {
  if (!booking) return '/'
  return getAppointmentJourney(booking, now).path
}

function buildMenuItems({
  surface,
  canReschedule,
  canCancelAppointment,
  canCancelCheckIn,
}) {
  const items = []

  if (surface === 'ready') {
    items.push({
      id: MENU_ACTION.VIEW_APPOINTMENT,
      label: 'View Appointment',
      tone: 'default',
      action: MENU_ACTION.VIEW_APPOINTMENT,
    })
  }

  if (canReschedule && (surface === 'details' || surface === 'confirm' || surface === 'ready')) {
    items.push({
      id: MENU_ACTION.RESCHEDULE,
      label: 'Reschedule Appointment',
      tone: 'default',
      action: MENU_ACTION.RESCHEDULE,
    })
  }

  items.push(
    {
      id: MENU_ACTION.CONTACT,
      label: 'Contact Clinic',
      tone: 'default',
      action: MENU_ACTION.CONTACT,
    },
    {
      id: MENU_ACTION.CALENDAR,
      label: 'Add to Calendar',
      tone: 'default',
      action: MENU_ACTION.CALENDAR,
    },
  )

  if (surface === 'details' || surface === 'confirm') {
    items.push(
      {
        id: MENU_ACTION.SHARE,
        label: 'Share Appointment',
        tone: 'default',
        action: MENU_ACTION.SHARE,
      },
      {
        id: MENU_ACTION.INVOICE,
        label: 'View Invoice',
        tone: 'default',
        action: MENU_ACTION.INVOICE,
      },
    )
  }

  // Destructive actions last; Cancel Appointment is always the final item when present.
  if (canCancelCheckIn) {
    items.push({
      id: MENU_ACTION.CANCEL_CHECKIN,
      label: 'Cancel Check-In',
      tone: 'danger',
      action: MENU_ACTION.CANCEL_CHECKIN,
    })
  }

  if (canCancelAppointment) {
    items.push({
      id: MENU_ACTION.CANCEL_APPOINTMENT,
      label: 'Cancel Appointment',
      tone: 'danger',
      action: MENU_ACTION.CANCEL_APPOINTMENT,
    })
  }

  return items
}

function primaryCtaForSurface(surface, journey, stage) {
  if (surface === 'confirm') {
    return {
      label: journey.cta,
      path: journey.path,
      action: stage === APPOINTMENT_STAGE.NEEDS_PREP ? 'prepare' : 'resume',
    }
  }

  if (surface === 'ready') {
    return {
      label: 'Get Directions',
      path: null,
      action: 'directions',
    }
  }

  if (surface === 'details') {
    if (stage === APPOINTMENT_STAGE.READY) {
      return {
        label: 'Ready for Visit',
        path: '/pre-checkin',
        action: 'resume',
      }
    }
    return {
      label: "I'm Ready for My Visit",
      path: '/pre-checkin',
      action: 'check_in',
    }
  }

  return {
    label: journey.cta,
    path: journey.path,
    action: 'resume',
  }
}

/**
 * Shared appointment capabilities + menu for every surface.
 *
 * Cancel Appointment — destroys the booking; only when more than 45 minutes away.
 * Cancel Check-In — reverses readiness only; allowed while checked in and not past start.
 * Inside the 45-minute lock, Cancel Appointment is hidden everywhere.
 *
 * @param {'details' | 'confirm' | 'ready' | 'home'} surface
 */
export function getAppointmentActions(booking, now = new Date(), { surface = 'details' } = {}) {
  const journey = getAppointmentJourney(booking)
  const stage = journey.stage
  const start = booking?.date && booking?.time
    ? getAppointmentStart(booking.date, booking.time)
    : null
  const window = start
    ? getBookingWindow(start, now)
    : {
        minutesUntil: Number.POSITIVE_INFINITY,
        isPast: false,
        isLocked: false,
        isQuickBook: false,
        mode: 'standard',
      }

  const canCancelAppointment = Boolean(booking) && !window.isLocked
  // Check-in cancel stays available in the lock window until the appointment start has passed.
  const canCancelCheckIn = stage === APPOINTMENT_STAGE.READY && !window.isPast
  const canReschedule = canCancelAppointment

  return {
    ...journey,
    stage,
    start,
    minutesUntil: window.minutesUntil,
    isPast: window.isPast,
    isLocked: window.isLocked,
    isQuickBook: window.isQuickBook,
    mode: window.mode,
    lockMinutes: EDIT_LOCK_MINUTES,
    lockMessage: PREP_LOCK_MESSAGE,
    canCancelAppointment,
    canCancelCheckIn,
    canReschedule,
    canEditBooking: !window.isLocked,
    menuItems: buildMenuItems({
      surface,
      canReschedule,
      canCancelAppointment,
      canCancelCheckIn,
    }),
    primaryCta: primaryCtaForSurface(surface, journey, stage),
  }
}

export function withBookingStatus(booking, status) {
  if (!booking) return booking
  return { ...booking, status }
}

export function withPreparationProgress(booking, { prepStepIndex, preparationCompleted } = {}) {
  if (!booking) return booking
  return {
    ...booking,
    ...(prepStepIndex != null ? { prepStepIndex } : null),
    ...(preparationCompleted != null ? { preparationCompleted } : null),
  }
}

export function markPreparationComplete(booking) {
  return withPreparationProgress(booking, {
    preparationCompleted: true,
    prepStepIndex: PREP_STEPS.length,
  })
}

/** Seed lifecycle fields for bookings opened from Treat / care history. */
export function withLifecycleDefaults(booking, {
  status = APPOINTMENT_STATUS.BOOKED,
  preparationCompleted = true,
} = {}) {
  if (!booking) return booking
  return {
    ...booking,
    status: booking.status || status,
    preparationCompleted: booking.preparationCompleted ?? preparationCompleted,
    prepStepIndex: booking.prepStepIndex ?? (preparationCompleted ? PREP_STEPS.length : 0),
  }
}
