import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const page = fs.readFileSync(path.join(root, 'src/features/videoConsult/VideoConsultPage.jsx'), 'utf8')
const css = fs.readFileSync(path.join(root, 'src/features/videoConsult/VideoConsult.css'), 'utf8')
const failures = []

function check(name, ok) {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}`)
}

check('readiness region is named', page.includes('aria-label="Video readiness check"'))
check('camera preview is named', page.includes('aria-label="Your camera preview"'))
check('progress exposes a plain status', page.includes('role="progressbar"') && page.includes('aria-valuetext="Checking your connection"'))
check('outcome is a status', page.includes('className="video-outcome" role="status"'))
check('outcomes are Ready, Usable, and Poor', page.includes("return 'Ready'") && page.includes("return 'Usable'") && page.includes("return 'Poor'"))
check('join action is named', page.includes('Join Consultation'))
check('preview is not marked disabled', !page.includes('aria-disabled'))
check('usable path offers continue', page.includes("outcome === 'usable'") && page.includes('>Continue<'))
check('poor path offers retry and in-person', page.includes('Try again') && page.includes('Book an in-person visit'))
check('back control is named', page.includes('aria-label={label}'))
check('slot selection exposes pressed state', page.includes('aria-pressed={active}'))
check('errors are alerts', page.includes('role="alert"'))
check('motion can be reduced', css.includes('prefers-reduced-motion: reduce'))
check('preview uses the design radius', css.includes('var(--radius-card)') || css.includes('border-radius: var(--radius-card)'))
check('remote picture stays out of the way until it is live', css.includes('.video-remote') && css.includes('.is-live'))

const schedule = fs.readFileSync(path.join(root, 'src/components/WeeklySchedule.jsx'), 'utf8')
const slot = fs.readFileSync(path.join(root, 'src/components/SelectSlot.jsx'), 'utf8')
const slotCss = fs.readFileSync(path.join(root, 'src/components/SelectSlot.css'), 'utf8')
const listCss = fs.readFileSync(path.join(root, 'src/components/directory/DirectoryShell.css'), 'utf8')
const profileCss = fs.readFileSync(path.join(root, 'src/components/DoctorProfile.css'), 'utf8')
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8')
check('locked video visits hide the mode toggle', schedule.includes('lockVisitType ? null') && slot.includes('lockVisitType={videoLocked}'))
check('date and time still use the existing slot grid', slot.includes('<WeeklySchedule') && !slot.includes('video-slot'))
check('booking list scrolls in one region', listCss.includes('.dir-shell__scroll') && listCss.includes('overflow-y: auto') && listCss.includes('overscroll-behavior: contain'))
check('choose date and time scrolls in one region', slotCss.includes('.select-slot-scroll') && slotCss.includes('overflow-y: auto'))
check('doctor profile scrolls in one region', profileCss.includes('.profile-scroll') && profileCss.includes('overflow-y: auto'))
check('video entry uses the booking list', app.includes('function VideoBookingEntry') && app.includes('to="/booking"'))
const readiness = fs.readFileSync(path.join(root, 'src/features/videoConsult/ReadinessPage.jsx'), 'utf8')
check('readiness preview is named', readiness.includes('aria-label="Your camera preview"'))
check('readiness countdown is a timer', readiness.includes('role="timer"'))
check('readiness checks are announced as they appear', readiness.includes('aria-live="polite"'))
check('call controls are named', ['Mute microphone', 'Turn camera off', 'Turn speaker off', 'Switch camera', 'Cancel'].every((label) => readiness.includes(label)))
check('confirmation names camera, microphone, and internet', readiness.includes('>Camera<') && readiness.includes('>Microphone<') && readiness.includes('>Internet<'))
check('preview privacy is stated', readiness.includes('never uploaded'))
check('a passed check continues to booking or runs again', readiness.includes('>Continue<') && readiness.includes('Run test again'))
check('a poor check can retry or switch before booking', readiness.includes('Retry Test') && readiness.includes('Switch to In-Person'))
check('live checks sit in a card above the controls', readiness.includes('video-check-card') && readiness.includes('video-readiness-dock'))
check('the checklist keeps a 24px gap and side inset', css.includes('gap: var(--space-6)') && css.includes('padding: 0 var(--space-6) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))'))
check('the live header stays simple', readiness.includes('Checking connection') && readiness.includes('role="progressbar"'))

if (failures.length) {
  console.error(`\n${failures.length} failed`)
  process.exit(1)
}
console.log('\nvideo consult accessibility passed')
