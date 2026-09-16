export const EDIT_LOCK_MINUTES = 45

export const PREP_LOCK_MESSAGE =
  'Changes are unavailable within 45 minutes of your appointment as your doctor may already be reviewing your medical information and preparing for your consultation.'

export const QUICK_BOOK_NOTICE =
  'Quick Book is for immediate consultations where your doctor may not have enough time to review your complete records before the visit.'

export function parseClock(timeStr = '') {
  const cleaned = String(timeStr).trim().toLowerCase().replace(/\./g, '')
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
  if (!match) return { hours: 0, minutes: 0 }
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const mer = match[3]
  if (mer === 'pm' && hours !== 12) hours += 12
  if (mer === 'am' && hours === 12) hours = 0
  return { hours, minutes }
}

export function getAppointmentStart(dateValue, timeStr) {
  const base = dateValue?.full instanceof Date
    ? new Date(dateValue.full)
    : new Date(dateValue || Date.now())
  const { hours, minutes } = parseClock(timeStr)
  base.setHours(hours, minutes, 0, 0)
  return base
}

export function getBookingWindow(start, now = new Date()) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    return {
      minutesUntil: Number.POSITIVE_INFINITY,
      isPast: false,
      isLocked: false,
      isQuickBook: false,
      mode: 'standard',
    }
  }

  const minutesUntil = (start.getTime() - now.getTime()) / 60000
  const isPast = minutesUntil < 0
  const isQuickBook = minutesUntil >= 0 && minutesUntil <= EDIT_LOCK_MINUTES
  const isLocked = minutesUntil <= EDIT_LOCK_MINUTES

  return {
    minutesUntil,
    isPast,
    isLocked,
    isQuickBook,
    mode: isQuickBook ? 'quick' : 'standard',
  }
}

export function getSlotWindow(dateValue, timeStr, now = new Date()) {
  return getBookingWindow(getAppointmentStart(dateValue, timeStr), now)
}

export function currentDayPeriod(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export function formatCountdown(start, now = new Date()) {
  const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60000)
  if (minutesUntil < 0) return 'Starting soon'
  if (minutesUntil < 60) return `Appointment in ${Math.max(1, minutesUntil)} min`
  const hours = Math.round(minutesUntil / 60)
  if (hours < 24) return `Appointment in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.ceil(minutesUntil / (60 * 24))
  return `Appointment in ${days} day${days === 1 ? '' : 's'}`
}

export function formatTimeSlot(date) {
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const mer = hours >= 12 ? 'AM' : 'PM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${mer}`
}

export function formatClockLabel(date) {
  return formatTimeSlot(date)
}
