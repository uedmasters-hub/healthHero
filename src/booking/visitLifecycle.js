/**
 * Visit lifecycle SSOT — time-based phases for Home / journey / ticker.
 * Persisted statuses map to phases; clock time gates Upcoming vs Active vs Check-in.
 */

import { BOOKING_STATUS } from './constants'
import { getAppointmentStart } from '../lib/bookingPolicy'

export const VISIT_PHASE = Object.freeze({
  NONE: 'none',
  UPCOMING: 'upcoming',
  ACTIVE_VISIT: 'active_visit',
  VISIT_CHECKIN: 'visit_checkin',
  POST_VISIT: 'post_visit',
  CARE_HISTORY: 'care_history',
})

export const SNOOZE_MS = 2 * 60 * 60 * 1000
export const NO_SHOW_AFTER_END_MS = 48 * 60 * 60 * 1000
export const POST_VISIT_MS = 24 * 60 * 60 * 1000

const PRE_VISIT_STATUSES = new Set([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
])

const LIVE_STATUSES = new Set([
  BOOKING_STATUS.IN_PROGRESS,
  'consultation_active',
])

const AWAITING_STATUSES = new Set([
  BOOKING_STATUS.AWAITING_COMPLETION,
])

function parseDurationMinutes(record) {
  const raw = record?.schedule?.duration ?? record?.duration ?? 30
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(5, raw)
  const match = String(raw).match(/(\d+)/)
  return Math.max(5, match ? Number(match[1]) : 30)
}

function asDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Bounds for a booking record or legacy booking view model. */
export function getVisitBounds(record) {
  if (!record) {
    return { start: null, end: null, postVisitUntil: null, durationMinutes: 30 }
  }

  const date = record.schedule?.date || record.date
  const time = record.schedule?.time || record.time
  let start = null
  if (date && time) {
    try {
      start = getAppointmentStart(date, time)
    } catch {
      start = null
    }
  }
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) start = null

  const durationMinutes = parseDurationMinutes(record)
  const end = start
    ? new Date(start.getTime() + durationMinutes * 60_000)
    : null

  const postFromMeta = asDate(
    record.meta?.postVisitUntil
    || record.postVisitUntil
    || record.meta?.post_visit_until,
  )
  const completedAt = asDate(
    record.meta?.completedAt
    || record.completedAt
    || record.meta?.completed_at,
  )
  const postVisitUntil = postFromMeta
    || (completedAt ? new Date(completedAt.getTime() + POST_VISIT_MS) : null)

  return { start, end, postVisitUntil, durationMinutes, completedAt }
}

export function desiredStatusForTime(record, now = new Date()) {
  const status = String(record?.status || '')
  const { start, end } = getVisitBounds(record)
  if (!start || !end) return null

  const t = now instanceof Date ? now : new Date(now)
  const terminal = new Set([
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.REFUNDED,
    BOOKING_STATUS.DRAFT,
    BOOKING_STATUS.PENDING_PAYMENT,
    BOOKING_STATUS.PAYMENT_PROCESSING,
    BOOKING_STATUS.RESCHEDULED,
  ])
  if (terminal.has(status)) return null

  if (t.getTime() >= end.getTime() + NO_SHOW_AFTER_END_MS) {
    if (
      PRE_VISIT_STATUSES.has(status)
      || LIVE_STATUSES.has(status)
      || AWAITING_STATUSES.has(status)
    ) {
      return BOOKING_STATUS.NO_SHOW
    }
    return null
  }

  if (t.getTime() >= end.getTime()) {
    if (PRE_VISIT_STATUSES.has(status) || LIVE_STATUSES.has(status)) {
      return BOOKING_STATUS.AWAITING_COMPLETION
    }
    return null
  }

  if (t.getTime() >= start.getTime()) {
    if (PRE_VISIT_STATUSES.has(status)) return BOOKING_STATUS.IN_PROGRESS
    return null
  }

  return null
}

/**
 * Resolve Home / journey phase from persisted status + clock.
 * Past-time confirmed/checked_in never resolve as upcoming.
 */
export function resolveVisitPhase(record, now = new Date()) {
  if (!record) return VISIT_PHASE.NONE
  const status = String(record.status || '')
  const t = now instanceof Date ? now : new Date(now)
  const { start, end, postVisitUntil } = getVisitBounds(record)

  if (
    [
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.EXPIRED,
      BOOKING_STATUS.REFUNDED,
      BOOKING_STATUS.NO_SHOW,
    ].includes(status)
  ) {
    return VISIT_PHASE.CARE_HISTORY
  }

  if (status === BOOKING_STATUS.COMPLETED) {
    if (postVisitUntil && t.getTime() < postVisitUntil.getTime()) {
      return VISIT_PHASE.POST_VISIT
    }
    return VISIT_PHASE.CARE_HISTORY
  }

  if (
    [
      BOOKING_STATUS.DRAFT,
      BOOKING_STATUS.PENDING_PAYMENT,
      BOOKING_STATUS.PAYMENT_PROCESSING,
      BOOKING_STATUS.RESCHEDULED,
    ].includes(status)
  ) {
    return VISIT_PHASE.NONE
  }

  // Prefer persisted awaiting / in_progress; also coerce overdue pre-visit statuses.
  if (AWAITING_STATUSES.has(status)) return VISIT_PHASE.VISIT_CHECKIN
  if (LIVE_STATUSES.has(status)) {
    if (end && t.getTime() >= end.getTime()) return VISIT_PHASE.VISIT_CHECKIN
    return VISIT_PHASE.ACTIVE_VISIT
  }

  if (PRE_VISIT_STATUSES.has(status)) {
    if (!start) return VISIT_PHASE.UPCOMING
    if (t.getTime() < start.getTime()) return VISIT_PHASE.UPCOMING
    if (end && t.getTime() < end.getTime()) return VISIT_PHASE.ACTIVE_VISIT
    return VISIT_PHASE.VISIT_CHECKIN
  }

  return VISIT_PHASE.NONE
}

export function isHomeHeroPhase(phase) {
  return [
    VISIT_PHASE.ACTIVE_VISIT,
    VISIT_PHASE.VISIT_CHECKIN,
    VISIT_PHASE.POST_VISIT,
  ].includes(phase)
}

export function snoozeUntil(now = new Date()) {
  const t = now instanceof Date ? now : new Date(now)
  return new Date(t.getTime() + SNOOZE_MS).toISOString()
}
