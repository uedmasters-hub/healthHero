/** Lifecycle transitions — guarded, auditable */

import { BOOKING_EVENT, BOOKING_STATUS, PAYMENT_STATUS } from './constants'
import { appendHistory, createPaymentContext, normalizeStatus } from './models'

const ALLOWED = {
  [BOOKING_STATUS.DRAFT]: [
    BOOKING_STATUS.PENDING_PAYMENT,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PENDING_PAYMENT]: [
    BOOKING_STATUS.PAYMENT_PROCESSING,
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.DRAFT,
  ],
  [BOOKING_STATUS.PAYMENT_PROCESSING]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.PENDING_PAYMENT,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.UPCOMING,
    BOOKING_STATUS.CHECKED_IN,
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.NO_SHOW,
  ],
  [BOOKING_STATUS.UPCOMING]: [
    BOOKING_STATUS.CHECKED_IN,
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.NO_SHOW,
  ],
  [BOOKING_STATUS.CHECKED_IN]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.UPCOMING,
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.IN_PROGRESS]: [
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.TESTS_IN_PROGRESS,
    BOOKING_STATUS.PAUSED,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
  ],
  [BOOKING_STATUS.VISIT_ACTIVE]: [
    BOOKING_STATUS.TESTS_IN_PROGRESS,
    BOOKING_STATUS.PAUSED,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
  ],
  [BOOKING_STATUS.TESTS_IN_PROGRESS]: [
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.PAUSED,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PAUSED]: [
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.TESTS_IN_PROGRESS,
    BOOKING_STATUS.AWAITING_COMPLETION,
    BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
  ],
  [BOOKING_STATUS.AWAITING_COMPLETION]: [
    BOOKING_STATUS.VISIT_ACTIVE,
    BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
    BOOKING_STATUS.TESTS_IN_PROGRESS,
    BOOKING_STATUS.PAUSED,
  ],
  [BOOKING_STATUS.COMPLETED_PENDING_PROVIDER]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
  ],
  [BOOKING_STATUS.RESCHEDULE_REQUESTED]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.UPCOMING,
    BOOKING_STATUS.RESCHEDULED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.RESCHEDULED]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.UPCOMING],
  [BOOKING_STATUS.CANCELLED]: [BOOKING_STATUS.REFUNDED],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.NO_SHOW]: [BOOKING_STATUS.REFUNDED],
  [BOOKING_STATUS.EXPIRED]: [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.DRAFT, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.REFUNDED]: [],
}

export function canTransition(from, to) {
  const current = normalizeStatus(from)
  const next = normalizeStatus(to)
  if (current === next) return true
  return (ALLOWED[current] || []).includes(next)
}

export function transitionBooking(record, nextStatus, { event, payload = {}, patch = {} } = {}) {
  const from = normalizeStatus(record.status)
  const to = normalizeStatus(nextStatus)
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid booking transition: ${from} → ${to}`)
    err.code = 'INVALID_TRANSITION'
    err.from = from
    err.to = to
    throw err
  }

  const now = new Date().toISOString()
  let next = {
    ...record,
    ...patch,
    status: to,
    schedule: { ...record.schedule, ...(patch.schedule || {}) },
    payment: { ...record.payment, ...(patch.payment || {}) },
    meta: {
      ...record.meta,
      ...(patch.meta || {}),
      updatedAt: now,
      ...(to === BOOKING_STATUS.CONFIRMED || to === BOOKING_STATUS.UPCOMING
        ? { confirmedAt: record.meta?.confirmedAt || now }
        : {}),
      ...(to === BOOKING_STATUS.CANCELLED ? { cancelledAt: now } : {}),
      ...(to === BOOKING_STATUS.COMPLETED ? { completedAt: now } : {}),
      ...(to === BOOKING_STATUS.IN_PROGRESS || to === BOOKING_STATUS.VISIT_ACTIVE
        ? { startedAt: record.meta?.startedAt || now }
        : {}),
      ...(to === BOOKING_STATUS.NO_SHOW ? { completedAt: record.meta?.completedAt || now } : {}),
      lifecycle: to,
    },
  }

  next = appendHistory(next, event || BOOKING_EVENT.UPDATED, { from, to, ...payload })
  return next
}

export function applyPaymentSuccess(record, paymentPatch = {}) {
  const payment = createPaymentContext({
    ...record.payment,
    ...paymentPatch,
    status: PAYMENT_STATUS.PAID,
    paidAt: paymentPatch.paidAt || new Date().toISOString(),
  })
  return transitionBooking(record, BOOKING_STATUS.CONFIRMED, {
    event: BOOKING_EVENT.PAYMENT_SUCCEEDED,
    payload: { orderId: payment.orderId, paymentId: payment.paymentId },
    patch: {
      payment,
      paymentPending: false,
      resumeStep: 'confirm',
      preparationCompleted: false,
      prepStepIndex: 0,
    },
  })
}

export function applyPaymentExpired(record) {
  return transitionBooking(record, BOOKING_STATUS.EXPIRED, {
    event: BOOKING_EVENT.PAYMENT_EXPIRED,
    patch: {
      payment: {
        ...record.payment,
        status: PAYMENT_STATUS.EXPIRED,
      },
      resumeStep: 'checkout',
    },
  })
}

export function applyPaymentProcessing(record) {
  return transitionBooking(record, BOOKING_STATUS.PAYMENT_PROCESSING, {
    event: BOOKING_EVENT.PAYMENT_PROCESSING,
    patch: {
      payment: { ...record.payment, status: PAYMENT_STATUS.PROCESSING },
      resumeStep: 'verify',
    },
  })
}

export function applyPendingPayment(record, paymentPatch = {}) {
  return transitionBooking(record, BOOKING_STATUS.PENDING_PAYMENT, {
    event: BOOKING_EVENT.PAYMENT_STARTED,
    patch: {
      payment: createPaymentContext({
        ...record.payment,
        ...paymentPatch,
        status: PAYMENT_STATUS.PENDING,
      }),
      resumeStep: 'checkout',
    },
  })
}
