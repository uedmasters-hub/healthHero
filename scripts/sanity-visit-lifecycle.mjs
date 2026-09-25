import {
  resolveVisitPhase,
  desiredStatusForTime,
  SNOOZE_MS,
} from '../src/booking/visitLifecycle.js'
import { BOOKING_STATUS } from '../src/booking/constants.js'
import { canTransition } from '../src/booking/lifecycle.js'
import { getAppointmentJourney } from '../src/lib/appointmentJourney.js'

const now = new Date('2026-09-25T12:00:00+05:30')
const start = new Date('2026-09-25T10:00:00+05:30')
const reminder = new Date(now.getTime() + SNOOZE_MS)

const awaiting = {
  status: BOOKING_STATUS.AWAITING_COMPLETION,
  schedule: { date: { full: start.toISOString() }, time: '10:00 AM', duration: 30 },
  meta: {},
}
const kept = {
  ...awaiting,
  status: BOOKING_STATUS.VISIT_ACTIVE,
  meta: {
    visitReminderAt: reminder.toISOString(),
    confirmationSnoozeUntil: reminder.toISOString(),
  },
}
const expired = {
  ...kept,
  meta: { visitReminderAt: new Date(now.getTime() - 1000).toISOString() },
}

const result = {
  snoozeMs: SNOOZE_MS,
  awaitingPhase: resolveVisitPhase(awaiting, now),
  keptPhase: resolveVisitPhase(kept, now),
  keptJourney: getAppointmentJourney(kept, now).cta,
  keptLabel: getAppointmentJourney(kept, now).sectionLabel,
  expiredPhase: resolveVisitPhase(expired, now),
  expiredDesired: desiredStatusForTime(expired, now),
  transitions: {
    awaiting_to_active: canTransition('awaiting_completion', 'visit_active'),
    active_to_tests: canTransition('visit_active', 'tests_in_progress'),
    active_to_paused: canTransition('visit_active', 'paused'),
    active_to_cancel: canTransition('visit_active', 'cancelled'),
    active_to_complete: canTransition('visit_active', 'completed'),
  },
}

console.log(JSON.stringify(result, null, 2))

const asserts = [
  result.snoozeMs === 30 * 60 * 1000,
  result.awaitingPhase === 'visit_checkin',
  result.keptPhase === 'active_visit',
  result.keptJourney === 'Complete Visit',
  result.keptLabel === 'Visit in Progress',
  result.expiredPhase === 'visit_checkin',
  result.expiredDesired === 'awaiting_completion',
  result.transitions.awaiting_to_active,
  result.transitions.active_to_tests,
  result.transitions.active_to_paused,
  result.transitions.active_to_cancel,
  result.transitions.active_to_complete,
]

if (!asserts.every(Boolean)) {
  console.error('ASSERT FAIL', asserts)
  process.exit(1)
}
console.log('OK')
