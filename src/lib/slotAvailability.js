import { getSlotWindow, parseClock } from './bookingPolicy'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  bookingRange,
  makeDateValue,
  startOfDay,
  toIsoDate,
} from '../components/calendar/dates'

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

/**
 * Clock instant for a clinic slot. Accepts `09:00:00` or `9:00 AM`.
 * Slot clocks are clinic-local and match `available_slots.start_time`.
 */
export function slotInstant(dateIso, timeValue) {
  if (!dateIso || !timeValue) return null
  const day = new Date(`${dateIso}T00:00:00`)
  if (Number.isNaN(day.getTime())) return null
  const text = String(timeValue).trim()
  if (/[ap]m/i.test(text)) {
    const { hours, minutes } = parseClock(text)
    day.setHours(hours || 0, minutes || 0, 0, 0)
    return day
  }
  const [hStr, mStr] = text.split(':')
  day.setHours(Number(hStr) || 0, Number(mStr) || 0, 0, 0)
  return day
}

export function isFutureSlotInstant(dateIso, timeValue, now = new Date()) {
  const at = slotInstant(dateIso, timeValue)
  return Boolean(at && at.getTime() > now.getTime())
}

/** Every Supabase slot that is still available stays open. Past times are dropped later. */
export function visitSlotAvailability({
  slots = [],
} = {}) {
  return new Set(slots)
}

/**
 * Resolve candidate times for a date.
 * When live availability exists, only listed days are bookable; missing days are empty.
 * A remote schedule never invents times. The demo template is only for offline mode.
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
