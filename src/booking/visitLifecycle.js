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
  WAITING_PROVIDER: 'waiting_provider',
  POST_VISIT: 'post_visit',
  CARE_HISTORY: 'care_history',
})

/** "Not yet" keeps the visit active and re-prompts after 30 minutes. */
export const SNOOZE_MS = 30 * 60 * 1000
export const NO_SHOW_AFTER_END_MS = 48 * 60 * 60 * 1000
export const POST_VISIT_MS = 24 * 60 * 60 * 1000

const PRE_VISIT_STATUSES = new Set([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
])

const LIVE_STATUSES = new Set([
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.VISIT_ACTIVE,
  BOOKING_STATUS.TESTS_IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
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

function reminderUntil(record) {
  return asDate(
    record?.meta?.visitReminderAt
    || record?.meta?.confirmationSnoozeUntil
    || record?.confirmationSnoozeUntil
    || record?.meta?.confirmation_snooze_until,
  )
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

  return {
    start,
    end,
    postVisitUntil,
    durationMinutes,
    completedAt,
    reminderUntil: reminderUntil(record),
  }
}

export function desiredStatusForTime(record, now = new Date()) {
  const status = String(record?.status || '')
  const { start, end, reminderUntil: reminder } = getVisitBounds(record)
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
    BOOKING_STATUS.RESCHEDULE_REQUESTED,
  ])
  if (terminal.has(status)) return null

  // Reminder elapsed while visit was kept active → re-prompt Visit Check-in.
  // Evaluated before schedule bounds so restore still works if date parsing fails.
  if (
    (status === BOOKING_STATUS.VISIT_ACTIVE
      || status === BOOKING_STATUS.TESTS_IN_PROGRESS
      || status === BOOKING_STATUS.PAUSED)
    && reminder
    && t.getTime() >= reminder.getTime()
  ) {
    return BOOKING_STATUS.AWAITING_COMPLETION
  }

  if (!start || !end) return null

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
    if (PRE_VISIT_STATUSES.has(status) || status === BOOKING_STATUS.IN_PROGRESS) {
      return BOOKING_STATUS.AWAITING_COMPLETION
    }
    // visit_active / tests / paused stay until reminder unless past no-show window.
    if (
      status === BOOKING_STATUS.VISIT_ACTIVE
      || status === BOOKING_STATUS.TESTS_IN_PROGRESS
      || status === BOOKING_STATUS.PAUSED
    ) {
      if (!reminder || t.getTime() >= reminder.getTime()) {
        return BOOKING_STATUS.AWAITING_COMPLETION
      }
      return null
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
 * Snooze / visit reminder keeps Visit in Progress until it elapses.
 */
export function resolveVisitPhase(record, now = new Date()) {
  if (!record) return VISIT_PHASE.NONE
  const status = String(record.status || '')
  const t = now instanceof Date ? now : new Date(now)
  const { start, end, postVisitUntil, reminderUntil: reminder } = getVisitBounds(record)

  if (
    [
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.EXPIRED,
      BOOKING_STATUS.REFUNDED,
      BOOKING_STATUS.NO_SHOW,
      BOOKING_STATUS.RESCHEDULE_REQUESTED,
    ].includes(status)
  ) {
    return VISIT_PHASE.CARE_HISTORY
  }

  if (status === BOOKING_STATUS.COMPLETED_PENDING_PROVIDER) {
    return VISIT_PHASE.WAITING_PROVIDER
  }

  if (status === BOOKING_STATUS.COMPLETED) {
    const reconciliation = String(
      record.meta?.reconciliationStatus
      || record.reconciliationStatus
      || '',
    )
    if (reconciliation === 'awaiting_provider') return VISIT_PHASE.WAITING_PROVIDER
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

  // Kept-active / exception live states → Visit in Progress until reminder.
  if (LIVE_STATUSES.has(status)) {
    if (reminder && t.getTime() < reminder.getTime()) return VISIT_PHASE.ACTIVE_VISIT
    if (status === BOOKING_STATUS.VISIT_ACTIVE
      || status === BOOKING_STATUS.TESTS_IN_PROGRESS
      || status === BOOKING_STATUS.PAUSED) {
      return VISIT_PHASE.VISIT_CHECKIN
    }
    if (end && t.getTime() >= end.getTime()) return VISIT_PHASE.VISIT_CHECKIN
    return VISIT_PHASE.ACTIVE_VISIT
  }

  if (AWAITING_STATUSES.has(status)) {
    // Legacy snooze: hide check-in prompt while reminder is in the future.
    if (reminder && t.getTime() < reminder.getTime()) return VISIT_PHASE.ACTIVE_VISIT
    return VISIT_PHASE.VISIT_CHECKIN
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
    VISIT_PHASE.WAITING_PROVIDER,
    VISIT_PHASE.POST_VISIT,
  ].includes(phase)
}

export function snoozeUntil(now = new Date()) {
  const t = now instanceof Date ? now : new Date(now)
  return new Date(t.getTime() + SNOOZE_MS).toISOString()
}
