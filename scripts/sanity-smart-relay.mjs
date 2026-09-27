/**
 * Smart Relay card states. booking facts in, one shared card out.
 */
import { RELAY, relayFromFacts } from '../src/booking/relayStates.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function check(name, ok) {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}`)
}

function facts(extra = {}) {
  return {
    status: 'confirmed',
    phase: 'upcoming',
    hasReport: false,
    reportedAt: null,
    providerDone: false,
    officialKeys: [],
    postVisitOpen: false,
    terminalRecent: false,
    video: false,
    prepared: true,
    checkedIn: false,
    ...extra,
  }
}

const upcoming = relayFromFacts(facts())
check('booked card', upcoming.state === RELAY.UPCOMING && upcoming.label === 'Booked' && upcoming.context === 'Upcoming' && upcoming.status === 'Booked' && upcoming.actions[0].label === 'View details')
check('a booked visit can be rescheduled', upcoming.actions[1].id === 'reschedule')
check('a video visit keeps a join action', relayFromFacts(facts({ video: true })).actions[0].label === 'Join')

const checkin = relayFromFacts(facts({ phase: 'visit_checkin', status: 'awaiting_completion' }))
check('check-in asks yes or not yet', checkin.label === 'Check-in' && checkin.context === 'Active' && checkin.status === 'Checked-in' && checkin.actions.map((a) => a.label).join('|') === 'Yes|Not yet')

const waiting = relayFromFacts(facts({ phase: 'waiting_provider', status: 'completed_pending_provider' }))
check('waiting offers report and clinic', waiting.label === 'Waiting for provider' && waiting.context === 'Waiting' && waiting.status === 'Waiting' && waiting.actions.map((a) => a.id).join('|') === 'report|contact')

const reported = relayFromFacts(facts({
  phase: 'waiting_provider',
  status: 'completed_pending_provider',
  hasReport: true,
  reportedAt: '2026-09-26T15:30:00.000Z',
}))
check('a report becomes a status chip', reported.label === 'Report Submitted' && reported.context === 'Waiting' && reported.status === 'Submitted' && reported.actions[0].label === 'View details')
check('the report explanation stays for care hub', reported.reportedAt === '2026-09-26T15:30:00.000Z' && reported.message === 'Waiting for your provider to confirm your report.')

const confirmed = relayFromFacts(facts({
  phase: 'post_visit',
  status: 'completed',
  providerDone: true,
  officialKeys: ['felt_better'],
  postVisitOpen: true,
}))
check('provider confirmation replaces the report card', confirmed.label === 'Confirmed' && confirmed.context === 'Post Visit' && confirmed.status === 'Confirmed' && confirmed.actions[0].label === 'View details')

const prescription = relayFromFacts(facts({
  phase: 'post_visit',
  status: 'completed',
  providerDone: true,
  officialKeys: ['prescription', 'tests'],
  postVisitOpen: true,
}))
check('prescription leads when several outcomes exist', prescription.label === 'Prescription Ready' && prescription.status === 'Ready' && prescription.context === 'Post Visit' && prescription.actions[0].label === 'View prescription')

const tests = relayFromFacts(facts({ phase: 'post_visit', status: 'completed', providerDone: true, officialKeys: ['tests'], postVisitOpen: true }))
check('tests ordered', tests.label === 'Tests Ordered' && tests.actions[0].label === 'View tests')
const referral = relayFromFacts(facts({ phase: 'post_visit', status: 'completed', providerDone: true, officialKeys: ['referral'], postVisitOpen: true }))
check('referral', referral.label === 'Referral' && referral.actions[0].label === 'View referral')
const follow = relayFromFacts(facts({ phase: 'post_visit', status: 'completed', providerDone: true, officialKeys: ['follow_up'], postVisitOpen: true }))
check('follow-up', follow.label === 'Follow-up' && follow.actions[0].label === 'View details')

const archived = relayFromFacts(facts({
  phase: 'care_history',
  status: 'completed',
  providerDone: true,
  officialKeys: ['prescription'],
  postVisitOpen: false,
}))
check('a finished outcome leaves home', archived.archive === true && archived.home === false && archived.label === 'Prescription Ready' && archived.context === 'Completed' && archived.status === 'Ready')

const cancelled = relayFromFacts(facts({ status: 'cancelled', terminalRecent: true }))
check('a recent cancellation stays on home', cancelled.label === 'Cancelled' && cancelled.home === true && cancelled.actions.length === 2)
const cancelledOld = relayFromFacts(facts({ status: 'cancelled', terminalRecent: false }))
check('an old cancellation archives', cancelledOld.archive === true && cancelledOld.home === false)

const missed = relayFromFacts(facts({ status: 'no_show', terminalRecent: true }))
check('a missed visit is its own card', missed.label === 'Missed' && missed.accent === 'missed')

const states = [
  upcoming, checkin, waiting, reported, confirmed, prescription, tests, referral, follow, cancelled, missed,
]
check('every card has a primary action and at most two', states.every((row) => row.actions.length >= 1 && row.actions.length <= 2 && row.actions[0].tone === 'primary'))
check('status is text, not color alone', states.every((row) => row.label && row.message && row.accent))

const carousel = fs.readFileSync(path.join(root, 'src/components/UpcomingBookingsCarousel.jsx'), 'utf8')
const detail = fs.readFileSync(path.join(root, 'src/components/AppointmentDetail.jsx'), 'utf8')
const care = fs.readFileSync(path.join(root, 'src/components/PostVisitSummary.jsx'), 'utf8')
const notes = fs.readFileSync(path.join(root, 'src/components/NotificationsPage.jsx'), 'utf8')
const provider = fs.readFileSync(path.join(root, 'src/features/conversations/components/ContextCard.jsx'), 'utf8')
const treat = fs.readFileSync(path.join(root, 'src/components/TreatPage.jsx'), 'utf8')
check('home renders journey context and a status pill', carousel.includes('upcoming-context') && carousel.includes('upcoming-status') && carousel.includes('relay?.status') && !carousel.includes('upcoming-status-dot') && carousel.includes('relayActions') && !carousel.includes('relay.message') && !carousel.includes('upcoming-report-time'))
check('booking details read the relay', detail.includes('resolveSmartRelay(booking)') && detail.includes('relay.label'))
check('care hub reads the relay', care.includes('resolveSmartRelay(booking)') && care.includes('relay?.label'))
check('notifications follow the booking', notes.includes('resolveSmartRelay(linked)') && notes.includes('relay.label'))
check('provider chat reads the relay', provider.includes('resolveSmartRelay(booking)'))
check('care history shows the relay label', treat.includes('visit.relayLabel'))

if (failures.length) {
  console.error(`smart relay sanity failed: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('smart relay sanity passed')
