import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const profile = readFileSync('src/components/DoctorProfile.jsx', 'utf8')
assert.match(profile, /aria-label="Back"/)
assert.match(profile, /data-push-back/)

const schedule = readFileSync('src/components/WeeklySchedule.jsx', 'utf8')
assert.match(schedule, /role="status"/)
assert.match(schedule, /No open times for this visit/)
assert.match(schedule, /this doctor is unavailable/)
assert.doesNotMatch(schedule, /aria-disabled/)

const list = readFileSync('src/components/DoctorList.jsx', 'utf8')
assert.match(list, /role="status"/)
assert.match(list, /open slot/)

const slots = readFileSync('src/components/calendar/Calendar.jsx', 'utf8')
const grid = slots.slice(slots.indexOf('export function SlotGrid'))
assert.doesNotMatch(grid.slice(0, 900), /disabled=\{unavailable\}/)

console.log('sanity-availability-nav-a11y ok')
