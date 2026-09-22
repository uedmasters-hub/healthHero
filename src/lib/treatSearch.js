import { flattenHealth, displayHealthDate } from '../user'
import { getServiceMeta, resolveServiceType } from '../booking'

const score = (label, query) => {
  const hay = String(label || '').toLowerCase()
  const q = query.toLowerCase()
  if (!hay) return -1
  if (hay.startsWith(q)) return 0
  if (hay.includes(` ${q}`)) return 1
  if (hay.includes(q)) return 2
  return -1
}

function bestScore(fields, query) {
  const ranks = fields.map((field) => score(field, query)).filter((n) => n >= 0)
  if (!ranks.length) return null
  return Math.min(...ranks)
}

function doctorLabel(doctor, fallback = '') {
  const raw = doctor?.name || fallback || ''
  if (!raw) return 'Doctor'
  const name = String(raw).replace(/^Dr\.?\s*/i, '')
  return `Dr. ${name}`
}

function visitLabel(visit) {
  const service = getServiceMeta(resolveServiceType(visit))
  return visit.displayName
    || doctorLabel(visit.doctor, service.label)
    || service.label
}

function visitMeta(visit) {
  const tab = visit.historyTab || 'Visit'
  return [tab, visit.dateLabel, visit.condition, visit.categoryLabel].filter(Boolean).join(' · ')
}

/**
 * Build a personal-care catalog from the user's visits and health records.
 * Discovery catalog items (specialties, pharmacy, book appointment) are never included.
 */
export function buildTreatSearchCatalog(visits = [], health) {
  const items = []
  const seenDoctors = new Set()

  ;(visits || []).forEach((visit) => {
    const id = visit.engineId || visit.id
    const tab = visit.historyTab || 'Visit'
    const type = tab === 'Active' || tab === 'Upcoming'
      ? 'appointment'
      : 'care-history'
    items.push({
      type,
      id,
      label: visitLabel(visit),
      meta: visitMeta(visit),
      visit,
      kindRank: type === 'appointment' ? 0 : 1,
    })

    const doctor = visit.doctor
    const doctorId = doctor?.providerUuid || doctor?.id
    if (doctorId && !seenDoctors.has(String(doctorId))) {
      seenDoctors.add(String(doctorId))
      items.push({
        type: 'doctor',
        id: doctorId,
        label: doctorLabel(doctor, visit.displayName),
        meta: [doctor.specialty, 'Treating doctor'].filter(Boolean).join(' · '),
        doctor,
        kindRank: 2,
      })
    }
  })

  flattenHealth(health).forEach((record) => {
    if (record.kind === 'prescriptions') {
      items.push({
        type: 'prescription',
        id: record.id,
        label: record.title || 'Prescription',
        meta: ['Prescription', displayHealthDate(record.date), record.doctor].filter(Boolean).join(' · '),
        record,
        kind: record.kind,
        kindRank: 3,
      })
      return
    }
    if (record.kind === 'reports') {
      items.push({
        type: 'lab-report',
        id: record.id,
        label: record.title || 'Lab report',
        meta: ['Lab report', displayHealthDate(record.date), record.facility || record.doctor].filter(Boolean).join(' · '),
        record,
        kind: record.kind,
        kindRank: 4,
      })
      return
    }
    if (['consultations', 'diagnoses', 'conditions', 'surgeries', 'vaccinations', 'allergies', 'medications'].includes(record.kind)) {
      items.push({
        type: 'document',
        id: record.id,
        label: record.title || record.name || 'Medical document',
        meta: ['Medical document', displayHealthDate(record.date), record.doctor].filter(Boolean).join(' · '),
        record,
        kind: record.kind,
        kindRank: 5,
      })
    }
  })

  return items
}

function popularTreatSuggestions(catalog) {
  const pick = (type) => catalog.filter((item) => item.type === type)
  return [
    ...pick('appointment').slice(0, 3),
    ...pick('doctor').slice(0, 2),
    ...pick('prescription').slice(0, 1),
    ...pick('lab-report').slice(0, 1),
    ...pick('care-history').slice(0, 2),
    ...pick('document').slice(0, 1),
  ].slice(0, 8)
}

export function getTreatSearchSuggestions(rawQuery, { visits = [], health } = {}) {
  const catalog = buildTreatSearchCatalog(visits, health)
  const query = String(rawQuery || '').trim()
  if (!query) return popularTreatSuggestions(catalog)

  const hits = []
  catalog.forEach((item) => {
    const fields = [
      item.label,
      item.meta,
      item.visit?.condition,
      item.visit?.status,
      item.visit?.historyTab,
      item.doctor?.specialty,
      item.record?.details,
      item.record?.status,
      item.record?.dose,
    ]
    const rank = bestScore(fields, query)
    if (rank == null) return
    hits.push({ ...item, rank })
  })

  hits.sort((a, b) => a.rank - b.rank || a.kindRank - b.kindRank || a.label.localeCompare(b.label))

  const seen = new Set()
  return hits.filter((item) => {
    const key = `${item.type}:${item.id || item.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}
