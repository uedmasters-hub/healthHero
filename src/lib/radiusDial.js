/** Freehand search radius. A slow drag ticks 1 km; a fast drag snaps through 10 km. */

export const RADIUS_MIN_KM = 5
export const RADIUS_MAX_KM = 100
export const RADIUS_FINE_KM = 1
export const RADIUS_COARSE_KM = 10
/** Elastic stretch past the 5 km and 100 km stops, in kilometres. */
export const RADIUS_ELASTIC_MIN_KM = 4.1
export const RADIUS_ELASTIC_MAX_KM = 116
export const RADIUS_SPEED = Object.freeze({
  precise: 160,
  coarse: 480,
})

export const RADIUS_DIAL_STEPS = Object.freeze([
  { id: '5', km: 5, value: '5', unit: 'km' },
  { id: '10', km: 10, value: '10', unit: 'km' },
  { id: '20', km: 20, value: '20', unit: 'km' },
  { id: '50', km: 50, value: '50', unit: 'km' },
  { id: '100', km: 100, value: '100', unit: 'km' },
])

/** Reach is the handle distance as a fraction of the orbit radius. */
export const RADIUS_REACH = Object.freeze({
  min: 0.4,
  max: 1,
})

/**
 * How far the handle can travel past 5 km and 100 km while dragging.
 * Release springs back to the nearest stop.
 */
export const RADIUS_REACH_SLACK = 0.24

export function radiusDialIndex(radiusKm) {
  const km = Number(radiusKm)
  let best = 0
  let bestDist = Infinity
  RADIUS_DIAL_STEPS.forEach((step, index) => {
    const dist = Math.abs(step.km - km)
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  })
  return best
}

export function reachForIndex(index) {
  const last = RADIUS_DIAL_STEPS.length - 1
  const clamped = Math.max(0, Math.min(last, index))
  const t = last === 0 ? 0 : clamped / last
  return RADIUS_REACH.min + t * (RADIUS_REACH.max - RADIUS_REACH.min)
}

export function indexFromReach(reach) {
  let best = 0
  let bestDist = Infinity
  for (let index = 0; index < RADIUS_DIAL_STEPS.length; index += 1) {
    const dist = Math.abs(reach - reachForIndex(index))
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  }
  return best
}

/** Pointer offset from the location, in pixels, over the orbit radius. */
export function reachFromOffset(dx, dy, radiusPx) {
  if (!radiusPx) return RADIUS_REACH.min
  const reach = Math.hypot(dx, dy) / radiusPx
  const floor = RADIUS_REACH.min - RADIUS_REACH_SLACK
  const ceiling = RADIUS_REACH.max + RADIUS_REACH_SLACK
  return Math.max(floor, Math.min(ceiling, reach))
}

const REACH_SPAN = RADIUS_REACH.max - RADIUS_REACH.min
const KM_SPAN = RADIUS_MAX_KM - RADIUS_MIN_KM

/** Circle size for a kilometre value, including a short stretch past the stops. */
export function reachForKm(km) {
  const value = Number(km)
  if (!Number.isFinite(value) || value <= RADIUS_MIN_KM) {
    const room = RADIUS_MIN_KM - RADIUS_ELASTIC_MIN_KM
    const t = room ? Math.min(1, (RADIUS_MIN_KM - (Number.isFinite(value) ? value : RADIUS_MIN_KM)) / room) : 0
    return RADIUS_REACH.min - t * RADIUS_REACH_SLACK
  }
  if (value >= RADIUS_MAX_KM) {
    const room = RADIUS_ELASTIC_MAX_KM - RADIUS_MAX_KM
    const t = room ? Math.min(1, (value - RADIUS_MAX_KM) / room) : 0
    return RADIUS_REACH.max + t * RADIUS_REACH_SLACK
  }
  return RADIUS_REACH.min + ((value - RADIUS_MIN_KM) / KM_SPAN) * REACH_SPAN
}

/** Kilometres for a circle size. Inverse of `reachForKm`, so the map matches the ring. */
export function kmFromReach(reach) {
  const value = Number(reach)
  if (!Number.isFinite(value) || value <= RADIUS_REACH.min) {
    const t = Math.min(1, (RADIUS_REACH.min - (Number.isFinite(value) ? value : RADIUS_REACH.min)) / RADIUS_REACH_SLACK)
    return RADIUS_MIN_KM + (RADIUS_ELASTIC_MIN_KM - RADIUS_MIN_KM) * t
  }
  if (value >= RADIUS_REACH.max) {
    const t = Math.min(1, (value - RADIUS_REACH.max) / RADIUS_REACH_SLACK)
    return RADIUS_MAX_KM + (RADIUS_ELASTIC_MAX_KM - RADIUS_MAX_KM) * t
  }
  return RADIUS_MIN_KM + ((value - RADIUS_REACH.min) / REACH_SPAN) * KM_SPAN
}

/** 1× while the drag is careful, rising so a confident drag pulls the circle ahead. */
export function radiusVelocityGain(pxPerSec) {
  const speed = Math.max(0, Number(pxPerSec) || 0)
  const span = RADIUS_SPEED.coarse - RADIUS_SPEED.precise
  const t = span > 0 ? Math.max(0, Math.min(1, (speed - RADIUS_SPEED.precise) / span)) : 1
  const eased = t * t * (3 - 2 * t)
  return 1 + 3 * eased
}

/** Radial pixels that match one kilometre when the circle tracks the finger. */
export function radiusPxPerKm(radiusPx) {
  const px = Number(radiusPx)
  if (!px) return 1
  return (px * REACH_SPAN) / KM_SPAN
}

/** Stay on 1 km until the drag is clearly fast, then hold 10 km until it slows again. */
export function radiusQuantum(pxPerSec, coarse = false) {
  const speed = Math.max(0, Number(pxPerSec) || 0)
  if (coarse) return speed < RADIUS_SPEED.precise ? RADIUS_FINE_KM : RADIUS_COARSE_KM
  return speed >= RADIUS_SPEED.coarse ? RADIUS_COARSE_KM : RADIUS_FINE_KM
}

function coarseTarget(km, direction) {
  const mark = Math.round(km / RADIUS_COARSE_KM) * RADIUS_COARSE_KM
  if (Math.abs(km - mark) < 0.8) return mark
  return direction < 0
    ? Math.floor(km / RADIUS_COARSE_KM) * RADIUS_COARSE_KM
    : Math.ceil(km / RADIUS_COARSE_KM) * RADIUS_COARSE_KM
}

/**
 * Advance the raw radius by a finger movement.
 * A careful drag tracks the finger and changes by about 1 km at a time.
 * A fast drag accelerates and aims at the next 10 km milestone.
 */
export function advanceRadiusDrag({ km, deltaPx, pxPerSec, pxPerKm = 1, coarse = false }) {
  const quantum = radiusQuantum(pxPerSec, coarse)
  const gain = quantum === RADIUS_COARSE_KM ? radiusVelocityGain(pxPerSec) : 1
  const unit = Math.max(0.35, Number(pxPerKm) || 1)
  const next = Math.min(
    RADIUS_ELASTIC_MAX_KM,
    Math.max(RADIUS_ELASTIC_MIN_KM, Number(km) + ((Number(deltaPx) || 0) / unit) * gain),
  )
  const direction = Math.sign(deltaPx) || 1
  const target = quantum === RADIUS_FINE_KM ? next : coarseTarget(next, direction)
  return {
    km: next,
    target: Math.min(RADIUS_ELASTIC_MAX_KM, Math.max(RADIUS_ELASTIC_MIN_KM, target)),
    quantum,
    gain,
    direction,
  }
}

/** Release settles on 1 km after a careful drag, or on a 10 km milestone after a flick. */
export function settleRadiusKm(km, pxPerSec, direction = 1) {
  const speed = Math.max(0, Number(pxPerSec) || 0)
  const sign = direction < 0 ? -1 : 1
  let value = Number(km)
  if (!Number.isFinite(value)) value = RADIUS_MIN_KM
  if (speed >= RADIUS_SPEED.coarse) {
    const coast = Math.min(20, ((speed - RADIUS_SPEED.precise) / 700) * 20) * sign
    value = Math.round((value + coast) / RADIUS_COARSE_KM) * RADIUS_COARSE_KM
  } else {
    value = Math.round(value)
  }
  return Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, value))
}

export function labelRadiusKm(km) {
  const value = Number(km)
  if (!Number.isFinite(value)) return RADIUS_MIN_KM
  return Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, Math.round(value)))
}

/** Web-mercator zoom that keeps `radiusKm` comfortably inside the preview. */
export function mapZoomForRadius(lat, radiusKm, frameRadiusPx = 150) {
  const km = Math.max(1, Number(radiusKm) || 1)
  const frame = Math.max(48, Number(frameRadiusPx) || 150)
  const metersPerPixel = (km * 1000) / frame
  const cos = Math.cos(((Number(lat) || 0) * Math.PI) / 180)
  const zoom = Math.log2((156543.03392 * Math.max(0.2, Math.abs(cos))) / metersPerPixel)
  return Math.max(5, Math.min(16, zoom))
}

export function projectMercator(lat, lng, zoom) {
  const scale = 256 * 2 ** zoom
  const sin = Math.sin((lat * Math.PI) / 180)
  const clamped = Math.max(-0.9999, Math.min(0.9999, sin))
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale,
  }
}

export function pluralSpecialty(name) {
  const text = String(name || '').trim()
  if (!text || text === 'All') return ''
  if (/s$/i.test(text)) return text
  if (/[^aeiou]y$/i.test(text)) return `${text.slice(0, -1)}ies`
  return `${text}s`
}

export function formatRadiusDate(date) {
  const value = date?.full instanceof Date ? date.full : (date instanceof Date ? date : null)
  if (!value || Number.isNaN(value.getTime())) return ''
  const month = value.toLocaleDateString('en-US', { month: 'short' })
  return `${month} ${value.getDate()}`
}

export function emptyDateLabel(availability, date) {
  if (availability === 'This Week') return 'this week'
  if (availability === 'Today') return formatRadiusDate(new Date())
  if (availability === 'Tomorrow') {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    return formatRadiusDate(next)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(availability || ''))) {
    const [year, month, day] = String(availability).split('-').map(Number)
    return formatRadiusDate(new Date(year, month - 1, day))
  }
  if (!availability || availability === 'All') return ''
  return formatRadiusDate(date)
}

export function nearbyEmptyTitle(dateLabel) {
  return dateLabel
    ? `No doctors are available nearby for ${dateLabel}.`
    : 'No doctors are available nearby.'
}

export function nationwideEmptyTitle(dateLabel) {
  return dateLabel
    ? `No doctors are available across Nepal for ${dateLabel}.`
    : 'No doctors are available across Nepal.'
}

export const NEARBY_EMPTY_HINT = 'Expand your search or try another day.'
export const NATIONWIDE_EMPTY_HINT = 'Choose another day.'
