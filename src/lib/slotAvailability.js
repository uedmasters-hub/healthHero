import { parseClock } from './bookingPolicy'

function availabilityDateKey(date) {
  if (!date) return ''
  const d = date.full instanceof Date ? date.full : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return String(date)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

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
