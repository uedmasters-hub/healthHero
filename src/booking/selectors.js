/** Selectors — derived views over the booking database */

import {
  ACTIVE_STATUSES,
  BOOKING_STATUS,
  HOME_VISIBLE_STATUSES,
} from './constants'
import { toLegacyBooking } from './models'
import { HOME_CAROUSEL_LIMIT, getServiceMeta, resolveServiceType } from './serviceTypes'
import { EDIT_LOCK_MINUTES, getAppointmentStart, getBookingWindow } from '../lib/bookingPolicy'
import {
  VISIT_PHASE,
  getVisitBounds,
  isHomeHeroPhase,
  resolveVisitPhase,
} from './visitLifecycle'

export function selectAll(state) {
  return state?.bookings || []
}

export function selectById(state, id) {
  return selectAll(state).find((b) => b.id === id) || null
}

export function selectActive(state) {
  if (!state?.activeBookingId) return null
  return selectById(state, state.activeBookingId)
}

function recencyTs(record) {
  const raw =
    record?.meta?.updatedAt
    || record?.meta?.confirmedAt
    || record?.meta?.createdAt
    || 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

function scheduleTs(record) {
  const full = record?.schedule?.date?.full
  const t = full ? new Date(full).getTime() : 0
  return Number.isFinite(t) ? t : 0
}

export function selectHomeBooking(state, now = new Date()) {
  const surface = selectHomeSurface(state, now)
  return surface?.record || null
}

/**
 * Single Home hero by phase priority:
 * visit_checkin > active_visit > post_visit > next future upcoming
 */
export function selectHomeSurface(state, now = new Date()) {
  const t = now instanceof Date ? now : new Date(now)
  const ranked = selectAll(state)
    .map((record) => {
      const phase = resolveVisitPhase(record, t)
      return { record, phase, bounds: getVisitBounds(record) }
    })
    .filter(({ phase }) => phase !== VISIT_PHASE.NONE && phase !== VISIT_PHASE.CARE_HISTORY)

  const pick = (phase) => {
    const matches = ranked
      .filter((row) => row.phase === phase)
      .sort((a, b) => {
        const as = a.bounds.start?.getTime() || 0
        const bs = b.bounds.start?.getTime() || 0
        return as - bs
      })
    return matches[0] || null
  }

  return (
    pick(VISIT_PHASE.VISIT_CHECKIN)
    || pick(VISIT_PHASE.WAITING_PROVIDER)
    || pick(VISIT_PHASE.ACTIVE_VISIT)
    || pick(VISIT_PHASE.POST_VISIT)
    || pick(VISIT_PHASE.UPCOMING)
    || null
  )
}

/** Future Upcoming only — never past-time or hero phases. */
export function selectHomeCarousel(state, limit = HOME_CAROUSEL_LIMIT, now = new Date()) {
  const t = now instanceof Date ? now : new Date(now)
  const surface = selectHomeSurface(state, t)
  const heroId = surface && isHomeHeroPhase(surface.phase) ? surface.record.id : null

  const list = selectAll(state)
    .filter((b) => HOME_VISIBLE_STATUSES.includes(b.status))
    .filter((b) => resolveVisitPhase(b, t) === VISIT_PHASE.UPCOMING)
    .filter((b) => b.id !== heroId)
    .slice()
    .sort((a, b) => {
      const as = getVisitBounds(a).start?.getTime() || Number.POSITIVE_INFINITY
      const bs = getVisitBounds(b).start?.getTime() || Number.POSITIVE_INFINITY
      if (as !== bs) return as - bs
      return recencyTs(b) - recencyTs(a)
    })

  // When Home hero is an upcoming visit, include it first in the carousel.
  if (surface?.phase === VISIT_PHASE.UPCOMING && surface.record) {
    const rest = list.filter((b) => b.id !== surface.record.id)
    return [surface.record, ...rest].slice(0, limit)
  }

  return list.slice(0, limit)
}

export function selectUpcoming(state, now = new Date()) {
  const t = now instanceof Date ? now : new Date(now)
  return selectAll(state)
    .filter((b) => resolveVisitPhase(b, t) === VISIT_PHASE.UPCOMING)
    .slice()
    .sort((a, b) => {
      const as = getVisitBounds(a).start?.getTime() || 0
      const bs = getVisitBounds(b).start?.getTime() || 0
      return as - bs
    })
}

export function selectPendingPayment(state) {
  return selectAll(state).filter((b) =>
    [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.PAYMENT_PROCESSING].includes(b.status),
  )
}

export function selectHistory(state) {
  return selectAll(state).filter((b) =>
    [
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.RESCHEDULED,
      BOOKING_STATUS.NO_SHOW,
      BOOKING_STATUS.REFUNDED,
      BOOKING_STATUS.EXPIRED,
    ].includes(b.status),
  )
}

export function selectActiveList(state) {
  return selectAll(state).filter((b) => ACTIVE_STATUSES.includes(b.status))
}

function isSameDay(a, b = new Date()) {
  if (!a || Number.isNaN(a.getTime())) return false
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

/** Treat page groupings — complete booking list from engine SSOT. */
export function selectTreatGroups(state, now = new Date()) {
  const all = selectAll(state).slice().sort((a, b) => recencyTs(b) - recencyTs(a))
  const groups = {
    today: [],
    upcoming: [],
    payment_pending: [],
    completed: [],
    cancelled: [],
    rescheduled: [],
    other: [],
  }

  all.forEach((record) => {
    const start = record.schedule?.date?.full
      ? new Date(record.schedule.date.full)
      : null
    if (
      [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.PAYMENT_PROCESSING, BOOKING_STATUS.EXPIRED].includes(record.status)
    ) {
      groups.payment_pending.push(record)
      return
    }
    if (record.status === BOOKING_STATUS.CANCELLED) {
      groups.cancelled.push(record)
      return
    }
    if (record.status === BOOKING_STATUS.COMPLETED || record.status === BOOKING_STATUS.NO_SHOW) {
      groups.completed.push(record)
      return
    }
    if (record.status === BOOKING_STATUS.RESCHEDULED) {
      groups.rescheduled.push(record)
      return
    }
    if (
      [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.UPCOMING, BOOKING_STATUS.CHECKED_IN].includes(record.status)
    ) {
      if (isSameDay(start, now)) groups.today.push(record)
      else groups.upcoming.push(record)
      return
    }
    groups.other.push(record)
  })

  return groups
}

export function selectResumePath(record, now = new Date()) {
  if (!record) return '/'
  const serviceType = resolveServiceType(record)
  if (serviceType === 'pharmacy_delivery') return '/pharmacy'
  if (serviceType === 'lab_test') return '/treat'
  if (serviceType === 'home_care_nursing') return '/treat'

  const phase = resolveVisitPhase(record, now)
  if (phase === VISIT_PHASE.POST_VISIT) return '/post-visit-summary'
  if (phase === VISIT_PHASE.VISIT_CHECKIN) return '/appointment'
  if (phase === VISIT_PHASE.ACTIVE_VISIT) return '/appointment'
  if (phase === VISIT_PHASE.CARE_HISTORY) return '/post-visit-summary'

  switch (record.status) {
    case BOOKING_STATUS.DRAFT:
      return record.resumeStep === 'patient' ? '/booking/patient' : '/booking/confirm'
    case BOOKING_STATUS.PENDING_PAYMENT:
      return record.resumeStep === 'verify' ? '/verify-payment' : '/process-payment'
    case BOOKING_STATUS.PAYMENT_PROCESSING:
      return '/verify-payment'
    case BOOKING_STATUS.CHECKED_IN:
      return '/pre-checkin'
    case BOOKING_STATUS.IN_PROGRESS:
    case BOOKING_STATUS.AWAITING_COMPLETION:
      return '/appointment'
    case BOOKING_STATUS.COMPLETED:
      return '/post-visit-summary'
    case BOOKING_STATUS.CONFIRMED:
    case BOOKING_STATUS.UPCOMING:
      return record.preparationCompleted ? '/appointment' : '/prepare-visit'
    default:
      return '/appointment'
  }
}

export function selectLegacyCurrent(state) {
  const home = selectHomeBooking(state)
  return toLegacyBooking(home)
}

export function selectTreatFeatured(state, now = new Date()) {
  return selectLiveAppointment(state, now)
}

/**
 * Single live / imminent appointment for Treat hero card.
 * Shown only when checked-in or within the edit-lock window around start.
 */
export function selectLiveAppointment(state, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now)
  const surface = selectHomeSurface(state, nowDate)
  if (
    surface
    && [VISIT_PHASE.ACTIVE_VISIT, VISIT_PHASE.VISIT_CHECKIN].includes(surface.phase)
  ) {
    return toLegacyBooking(surface.record)
  }

  const ranked = selectAll(state)
    .filter((b) =>
      [
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.UPCOMING,
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.AWAITING_COMPLETION,
      ].includes(b.status),
    )
    .map((record) => {
      const start = record.schedule?.date && record.schedule?.time
        ? getAppointmentStart(record.schedule.date, record.schedule.time)
        : null
      return { record, window: getBookingWindow(start, nowDate), start }
    })
    .filter(({ record, window }) => {
      const phase = resolveVisitPhase(record, nowDate)
      if (phase === VISIT_PHASE.ACTIVE_VISIT || phase === VISIT_PHASE.VISIT_CHECKIN) return true
      if (record.status === BOOKING_STATUS.CHECKED_IN) return true
      if (!Number.isFinite(window.minutesUntil)) return false
      return window.minutesUntil >= -30 && window.minutesUntil <= EDIT_LOCK_MINUTES
    })
    .sort((a, b) => a.window.minutesUntil - b.window.minutesUntil)

  return ranked[0] ? toLegacyBooking(ranked[0].record) : null
}

/** Care History tab label derived from lifecycle. */
export function careHistoryTabForRecord(record, now = new Date()) {
  if (!record) return null
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED, BOOKING_STATUS.REFUNDED].includes(record.status)) {
    return 'Cancelled'
  }
  if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW].includes(record.status)) {
    return 'Completed'
  }
  if ([BOOKING_STATUS.DRAFT].includes(record.status)) return null

  const phase = resolveVisitPhase(record, now)
  if (phase === VISIT_PHASE.ACTIVE_VISIT || phase === VISIT_PHASE.VISIT_CHECKIN) {
    return 'Active'
  }
  if (
    [
      BOOKING_STATUS.CHECKED_IN,
      BOOKING_STATUS.PENDING_PAYMENT,
      BOOKING_STATUS.PAYMENT_PROCESSING,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.AWAITING_COMPLETION,
    ].includes(record.status)
  ) {
    return 'Active'
  }
  if ([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.UPCOMING, BOOKING_STATUS.RESCHEDULED].includes(record.status)) {
    return 'Upcoming'
  }
  return null
}

function dayKey(dateLike) {
  if (!dateLike) return ''
  const raw = dateLike?.full ?? dateLike
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Stable fingerprint for the same real-world visit (doctor + day + time). */
export function bookingFingerprint(recordOrLegacy) {
  if (!recordOrLegacy) return ''
  const doctorId = recordOrLegacy.doctor?.id
    ?? recordOrLegacy.providerName
    ?? recordOrLegacy.id
    ?? ''
  const date = recordOrLegacy.schedule?.date || recordOrLegacy.date
  const time = recordOrLegacy.schedule?.time || recordOrLegacy.time || ''
  return `${doctorId}|${dayKey(date)}|${String(time).toLowerCase().replace(/\s+/g, '')}`
}

const HISTORY_TAB_RANK = {
  Active: 4,
  Upcoming: 3,
  Completed: 2,
  Cancelled: 1,
}

/** Flat Care History rows from engine (newest first, deduped). */
export function selectCareHistory(state, now = new Date()) {
  const rows = selectAll(state)
    .map((record) => {
      const tab = careHistoryTabForRecord(record, now)
      if (!tab) return null
      const legacy = toLegacyBooking(record)
      const service = getServiceMeta(resolveServiceType(legacy))
      const start = record.schedule?.date && record.schedule?.time
        ? getAppointmentStart(record.schedule.date, record.schedule.time)
        : null
      const dateValue = legacy.date?.full instanceof Date
        ? legacy.date.full
        : new Date(legacy.date?.full || legacy.date)
      const dateLabel = Number.isNaN(dateValue.getTime())
        ? ''
        : dateValue.toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
      const displayName = legacy.providerName
        || (legacy.doctor?.name
          ? `Dr. ${String(legacy.doctor.name).replace(/^Dr\.?\s*/i, '')}`
          : service.label)
      return {
        ...legacy,
        historyTab: tab,
        fingerprint: bookingFingerprint(record),
        start: start || dateValue,
        dateLabel: dateLabel + (legacy.time ? ` · ${legacy.time}` : ''),
        condition: service.label,
        categoryLabel: service.shortLabel,
        displayName,
        visitType: legacy.visitType || 'In-Person',
        updatedAt: record.meta?.updatedAt || record.meta?.createdAt || 0,
      }
    })
    .filter(Boolean)

  // Prefer Active over Upcoming when the same visit was stored twice.
  const byFingerprint = new Map()
  rows.forEach((row) => {
    const key = row.fingerprint || row.engineId || row.id
    const prev = byFingerprint.get(key)
    if (!prev) {
      byFingerprint.set(key, row)
      return
    }
    const rank = HISTORY_TAB_RANK[row.historyTab] || 0
    const prevRank = HISTORY_TAB_RANK[prev.historyTab] || 0
    const newer = new Date(row.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()
    if (rank > prevRank || (rank === prevRank && newer)) {
      byFingerprint.set(key, row)
    }
  })

  return Array.from(byFingerprint.values()).sort((a, b) => {
    const ta = a.start instanceof Date ? a.start.getTime() : 0
    const tb = b.start instanceof Date ? b.start.getTime() : 0
    return tb - ta
  })
}

function getServiceMetaLabel(legacy) {
  return getServiceMeta(resolveServiceType(legacy)).label
}

export function selectHomeCarouselLegacy(state, limit = HOME_CAROUSEL_LIMIT) {
  return selectHomeCarousel(state, limit).map(toLegacyBooking)
}
