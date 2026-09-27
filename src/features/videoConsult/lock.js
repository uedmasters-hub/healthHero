import { makeDateValue } from '../../components/calendar/dates.js'

const LOCK_KEY = 'emedicalls:video-consult-lock.v1'
const JOURNEY_KEY = 'emedicalls:video-booking-context.v1'
const PASS_MS = 30 * 60 * 1000

export const VIDEO_SLOT_PATH = '/booking/slot'

export function isVideoVisit(value) {
  return /video|virtual/i.test(String(value || ''))
}

export function isVideoEntry(state = {}) {
  return Boolean(state?.videoLock) || isVideoVisit(state?.preferredVisitType) || isVideoVisit(state?.visitType)
}

export function videoEntryState(extra = {}) {
  return {
    ...extra,
    videoLock: true,
    preferredVisitType: 'Video Consultation',
    visitType: 'Video Consultation',
  }
}

export function readVideoLock() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LOCK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeVideoLock(patch) {
  const next = { ...(readVideoLock() || {}), ...patch, videoLock: true, visitType: 'Video Consultation' }
  try {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}

export function clearVideoLock() {
  try {
    sessionStorage.removeItem(LOCK_KEY)
  } catch {
    /* ignore */
  }
}

function journeySnapshot(state = {}) {
  return {
    doctor: state.doctor || null,
    date: state.date || null,
    time: state.time || null,
    visitType: 'Video Consultation',
    preferredVisitType: 'Video Consultation',
    videoLock: true,
    origin: state.origin || null,
    returnTo: state.returnTo || null,
    restore: state.restore || null,
    duration: state.duration || null,
    forSomeoneElse: Boolean(state.forSomeoneElse),
    fromProfile: Boolean(state.fromProfile),
    bookingMode: state.bookingMode || null,
    entryReturnTo: state.entryReturnTo || null,
    outcome: state.outcome || null,
    phase: state.phase || null,
    summary: state.summary || null,
    patient: state.patient || null,
  }
}

export function readVideoJourney() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(JOURNEY_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed?.videoLock || !parsed.doctor) return null
    const source = parsed.date?.full || parsed.date?.iso
    if (source && !(parsed.date?.full instanceof Date)) {
      const revived = makeDateValue(source)
      if (!Number.isNaN(revived.full.getTime())) parsed.date = revived
    }
    return parsed
  } catch {
    return null
  }
}

export function saveVideoJourney(patch = {}, { replace = false } = {}) {
  const prev = replace ? {} : (readVideoJourney() || {})
  const next = journeySnapshot({
    ...prev,
    ...patch,
    doctor: patch.doctor || prev.doctor || null,
    summary: patch.summary || prev.summary || null,
    patient: patch.patient || prev.patient || null,
  })
  try {
    sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}

export function clearVideoJourney() {
  try {
    sessionStorage.removeItem(JOURNEY_KEY)
  } catch {
    /* ignore */
  }
}

/** Route state when it already names a doctor, otherwise the saved video journey. */
export function resolveBookingEntry(routeState) {
  const route = routeState || {}
  if (route.doctor && !isVideoEntry(route)) return route
  if (route.doctor) return videoEntryState(route)
  const saved = readVideoJourney()
  if (saved?.doctor) return videoEntryState(saved)
  return route
}

export function beginReadiness(navigate, bookingState) {
  const state = videoEntryState(bookingState)
  const saved = saveVideoJourney({ ...state, phase: 'permissions', outcome: null, summary: null }, { replace: true })
  navigate('/video/readiness', {
    state: {
      ...saved,
      afterReadiness: { to: VIDEO_SLOT_PATH, state: saved },
    },
  })
}

export function readinessStillValid(lock, now = Date.now()) {
  if (!lock?.outcome || lock.outcome === 'poor') return false
  if (!lock.checkedAt) return false
  return now - lock.checkedAt < PASS_MS
}
