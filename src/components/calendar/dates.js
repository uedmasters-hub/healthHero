export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const BOOKING_HORIZON_DAYS = 60

export function startOfDay(value = new Date()) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(value, days) {
  const next = startOfDay(value)
  next.setDate(next.getDate() + days)
  return next
}

export function bookingRange(now = new Date()) {
  const minDate = startOfDay(now)
  return { minDate, maxDate: addDays(minDate, BOOKING_HORIZON_DAYS) }
}

export function yearsInRange(minDate, maxDate) {
  if (!minDate || !maxDate) return []
  const years = []
  for (let year = minDate.getFullYear(); year <= maxDate.getFullYear(); year += 1) years.push(year)
  return years
}

export function monthOverlapsRange(year, month, minDate, maxDate) {
  if (!minDate || !maxDate) return true
  const start = startOfDay(new Date(year, month, 1))
  const end = startOfDay(new Date(year, month + 1, 0))
  return start <= maxDate && end >= minDate
}

export function monthsInRange(year, minDate, maxDate) {
  return MONTH_SHORT
    .map((label, month) => ({ label, month }))
    .filter((item) => monthOverlapsRange(year, item.month, minDate, maxDate))
}

export function parseIsoDate(iso) {
  if (!iso) return null
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function toIsoDate(date) {
  const d = date instanceof Date ? date : date?.full
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function formatDisplayDate(iso) {
  const d = parseIsoDate(iso)
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function makeDateValue(input = new Date()) {
  const d = input instanceof Date ? new Date(input) : new Date(input)
  d.setHours(0, 0, 0, 0)
  return {
    day: d.toLocaleDateString('en-NP', { weekday: 'short' }),
    num: d.getDate(),
    month: d.toLocaleDateString('en-NP', { month: 'short' }),
    monthLong: d.toLocaleDateString('en-NP', { month: 'long' }),
    year: d.getFullYear(),
    full: d,
  }
}

export function generateDatesFrom(startInput, count = 7) {
  const start = startOfDay(startInput)
  const dates = []
  for (let i = 0; i < count; i++) {
    dates.push(makeDateValue(addDays(start, i)))
  }
  return dates
}

export function generateDates({ count = 7, offset = 0, from } = {}) {
  const start = from ? startOfDay(from) : addDays(startOfDay(new Date()), offset)
  return generateDatesFrom(start, count)
}

/**
 * Keep the inline 7-day strip as the primary selector.
 * If the selected day falls outside the current window (e.g. from the
 * calendar bottom sheet), rebuild a 7-day window that includes it —
 * never replace the strip with a month grid.
 */
export function stripDatesForSelection(selected, { count = 7, now = new Date() } = {}) {
  const { minDate, maxDate } = bookingRange(now)
  const selectedDay = selected?.full ? startOfDay(selected.full) : minDate
  const upcoming = generateDatesFrom(minDate, count)

  if (upcoming.some((date) => isSameDate(date, selected))) {
    return upcoming
  }

  let start = selectedDay < minDate ? minDate : selectedDay
  const latestStart = addDays(maxDate, -(count - 1))
  if (start > latestStart) {
    start = latestStart < minDate ? minDate : latestStart
  }
  return generateDatesFrom(start, count)
}

export function dateKey(date) {
  if (!date) return ''
  const d = date.full instanceof Date ? date.full : date
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function isSameDate(a, b) {
  return Boolean(a && b && dateKey(a) === dateKey(b))
}

export function monthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length < 42) days.push(null)
  return days
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const DAY_PERIODS = [
  { id: 'morning', label: 'Morning', icon: 'sun' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
]

export const AVAILABILITY_PERIODS = [
  { id: 'morning', label: 'Morning', time: '9 AM – 12 PM', icon: 'sun' },
  { id: 'afternoon', label: 'Afternoon', time: '1 PM – 5 PM', icon: 'cloud' },
  { id: 'evening', label: 'Evening', time: '6 PM – 10 PM', icon: 'moon' },
]

export const VISIT_TYPES = [
  { id: 'In-Person', label: 'In-Person', icon: 'home' },
  { id: 'Video Consultation', label: 'Video Consultation', icon: 'video' },
]
