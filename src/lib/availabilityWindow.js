/** Shared booking window for listing, profile, and date selection. */

export function slotVisitMode(visitType) {
  const text = String(visitType || '')
  if (/video|virtual/i.test(text)) return 'video'
  if (/in[- ]?person|clinic/i.test(text)) return 'in_person'
  return null
}

function isoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shift(day, amount) {
  const next = new Date(day)
  next.setDate(next.getDate() + amount)
  return next
}

/** Date range for the listing availability filter. `All` is the booking horizon. */
export function availabilityWindow(preset, now = new Date(), horizonDays = 60) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (typeof preset === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(preset)) {
    return { from: preset, until: preset }
  }
  if (preset === 'Today') return { from: isoDate(start), until: isoDate(start) }
  if (preset === 'Tomorrow') {
    const day = shift(start, 1)
    return { from: isoDate(day), until: isoDate(day) }
  }
  if (preset === 'This Week') return { from: isoDate(start), until: isoDate(shift(start, 6)) }
  const horizon = Math.max(1, Number(horizonDays) || 60)
  return { from: isoDate(start), until: isoDate(shift(start, horizon)) }
}
