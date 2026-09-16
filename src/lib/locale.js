export const APP_LOCALE = 'en-IN'
export const APP_CURRENCY = 'INR'

function asDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const next = new Date(value)
  return Number.isNaN(next.getTime()) ? null : next
}

export function formatAppDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = asDate(value)
  if (!date) return ''
  return date.toLocaleDateString(APP_LOCALE, options)
}

export function formatAppTime(value) {
  const date = asDate(value)
  if (!date) return ''
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const mer = hours >= 12 ? 'AM' : 'PM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${mer}`
}

export function formatAppDateTime(value) {
  const date = asDate(value)
  if (!date) return ''
  return `${formatAppDate(date)}, ${formatAppTime(date)}`
}

export function formatAppWeekdayDate(value) {
  return formatAppDate(value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAppWhen(value) {
  const date = asDate(value)
  if (!date) return ''
  const weekday = date.toLocaleDateString(APP_LOCALE, { weekday: 'short' })
  return `${weekday}, ${formatAppDate(date)}, ${formatAppTime(date)}`
}
