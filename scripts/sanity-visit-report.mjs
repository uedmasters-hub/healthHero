import {
  buildPatientReport,
  findScheduledFollowUp,
  reconcileVisitOutcomes,
  remoteVisitSnapshotWins,
  waitingProviderView,
} from '../src/booking/visitOutcomes.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function check(name, ok) {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}`)
}

const report = buildPatientReport({
  primaryOutcome: 'prescription',
  details: {
    medications: ' Metformin 500mg ',
    tests: 'Should be dropped',
    note: 'Felt dizzy',
  },
})

check('one primary outcome is stored', report.primaryOutcome === 'prescription')
check('only that outcome keeps its detail', report.details.medications === 'Metformin 500mg' && !report.details.tests && !report.details.note)
check('an unknown outcome is rejected', buildPatientReport({ primaryOutcome: 'not_real' }).primaryOutcome === null)
check('felt better has no extra detail', buildPatientReport({ primaryOutcome: 'felt_better', details: { note: 'nope' } }).details.note === undefined)
check('status waits for the clinic', report.status === 'pending_provider_confirmation')

const first = buildPatientReport({
  primaryOutcome: 'felt_better',
  reportedAt: '2026-09-26T10:00:00.000Z',
})
const second = buildPatientReport({
  primaryOutcome: 'tests',
  details: { tests: 'HbA1c' },
  reportedAt: '2026-09-26T11:00:00.000Z',
})
check('a later report does not rewrite the first', first.primaryOutcome === 'felt_better' && second.primaryOutcome === 'tests' && second.details.tests === 'HbA1c')

const linked = buildPatientReport({
  primaryOutcome: 'follow_up',
  followUpBookingId: 'bk_next',
  details: { followUp: 'In two weeks' },
})
check('a follow-up can point at an existing booking', linked.details.followUpBookingId === 'bk_next' && linked.details.followUp === 'In two weeks')

const current = { id: 'visit-1', doctor: { id: 'doc-1' }, date: { full: '2026-09-20T09:00:00.000Z' } }
const bookings = [
  current,
  { id: 'visit-0', doctor: { id: 'doc-1' }, date: { full: '2026-09-01T09:00:00.000Z' }, status: 'completed' },
  { id: 'visit-2', doctor: { id: 'doc-1' }, schedule: { date: { full: '2026-10-04T09:00:00.000Z' } }, status: 'confirmed' },
  { id: 'other', doctor: { id: 'doc-9' }, date: { full: '2026-10-01T09:00:00.000Z' }, status: 'confirmed' },
]
check('follow-up prefers the next visit with the same provider', findScheduledFollowUp(bookings, current)?.id === 'visit-2')

const reconciled = reconcileVisitOutcomes(
  { primaryOutcome: 'felt_better' },
  { prescription: true, medications: ['Metformin 500mg'], referralTo: 'Cardiology' },
)
check('a different official outcome stays unresolved on the patient report', reconciled.primaryOutcome === 'felt_better' && reconciled.unresolved.join() === 'felt_better')
check('care updates follow the provider record', reconciled.official.includes('prescription') && reconciled.official.includes('referral') && !reconciled.official.includes('felt_better'))
check('a matching primary outcome is confirmed', reconcileVisitOutcomes({ primaryOutcome: 'prescription' }, { prescription: true }).confirmed.join() === 'prescription')

const page = fs.readFileSync(path.join(root, 'src/components/PostVisitReport.jsx'), 'utf8')
const engine = fs.readFileSync(path.join(root, 'src/booking/engine.js'), 'utf8')
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260926233000_primary_visit_outcome.sql'), 'utf8')
check('the page uses one radio group', page.includes('role="radiogroup"') && page.includes('role="radio"') && !page.includes('role="checkbox"'))
check('felt better saves immediately', page.includes("id === 'felt_better'") && page.includes("submitOutcome('felt_better')"))
check('the heading asks for the best description', page.includes('What best describes your visit?') && page.includes("We'll save this as a temporary record until the clinic confirms the visit."))
check('something else still expands a note', page.includes('opt.multiline'))
check('the engine requires a primary outcome', engine.includes('if (!entry.primaryOutcome) return null') && engine.includes('patientReports: [...preserved, entry]'))
check('primary outcome is canonical in the database', sql.includes('primary_outcome') && sql.includes('pending_provider_confirmation') && sql.includes('primary_outcome_required'))
check('the original row is inserted, not rewritten', sql.includes('insert into public.patient_visit_reports') && sql.includes('patient_visit_reports_no_mutation'))
check('provider confirmation writes care records from the official outcome', sql.includes("'prescription' = any(provider_keys)") && sql.includes('insert into public.prescriptions') && sql.includes('insert into public.lab_orders') && sql.includes('insert into public.referrals') && sql.includes('insert into public.follow_up_reminders'))
check('the provider is told a report is waiting', sql.includes('A temporary outcome is waiting for your confirmation.'))

const waiting = waitingProviderView({
  meta: {
    patientReport: {
      primaryOutcome: 'prescription',
      reportedAt: '2026-09-26T15:30:00.000Z',
      status: 'pending_provider_confirmation',
    },
  },
})
check('a saved report replaces the report action', waiting.submitted && waiting.cta === 'Report submitted')
check('the waiting copy names the patient report', waiting.prompt === 'Waiting for your provider to confirm your report.' && waiting.reportedAt === '2026-09-26T15:30:00.000Z')
check('no report still asks the patient to report', waitingProviderView({ meta: {} }).cta === 'Report visit')
check('a server report replaces a card with no report', remoteVisitSnapshotWins(
  { status: 'completed_pending_provider', remoteUpdatedAt: '2026-09-26T12:00:00.000Z', providerStatus: 'not_started' },
  { status: 'completed_pending_provider', updatedAt: '2026-09-26T12:00:00.000Z', patientReport: { outcomes: ['tests'], reportedAt: '2026-09-26T12:05:00.000Z' }, providerStatus: 'not_started' },
).apply === true)
check('an offline report is kept until the server has it', remoteVisitSnapshotWins(
  { status: 'completed_pending_provider', remoteUpdatedAt: '2026-09-26T12:00:00.000Z', reportPending: true, patientReport: { primaryOutcome: 'felt_better', reportedAt: '2026-09-26T12:00:00.000Z' }, providerStatus: 'not_started' },
  { status: 'completed_pending_provider', updatedAt: '2026-09-26T12:00:00.000Z', patientReport: {}, providerStatus: 'not_started' },
).apply === false)
check('provider confirmation is applied from the server row', remoteVisitSnapshotWins(
  { status: 'completed_pending_provider', remoteUpdatedAt: '2026-09-26T12:00:00.000Z', providerStatus: 'not_started', reconciliationStatus: 'awaiting_provider' },
  { status: 'completed', updatedAt: '2026-09-26T13:00:00.000Z', providerStatus: 'completed', reconciliationStatus: 'reconciled', patientReport: { primaryOutcome: 'prescription', reportedAt: '2026-09-26T12:00:00.000Z' } },
).providerArrived === true)

const journey = fs.readFileSync(path.join(root, 'src/lib/appointmentJourney.js'), 'utf8')
const lifecycle = fs.readFileSync(path.join(root, 'src/booking/visitLifecycle.js'), 'utf8')
const carousel = fs.readFileSync(path.join(root, 'src/components/UpcomingBookingsCarousel.jsx'), 'utf8')
const relayStates = fs.readFileSync(path.join(root, 'src/booking/relayStates.js'), 'utf8')
check('the journey uses the shared waiting view', journey.includes('resolveSmartRelay(booking') && journey.includes("relay.state === 'report_submitted'"))
check('provider confirmation leaves the waiting phase', lifecycle.includes("providerStatus === 'completed'") && lifecycle.includes('return VISIT_PHASE.POST_VISIT'))
check('the home card switches after a report exists', carousel.includes('upcoming-status') && relayStates.includes("'Report Submitted'") && relayStates.includes("'Contact clinic'") && !carousel.includes('upcoming-report-time'))
check('submit rolls back when the server rejects it', engine.includes('if (!remote?.ok)') && engine.includes('rollback()') && engine.includes('refreshAppointmentFromRemote'))
check('realtime still reloads appointments', fs.readFileSync(path.join(root, 'src/features/sync/syncEngine.js'), 'utf8').includes('onAppointmentsChange'))
check('offline reports replay through the outbox', fs.readFileSync(path.join(root, 'src/features/sync/domains.js'), 'utf8').includes("case 'appointment.patient_report'"))

if (failures.length) {
  console.error(`visit report sanity failed: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('visit report sanity passed')
