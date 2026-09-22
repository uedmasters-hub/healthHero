export const APP_LOCALE = 'en-NP'
export const APP_CURRENCY = 'NPR'
export const APP_COUNTRY_CODE = 'NP'
export const APP_DIAL_CODE = '+977'
export const APP_DIAL_DIGITS = '977'

/** Kathmandu fallback when registry coordinates are unavailable */
export const APP_DEFAULT_COORDS = Object.freeze({
  latitude: 27.7172,
  longitude: 85.3240,
  label: 'Kathmandu, Nepal',
})

function asDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const next = new Date(value)
  return Number.isNaN(next.getTime()) ? null : next
}

function localeTag() {
  try {
    // Prefer en-NP; fall back if the runtime lacks that locale data.
    new Intl.DateTimeFormat('en-NP').format(new Date())
    return APP_LOCALE
  } catch {
    return 'en-GB'
  }
}

export function formatAppDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = asDate(value)
  if (!date) return ''
  return date.toLocaleDateString(localeTag(), options)
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
  const weekday = date.toLocaleDateString(localeTag(), { weekday: 'short' })
  return `${weekday}, ${formatAppDate(date)}, ${formatAppTime(date)}`
}
