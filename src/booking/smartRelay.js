/**
 * Booking lifecycle for every status card.
 * booking id is the record. Realtime and refresh replace that record,
 * and each screen derives the same card from it.
 */

import { BOOKING_STATUS } from './constants'
import {
  POST_VISIT_MS,
  VISIT_PHASE,
  getVisitBounds,
  resolveVisitPhase,
} from './visitLifecycle'
import {
  hasPatientReport,
  providerOutcomeKeys,
  readPatientReport,
} from './visitOutcomes'
import { relayFromFacts } from './relayStates'

function providerDone(record) {
  return record?.meta?.providerStatus === 'completed'
    || record?.meta?.reconciliationStatus === 'reconciled'
}

function terminalRecent(record, now) {
  const bounds = getVisitBounds(record)
  const stamp = Date.parse(
    record?.meta?.cancelledAt
    || record?.meta?.completedAt
    || record?.meta?.remoteUpdatedAt
    || '',
  ) || bounds.end?.getTime() || bounds.start?.getTime() || 0
  if (!stamp) return true
  return now.getTime() - stamp < POST_VISIT_MS
}

function visitCopy(record) {
  const status = String(record?.status || '')
  if (status === BOOKING_STATUS.TESTS_IN_PROGRESS) {
    return { visitLabel: 'Tests in progress', visitMessage: 'Lab or imaging still running?' }
  }
  if (status === BOOKING_STATUS.PAUSED) {
    return { visitLabel: 'Visit paused', visitMessage: 'Ready to resume your visit?' }
  }
  return { visitLabel: 'Visit in progress', visitMessage: 'Still with your care team?' }
}

/** One card description for a booking. Null when this record is not a journey card. */
export function resolveSmartRelay(booking, now = new Date()) {
  if (!booking) return null
  const t = now instanceof Date ? now : new Date(now)
  const phase = resolveVisitPhase(booking, t)
  const report = readPatientReport(booking.meta?.patientReport)
  const bounds = getVisitBounds(booking)
  const postVisitOpen = bounds.postVisitUntil
    ? t.getTime() < bounds.postVisitUntil.getTime()
    : phase === VISIT_PHASE.POST_VISIT
  const video = /video|virtual/i.test(`${booking.visitType || ''} ${booking.serviceType || ''}`)
  const relay = relayFromFacts({
    status: String(booking.status || ''),
    phase,
    hasReport: hasPatientReport(booking.meta?.patientReport),
    reportedAt: report?.reportedAt || null,
    providerDone: providerDone(booking),
    officialKeys: providerOutcomeKeys(booking.meta?.providerOutcomes || {}),
    postVisitOpen,
    terminalRecent: terminalRecent(booking, t),
    video,
    prepared: Boolean(booking.preparationCompleted),
    checkedIn: booking.status === BOOKING_STATUS.CHECKED_IN,
    ...visitCopy(booking),
  })
  if (!relay) return null
  const bookingId = booking.engineId || booking.id || null
  let path = relay.path
  if (video && phase === VISIT_PHASE.UPCOMING && bookingId && path === '/video/join') {
    path = `/video/join/${bookingId}`
  }
  return {
    ...relay,
    bookingId,
    path,
    actions: relay.actions.slice(0, 2),
  }
}
