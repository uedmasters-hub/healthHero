import { VISIT_PHASE, resolveVisitPhase } from '../src/booking/visitLifecycle.js'
import { BOOKING_STATUS, carePathToRoute, RECONCILIATION_STATUS } from '../src/booking/constants.js'
import { canTransition } from '../src/booking/lifecycle.js'
import { getAppointmentJourney } from '../src/lib/appointmentJourney.js'

const now = new Date('2026-09-25T12:00:00+05:30')
const start = new Date('2026-09-25T10:00:00+05:30')

const pending = {
  status: BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
  schedule: { date: { full: start.toISOString() }, time: '10:00 AM', duration: 30 },
  meta: {
    patientStatus: 'completed',
    providerStatus: 'not_started',
    reconciliationStatus: RECONCILIATION_STATUS.AWAITING_PROVIDER,
  },
}

const reconciled = {
  ...pending,
  status: BOOKING_STATUS.COMPLETED,
  meta: {
    ...pending.meta,
    providerStatus: 'completed',
    reconciliationStatus: RECONCILIATION_STATUS.RECONCILED,
    nextCarePath: 'prescription',
    postVisitUntil: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
  },
}

const result = {
  pendingPhase: resolveVisitPhase(pending, now),
  pendingLabel: getAppointmentJourney(pending, now).sectionLabel,
  pendingCta: getAppointmentJourney(pending, now).cta,
  reconciledPhase: resolveVisitPhase(reconciled, now),
  route: carePathToRoute('prescription', 'bk_1'),
  transitions: {
    awaiting_to_pending: canTransition('awaiting_completion', 'completed_pending_provider'),
    pending_to_completed: canTransition('completed_pending_provider', 'completed'),
    active_to_pending: canTransition('visit_active', 'completed_pending_provider'),
  },
}

console.log(JSON.stringify(result, null, 2))

const ok = [
  result.pendingPhase === VISIT_PHASE.WAITING_PROVIDER,
  result.pendingLabel === 'Waiting for Provider Confirmation',
  result.pendingCta === 'Report visit',
  result.reconciledPhase === VISIT_PHASE.POST_VISIT,
  result.route.pathname === '/post-visit-summary',
  result.route.state.careFocus === 'prescription',
  result.transitions.awaiting_to_pending,
  result.transitions.pending_to_completed,
  result.transitions.active_to_pending,
]

if (!ok.every(Boolean)) {
  console.error('ASSERT FAIL', ok)
  process.exit(1)
}
console.log('OK')
