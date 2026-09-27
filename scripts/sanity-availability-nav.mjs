import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { availabilityWindow, slotVisitMode } from '../src/lib/availabilityWindow.js'

const noon = new Date(2026, 8, 27, 12, 0, 0)

assert.equal(slotVisitMode('Video Consultation'), 'video')
assert.equal(slotVisitMode('In-Person'), 'in_person')
assert.equal(slotVisitMode(''), null)

assert.deepEqual(availabilityWindow('Today', noon), { from: '2026-09-27', until: '2026-09-27' })
assert.deepEqual(availabilityWindow('Tomorrow', noon), { from: '2026-09-28', until: '2026-09-28' })
assert.deepEqual(availabilityWindow('This Week', noon), { from: '2026-09-27', until: '2026-10-03' })
assert.deepEqual(availabilityWindow('All', noon, 60), { from: '2026-09-27', until: '2026-11-26' })

const profile = readFileSync('src/components/DoctorProfile.jsx', 'utf8')
assert.match(profile, /navigate\(-1\)/)
assert.doesNotMatch(profile, /goBackToOrigin/)
assert.match(profile, /!previous\.startsWith\('\/doctor\/'\)/)
assert.match(profile, /!previous\.startsWith\('\/booking\/'\)/)

const list = readFileSync('src/components/DoctorList.jsx', 'utf8')
assert.match(list, /bookableOnly:\s*true/)
assert.match(list, /availability:\s*selectedAvailability/)
assert.match(list, /subscribeAvailability/)
assert.match(list, /role="status"/)

const repo = readFileSync('src/features/providers/repository.js', 'utf8')
assert.match(repo, /from\('available_slots'\)/)
assert.match(repo, /providerIdsWithBookableSlots/)
assert.match(repo, /table: 'available_slots'/)

const schedule = readFileSync('src/components/WeeklySchedule.jsx', 'utf8')
assert.match(schedule, /fallbackSlots:\s*\[\]/)
assert.match(schedule, /role="status"/)
assert.match(schedule, /subscribeAvailability/)
assert.doesNotMatch(schedule, /fallbackSlots:\s*FALLBACK_SCHEDULE_SLOTS/)

const slots = readFileSync('src/components/calendar/Calendar.jsx', 'utf8')
assert.match(slots, /if \(!slot \|\| meta\.disabled\) return null/)

const selectSlot = readFileSync('src/components/SelectSlot.jsx', 'utf8')
assert.match(selectSlot, /if \(!doctor\) \{\s*return null/m)
assert.doesNotMatch(selectSlot, /goBackToOrigin/)

console.log('sanity-availability-nav ok')
