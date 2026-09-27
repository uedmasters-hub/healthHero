/** One primary visit outcome, shared by the report page, booking engine, and care hub. */

export const VISIT_OUTCOME_IDS = Object.freeze([
  'felt_better',
  'prescription',
  'tests',
  'referral',
  'follow_up',
  'other',
])

export const VISIT_OUTCOMES = Object.freeze([
  { id: 'felt_better', label: 'I felt better' },
  {
    id: 'prescription',
    label: 'I received a prescription',
    detailKey: 'medications',
    detailLabel: 'Medicine',
    detailPlaceholder: 'Name and dose, if you remember',
  },
  {
    id: 'tests',
    label: 'Tests or labs were ordered',
    detailKey: 'tests',
    detailLabel: 'Tests or labs',
    detailPlaceholder: 'What was ordered',
  },
  {
    id: 'referral',
    label: 'I was referred to another specialist',
    detailKey: 'referral',
    detailLabel: 'Referral',
    detailPlaceholder: 'Specialist or clinic',
  },
  {
    id: 'follow_up',
    label: 'A follow-up was scheduled',
    detailKey: 'followUp',
    detailLabel: 'Follow-up',
    detailPlaceholder: 'When, or with whom',
  },
  {
    id: 'other',
    label: 'Something else happened',
    detailKey: 'note',
    detailLabel: 'What else happened',
    detailPlaceholder: 'Anything the clinic should know',
    multiline: true,
  },
])

export const VISIT_OUTCOME_LABELS = Object.freeze(
  Object.fromEntries(VISIT_OUTCOMES.map((item) => [item.id, item.label])),
)

const DETAIL_KEYS = Object.freeze({
  prescription: 'medications',
  tests: 'tests',
  referral: 'referral',
  follow_up: 'followUp',
  other: 'note',
})

const CLOSED_BOOKING = new Set(['cancelled', 'no_show', 'expired', 'refunded'])

function cleanText(value) {
  const text = String(value || '').trim()
  return text || ''
}

/** Latest patient report stored on the booking. Accepts the server snapshot or a local one. */
export function readPatientReport(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const primary = VISIT_OUTCOME_IDS.includes(value.primaryOutcome)
    ? value.primaryOutcome
    : (Array.isArray(value.outcomes)
      ? value.outcomes.find((id) => VISIT_OUTCOME_IDS.includes(id))
      : null)
  const reportedAt = value.reportedAt || value.reported_at || null
  if (!primary && !value.reportId && !reportedAt) return null
  return {
    reportId: value.reportId || null,
    primaryOutcome: primary || null,
    details: value.details && typeof value.details === 'object' ? value.details : {},
    reportedAt,
    status: value.status || 'pending_provider_confirmation',
  }
}

export function hasPatientReport(value) {
  const report = readPatientReport(value)
  return Boolean(report?.primaryOutcome || report?.reportId)
}

/** Home card copy for a visit that is still waiting on the clinic. */
export function waitingProviderView(booking) {
  const report = readPatientReport(booking?.meta?.patientReport)
  const submitted = Boolean(report?.primaryOutcome || report?.reportId)
  return {
    submitted,
    reportedAt: report?.reportedAt || null,
    cta: submitted ? 'Report submitted' : 'Report visit',
    prompt: submitted
      ? 'Waiting for your provider to confirm your report.'
      : 'Waiting for your provider to confirm outcomes.',
  }
}

/**
 * Decide whether a Supabase appointment row should replace local visit fields.
 * A report that has not reached the server yet is kept. A server report always wins.
 */
export function remoteVisitSnapshotWins(local = {}, remote = {}) {
  const remoteAt = Date.parse(remote.updatedAt || '') || 0
  const seenAt = Date.parse(local.remoteUpdatedAt || '') || 0
  const remoteHas = hasPatientReport(remote.patientReport)
  const localHas = hasPatientReport(local.patientReport)
  const providerArrived = remote.providerStatus === 'completed' && local.providerStatus !== 'completed'
  const reconciledArrived = remote.reconciliationStatus === 'reconciled' && local.reconciliationStatus !== 'reconciled'
  const statusChanged = Boolean(remote.status) && remote.status !== local.status
  const remoteNewer = remoteAt > seenAt
  if (remoteHas && !localHas) {
    return { apply: true, providerArrived, keepLocalReport: false }
  }
  if (local.reportPending && localHas && !remoteHas && !remoteNewer && !providerArrived && !reconciledArrived) {
    return { apply: false, providerArrived: false, keepLocalReport: true }
  }
  if (remoteNewer || statusChanged || providerArrived || reconciledArrived || remoteHas) {
    return {
      apply: true,
      providerArrived,
      keepLocalReport: Boolean(local.reportPending && localHas && !remoteHas),
    }
  }
  return { apply: false, providerArrived: false, keepLocalReport: localHas }
}

export function bookingIdentity(booking) {
  return booking?.engineId || booking?.id || null
}

function doctorKey(booking) {
  return booking?.doctor?.providerUuid || booking?.doctor?.id || null
}

function bookingTime(booking) {
  const full = booking?.date?.full || booking?.schedule?.date?.full || booking?.date || null
  if (!full) return null
  const time = full instanceof Date ? full.getTime() : new Date(full).getTime()
  return Number.isNaN(time) ? null : time
}

/** Soonest later visit with the same provider, or a booking already linked as a follow-up. */
export function findScheduledFollowUp(bookings = [], current) {
  const currentId = bookingIdentity(current)
  if (!currentId) return null
  const doctor = doctorKey(current)
  const currentWhen = bookingTime(current)
  const matches = bookings.filter((row) => {
    const id = bookingIdentity(row)
    if (!id || id === currentId) return false
    if (CLOSED_BOOKING.has(row.status)) return false
    if (row.parentBookingId === currentId) return true
    if (!doctor || doctorKey(row) !== doctor) return false
    const when = bookingTime(row)
    if (!when) return false
    return !currentWhen || when > currentWhen
  })
  matches.sort((a, b) => {
    const linkedA = a.parentBookingId === currentId ? 0 : 1
    const linkedB = b.parentBookingId === currentId ? 0 : 1
    if (linkedA !== linkedB) return linkedA - linkedB
    return (bookingTime(a) || 0) - (bookingTime(b) || 0)
  })
  return matches[0] || null
}

export function buildPatientReport({
  primaryOutcome,
  details = {},
  reportedAt,
  followUpBookingId,
} = {}) {
  const outcome = VISIT_OUTCOME_IDS.includes(primaryOutcome) ? primaryOutcome : null
  const stored = {}
  if (outcome) {
    const key = DETAIL_KEYS[outcome]
    const text = key ? cleanText(details[key]) : ''
    if (text) stored[key] = text
    if (outcome === 'follow_up' && followUpBookingId) stored.followUpBookingId = String(followUpBookingId)
  }
  return {
    primaryOutcome: outcome,
    outcomes: outcome ? [outcome] : [],
    details: stored,
    reportedAt: reportedAt || new Date().toISOString(),
    status: 'pending_provider_confirmation',
  }
}

function isOn(outcomes, ...keys) {
  return keys.some((key) => {
    const value = outcomes?.[key]
    return value === true || value === 'true' || value === 1 || value === '1'
  })
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0
}

/** Map a provider outcome document onto the same outcome ids the patient uses. */
export function providerOutcomeKeys(outcomes = {}) {
  const keys = []
  if (isOn(outcomes, 'felt_better', 'feltBetter')) keys.push('felt_better')
  if (isOn(outcomes, 'prescription') || hasItems(outcomes.medications)) keys.push('prescription')
  if (isOn(outcomes, 'tests', 'investigations') || hasItems(outcomes.labs)) keys.push('tests')
  if (isOn(outcomes, 'referral') || cleanText(outcomes.referralTo)) keys.push('referral')
  if (isOn(outcomes, 'follow_up', 'followUp') || cleanText(outcomes.followUpDate)) keys.push('follow_up')
  if (isOn(outcomes, 'other') || cleanText(outcomes.note)) keys.push('other')
  return keys
}

function patientPrimary(patientReport) {
  if (typeof patientReport === 'string' && VISIT_OUTCOME_IDS.includes(patientReport)) return patientReport
  if (Array.isArray(patientReport)) {
    return patientReport.find((id) => VISIT_OUTCOME_IDS.includes(id)) || null
  }
  if (VISIT_OUTCOME_IDS.includes(patientReport?.primaryOutcome)) return patientReport.primaryOutcome
  return (patientReport?.outcomes || []).find((id) => VISIT_OUTCOME_IDS.includes(id)) || null
}

/**
 * Keep the patient's primary outcome as the audit record.
 * Official care updates come from the provider's confirmed outcomes.
 */
export function reconcileVisitOutcomes(patientReport, providerOutcomes = {}) {
  const primary = patientPrimary(patientReport)
  const official = providerOutcomeKeys(providerOutcomes)
  const confirmed = primary && official.includes(primary) ? [primary] : []
  const patientOnly = primary && !official.includes(primary) ? [primary] : []
  const providerOnly = official.filter((id) => id !== primary)
  return {
    primaryOutcome: primary,
    confirmed,
    patientOnly,
    providerOnly,
    official,
    merged: official,
    unresolved: patientOnly,
  }
}
