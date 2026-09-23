import { getSlotWindow, parseClock } from './bookingPolicy'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  bookingRange,
  makeDateValue,
  startOfDay,
  toIsoDate,
} from '../components/calendar/dates'

function availabilityDateKey(date) {
  if (!date) return ''
  const d = date.full instanceof Date ? date.full : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return String(date)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Local YYYY-MM-DD — matches Postgres `slot_date` and avoids UTC drift. */
export function localIsoDate(date) {
  return toIsoDate(date) || ''
}

export const FALLBACK_SCHEDULE_SLOTS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:30 PM',
  '3:00 PM',
  '4:00 PM',
  '6:00 PM',
  '9:00 PM',
]

export const SLOT_PERIODS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
]

function fingerprint(value) {
  let hash = 2166136261
  const text = String(value)
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function slotPeriodId(slot) {
  const { hours } = parseClock(slot)
  if (hours <= 12) return 'morning'
  if (hours < 18) return 'afternoon'
  return 'evening'
}

export function groupSlotsByPeriod(slots = []) {
  return SLOT_PERIODS
    .map((period) => ({
      ...period,
      slots: slots.filter((slot) => slotPeriodId(slot) === period.id),
    }))
    .filter((period) => period.slots.length > 0)
}

function visitMode(visitType) {
  return /video/i.test(visitType) ? 'video' : 'inperson'
}

/** Close 3 disjoint slots per mode so In-Person and Video never share the same gaps. */
function closedSlotsForMode(slots, seed, mode) {
  if (!slots.length) return new Set()
  const offset = seed % slots.length
  const phase = mode === 'video' ? 1 : 0
  const closed = new Set()
  for (let i = 0; i < Math.min(3, slots.length); i += 1) {
    closed.add(slots[(offset + phase + i * 3) % slots.length])
  }
  return closed
}

export function visitSlotAvailability({
  doctorId,
  date,
  visitType,
  slots = [],
} = {}) {
  if (doctorId == null || !slots.length) return new Set(slots)
  const mode = visitMode(visitType)
  const seed = fingerprint(`${doctorId}|${availabilityDateKey(date)}`)
  const closed = closedSlotsForMode(slots, seed, mode)
  return new Set(slots.filter((slot) => !closed.has(slot)))
}

/**
 * Resolve candidate times for a date.
 * When live availability exists, only listed days are bookable; missing days are empty.
 * When live map is empty/null, fall back to the demo weekly template.
 */
export function slotsForDate({
  liveTimes,
  hasRemoteSchedule = false,
  date,
  fallbackSlots = FALLBACK_SCHEDULE_SLOTS,
} = {}) {
  const key = localIsoDate(date)
  if (liveTimes instanceof Map && hasRemoteSchedule) {
    if (liveTimes.has(key)) {
      const times = liveTimes.get(key) || []
      return { slots: times.slice(), source: times.length ? 'live' : 'live-empty' }
    }
    return { slots: [], source: 'live-missing' }
  }
  if (liveTimes instanceof Map && liveTimes.size > 0 && !hasRemoteSchedule) {
    // Defensive: treat non-empty map as remote even if flag omitted
    if (liveTimes.has(key)) {
      const times = liveTimes.get(key) || []
      return { slots: times.slice(), source: times.length ? 'live' : 'live-empty' }
    }
    return { slots: [], source: 'live-missing' }
  }
  return { slots: fallbackSlots.slice(), source: 'fallback' }
}

/** Slots that are still open for booking (not visit-closed, not past). */
export function bookableSlots({
  doctorId,
  date,
  visitType,
  slots = [],
  now = new Date(),
} = {}) {
  if (!date || !slots.length) return []
  const open = visitSlotAvailability({ doctorId, date, visitType, slots })
  return slots.filter((slot) => {
    if (!open.has(slot)) return false
    const window = getSlotWindow(date, slot, now)
    return !window.isPast
  })
}

export function dateHasBookableSlots({
  doctorId,
  date,
  visitType,
  liveTimes,
  hasRemoteSchedule = false,
  fallbackSlots = FALLBACK_SCHEDULE_SLOTS,
  now = new Date(),
} = {}) {
  const { slots } = slotsForDate({ liveTimes, hasRemoteSchedule, date, fallbackSlots })
  return bookableSlots({ doctorId, date, visitType, slots, now }).length > 0
}

/** Earliest future day with at least one bookable slot within the booking horizon. */
export function findEarliestAvailableDate({
  doctorId,
  visitType,
  liveTimes,
  hasRemoteSchedule = false,
  fallbackSlots = FALLBACK_SCHEDULE_SLOTS,
  now = new Date(),
  horizonDays = BOOKING_HORIZON_DAYS,
} = {}) {
  const { minDate } = bookingRange(now)
  for (let i = 0; i <= horizonDays; i += 1) {
    const date = makeDateValue(addDays(minDate, i))
    if (dateHasBookableSlots({
      doctorId,
      date,
      visitType,
      liveTimes,
      hasRemoteSchedule,
      fallbackSlots,
      now,
    })) {
      return date
    }
  }
  return null
}

export function monthHasBookableSlots({
  year,
  month,
  doctorId,
  visitType,
  liveTimes,
  hasRemoteSchedule = false,
  fallbackSlots = FALLBACK_SCHEDULE_SLOTS,
  now = new Date(),
  minDate,
  maxDate,
} = {}) {
  const range = bookingRange(now)
  const floor = startOfDay(minDate || range.minDate)
  const ceiling = startOfDay(maxDate || range.maxDate)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= daysInMonth; day += 1) {
    const full = startOfDay(new Date(year, month, day))
    if (full < floor || full > ceiling) continue
    if (dateHasBookableSlots({
      doctorId,
      date: makeDateValue(full),
      visitType,
      liveTimes,
      hasRemoteSchedule,
      fallbackSlots,
      now,
    })) {
      return true
    }
  }
  return false
}

/** Next month (including current) within range that has bookable slots. */
export function findNextBookableMonth({
  fromYear,
  fromMonth,
  doctorId,
  visitType,
  liveTimes,
  hasRemoteSchedule = false,
  fallbackSlots = FALLBACK_SCHEDULE_SLOTS,
  now = new Date(),
  minDate,
  maxDate,
} = {}) {
  const range = bookingRange(now)
  const floor = startOfDay(minDate || range.minDate)
  const ceiling = startOfDay(maxDate || range.maxDate)
  let year = fromYear
  let month = fromMonth
  for (let step = 0; step < 24; step += 1) {
    const monthStart = startOfDay(new Date(year, month, 1))
    const monthEnd = startOfDay(new Date(year, month + 1, 0))
    if (monthStart > ceiling) return null
    if (monthEnd >= floor) {
      if (monthHasBookableSlots({
        year,
        month,
        doctorId,
        visitType,
        liveTimes,
        hasRemoteSchedule,
        fallbackSlots,
        now,
        minDate: floor,
        maxDate: ceiling,
      })) {
        return { year, month }
      }
    }
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return null
}

export function periodsWithBookableSlots({
  slots,
  doctorId,
  date,
  visitType,
  now = new Date(),
} = {}) {
  const open = new Set(bookableSlots({ doctorId, date, visitType, slots, now }))
  return groupSlotsByPeriod(slots)
    .map((period) => ({
      ...period,
      slots: period.slots.filter((slot) => open.has(slot)),
    }))
    .filter((period) => period.slots.length > 0)
}
