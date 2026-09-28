/**
 * Smart Relay card accessibility: named status, two actions, disabled report.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { relayFromFacts } from '../src/booking/relayStates.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const carousel = fs.readFileSync(path.join(root, 'src/components/UpcomingBookingsCarousel.jsx'), 'utf8')
const detailJsx = fs.readFileSync(path.join(root, 'src/components/AppointmentDetail.jsx'), 'utf8')
const flow = fs.readFileSync(path.join(root, 'src/styles/flow.css'), 'utf8')
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
// Appointment details renders the relay as a shared Callout: title = label, body = message
check('booking details expose status text', detailJsx.includes("className={cx('relay-panel', `is-${relay.accent}`)} title={relay.label}") && detailJsx.includes('{relay.message}'))
check('waiting and reported colors differ', /\.relay-panel\.is-waiting[^{]*\{[^}]*warning/.test(flow) && /\.relay-panel\.is-reported[^{]*\{[^}]*success/.test(flow))
// 190px card, 44px avatar — expressed through rem / touch tokens
check('the home card stays compact', css.includes('height: 11.875rem') && css.includes('width: var(--touch-min)') && css.includes('height: var(--touch-min)') && css.includes('padding: var(--space-5) var(--space-6)') && css.includes('border-radius: var(--radius-card)'))
check('the home card drops the long copy', !carousel.includes('upcoming-checkin-question') && !carousel.includes('upcoming-schedule') && !carousel.includes('upcoming-service-type'))

if (failures.length) {
  console.error(`smart relay a11y failed: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('smart relay a11y passed')
