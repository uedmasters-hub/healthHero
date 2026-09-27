/**
 * Smart Relay card accessibility: named status, two actions, disabled report.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { relayFromFacts } from '../src/booking/relayStates.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const carousel = fs.readFileSync(path.join(root, 'src/components/UpcomingBookingsCarousel.jsx'), 'utf8')
const detail = fs.readFileSync(path.join(root, 'src/components/AppointmentDetail.css'), 'utf8')
const css = fs.readFileSync(path.join(root, 'src/components/BookAppointment.css'), 'utf8')
const failures = []

function check(name, ok) {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}`)
}

const reported = relayFromFacts({
  status: 'completed_pending_provider',
  phase: 'waiting_provider',
  hasReport: true,
  reportedAt: '2026-09-26T15:30:00.000Z',
})

check('report submitted keeps a details action', reported.label === 'Report Submitted' && reported.actions[0].label === 'View details' && reported.actions[0].ariaLabel === 'View details in Care Hub')
check('the card names the journey, status, and doctor', carousel.includes('aria-label={`${context}. ${chip}: ${title}'))
check('actions expose their own names', carousel.includes('aria-label={action.ariaLabel || action.label}'))
check('the home card shows at most two actions', carousel.includes('slice(0, 2)'))
check('more options announces the dialog', carousel.includes("aria-haspopup={action.id === 'more' ? 'dialog' : undefined}"))
check('booking details expose status text', detail.includes('.appointment-relay-label') && detail.includes('.appointment-relay-message'))
check('waiting and reported colors differ', detail.includes('.appointment-relay.is-waiting') && detail.includes('.appointment-relay.is-reported'))
check('the home card stays compact', css.includes('height: 190px') && css.includes('width: 44px') && css.includes('height: 44px') && css.includes('padding: var(--space-5) var(--space-6)') && css.includes('border-radius: var(--radius-card)'))
check('the home card drops the long copy', !carousel.includes('upcoming-checkin-question') && !carousel.includes('upcoming-schedule') && !carousel.includes('upcoming-service-type'))

if (failures.length) {
  console.error(`smart relay a11y failed: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('smart relay a11y passed')
