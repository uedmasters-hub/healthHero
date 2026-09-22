import { formatAppDate } from '../lib/locale'
import { formatPlaceParts } from '../features/geography/formatPlace'
import { createAddress, createId, formatNepalPhone } from './models'

export const HEALTH_KINDS = Object.freeze([
  'reports',
  'prescriptions',
  'diagnoses',
  'medications',
  'allergies',
  'conditions',
  'surgeries',
  'vaccinations',
  'consultations',
])

const PREFIX = {
  reports: 'rpt',
  prescriptions: 'rxp',
  diagnoses: 'dx',
  medications: 'med',
  allergies: 'alg',
  conditions: 'cnd',
  surgeries: 'srg',
  vaccinations: 'vac',
  consultations: 'con',
  emergency: 'emg',
  insurance: 'ins',
}

export function emptyHealth() {
  return HEALTH_KINDS.reduce((acc, kind) => {
    acc[kind] = []
    return acc
  }, {})
}

export function displayHealthDate(value) {
  if (!value) return ''
  if (value instanceof Date) return formatAppDate(value)
  const raw = String(value).trim()
  if (!raw) return ''
  const formatted = formatAppDate(raw)
  if (formatted) return formatted
  return raw
}

export function createHealthItem(kind, partial = {}) {
  const id = partial.id || createId(PREFIX[kind] || 'hlt')
  return {
    id,
    kind,
    title: String(partial.title || partial.name || '').trim(),
    date: partial.date || partial.diagnosedOn || partial.started || '',
    doctor: String(partial.doctor || partial.provider || partial.hospital || '').trim(),
    details: String(partial.details || partial.note || partial.reaction || '').trim(),
    status: partial.status || '',
    severity: partial.severity || '',
    dose: partial.dose || '',
    attachments: Array.isArray(partial.attachments) ? partial.attachments : [],
    image: partial.image || '',
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createEmergencyContact(partial = {}) {
  return {
    id: partial.id || createId(PREFIX.emergency),
    name: String(partial.name || '').trim(),
    relation: String(partial.relation || partial.relationship || '').trim(),
    phone: formatNepalPhone(partial.phone || ''),
  }
}

export function createInsurancePolicy(partial = {}) {
  return {
    id: partial.id || createId(PREFIX.insurance),
    provider: String(partial.provider || '').trim(),
    policyNo: String(partial.policyNo || '').trim(),
    validTill: partial.validTill || '',
    type: String(partial.type || 'Health').trim(),
    coverage: String(partial.coverage || '').trim(),
    attachments: Array.isArray(partial.attachments) ? partial.attachments : [],
  }
}

export const HEALTH_SECTIONS = [
  {
    kind: 'reports',
    title: 'Medical Reports',
    singular: 'report',
    empty: 'No lab or imaging reports yet.',
    addLabel: 'Add report',
    fields: [
      { key: 'title', label: 'Report name', required: true, placeholder: 'e.g. CBC & Fasting Sugar' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'doctor', label: 'Lab / doctor', placeholder: 'Facility or doctor name' },
      { key: 'details', label: 'Notes', type: 'textarea', placeholder: 'Findings or instructions' },
    ],
  },
  {
    kind: 'prescriptions',
    title: 'Prescriptions',
    singular: 'prescription',
    empty: 'No prescriptions saved yet.',
    addLabel: 'Add prescription',
    fields: [
      { key: 'title', label: 'Prescription', required: true, placeholder: 'e.g. Rx · Dr. Vivek Menon' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'doctor', label: 'Prescribed by', placeholder: 'Doctor name' },
      { key: 'details', label: 'Medicines & instructions', type: 'textarea', placeholder: 'List medicines and how to take them' },
    ],
  },
  {
    kind: 'diagnoses',
    title: 'Diagnoses',
    singular: 'diagnosis',
    empty: 'No diagnoses recorded yet.',
    addLabel: 'Add diagnosis',
    fields: [
      { key: 'title', label: 'Diagnosis', required: true, placeholder: 'e.g. Vitamin D deficiency' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'doctor', label: 'Diagnosed by', placeholder: 'Doctor name' },
      { key: 'status', label: 'Status', type: 'chips', options: ['Active', 'Monitoring', 'Resolved'] },
      { key: 'details', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    kind: 'medications',
    title: 'Medications',
    singular: 'medication',
    empty: 'No current medications saved.',
    addLabel: 'Add medication',
    fields: [
      { key: 'title', label: 'Medicine', required: true, placeholder: 'e.g. Metformin 500mg' },
      { key: 'date', label: 'Started', type: 'date' },
      { key: 'doctor', label: 'Prescribed by' },
      { key: 'status', label: 'Status', type: 'chips', options: ['Active', 'Paused', 'Stopped'] },
      { key: 'details', label: 'Instructions', type: 'textarea', placeholder: 'Dose, timing, with food' },
    ],
  },
  {
    kind: 'allergies',
    title: 'Allergies',
    singular: 'allergy',
    empty: 'No allergies recorded.',
    addLabel: 'Add allergy',
    fields: [
      { key: 'title', label: 'Allergen', required: true, placeholder: 'e.g. Penicillin' },
      { key: 'severity', label: 'Severity', type: 'chips', options: ['Mild', 'Moderate', 'Severe'] },
      { key: 'details', label: 'Reaction', type: 'textarea', placeholder: 'What happens, and any treatment' },
      { key: 'date', label: 'Noted on', type: 'date' },
    ],
  },
  {
    kind: 'conditions',
    title: 'Chronic Conditions',
    singular: 'condition',
    empty: 'No chronic conditions recorded.',
    addLabel: 'Add condition',
    fields: [
      { key: 'title', label: 'Condition', required: true, placeholder: 'e.g. Type 2 Diabetes' },
      { key: 'date', label: 'Since', type: 'date' },
      { key: 'status', label: 'Status', type: 'chips', options: ['Active', 'Managed', 'Resolved'] },
      { key: 'doctor', label: 'Treating doctor' },
      { key: 'details', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    kind: 'surgeries',
    title: 'Surgeries',
    singular: 'surgery',
    empty: 'No surgeries recorded.',
    addLabel: 'Add surgery',
    fields: [
      { key: 'title', label: 'Procedure', required: true, placeholder: 'e.g. Appendectomy' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'doctor', label: 'Hospital / surgeon' },
      { key: 'details', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    kind: 'vaccinations',
    title: 'Vaccinations',
    singular: 'vaccination',
    empty: 'No vaccinations recorded.',
    addLabel: 'Add vaccination',
    fields: [
      { key: 'title', label: 'Vaccine', required: true, placeholder: 'e.g. Tetanus booster' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'dose', label: 'Dose', placeholder: 'e.g. Dose 2, Booster' },
      { key: 'doctor', label: 'Given at' },
      { key: 'details', label: 'Notes', type: 'textarea' },
    ],
  },
]

export const LIST_SECTIONS = [
  {
    kind: 'emergencyContacts',
    title: 'Emergency Contacts',
    singular: 'contact',
    empty: 'Add someone we can reach in an emergency.',
    addLabel: 'Add contact',
    fields: [
      { key: 'name', label: 'Name', required: true, placeholder: 'Full name' },
      { key: 'relation', label: 'Relation', required: true, placeholder: 'e.g. Spouse, Parent' },
      { key: 'phone', label: 'Phone', type: 'phone', required: true },
    ],
  },
  {
    kind: 'insurancePolicies',
    title: 'Insurance Details',
    singular: 'policy',
    empty: 'No insurance policies saved.',
    addLabel: 'Add policy',
    fields: [
      { key: 'provider', label: 'Provider', required: true, placeholder: 'e.g. Star Health' },
      { key: 'policyNo', label: 'Policy number', required: true },
      { key: 'type', label: 'Type', type: 'chips', options: ['Health', 'Family Floater', 'Critical Illness'] },
      { key: 'validTill', label: 'Valid till', type: 'date' },
      { key: 'coverage', label: 'Coverage notes', type: 'textarea', placeholder: 'In-patient, cashless network, room rent...' },
    ],
  },
  {
    kind: 'addresses',
    title: 'Saved Addresses',
    singular: 'address',
    empty: 'No saved addresses yet.',
    addLabel: 'Add address',
    fields: [
      { key: 'label', label: 'Label', required: true, placeholder: 'Home, Work, Other' },
      { key: 'line', label: 'Address', type: 'textarea', required: true, placeholder: 'Flat / house, street' },
      { key: 'city', label: 'City', required: true, placeholder: 'City' },
    ],
  },
]

export const ATTACH_GROUPS = [
  { key: 'reports', label: 'Reports & Lab Results', kinds: ['reports'] },
  { key: 'prescriptions', label: 'Prescriptions', kinds: ['prescriptions'] },
  { key: 'medications', label: 'Medications', kinds: ['medications'] },
  {
    key: 'history',
    label: 'Medical History',
    kinds: ['diagnoses', 'allergies', 'conditions', 'surgeries', 'vaccinations', 'consultations'],
  },
]

export function recordsFromHealth(health = emptyHealth()) {
  return {
    consultations: health.consultations || [],
    reports: health.reports || [],
    medications: health.medications || [],
  }
}

export function flattenHealth(health = emptyHealth()) {
  return HEALTH_KINDS.flatMap((kind) => (health[kind] || []).map((item) => ({ ...item, kind: item.kind || kind })))
}

export function findHealthItem(health, id) {
  if (!id) return null
  return flattenHealth(health).find((item) => item.id === id) || null
}

export function itemsForAttachGroup(health, groupKey) {
  const group = ATTACH_GROUPS.find((item) => item.key === groupKey)
  if (!group) return []
  return group.kinds.flatMap((kind) => (health?.[kind] || []).map((item) => ({ ...item, kind: item.kind || kind })))
}

export function attachedHealthItems(health, ids = []) {
  if (!ids?.length) return []
  const all = flattenHealth(health)
  return ids.map((id) => all.find((item) => item.id === id)).filter(Boolean)
}

export function healthItemMeta(item) {
  if (!item) return ''
  const date = displayHealthDate(item.date)
  const extra = item.doctor || item.severity || item.status || item.dose || ''
  return [date, extra].filter(Boolean).join(' · ')
}

function sortStamp(value) {
  if (!value) return 0
  const stamp = new Date(value).getTime()
  return Number.isFinite(stamp) ? stamp : 0
}

export function healthMemoryTimeline(health, visits = []) {
  const records = flattenHealth(health)
    .filter((item) => ['reports', 'prescriptions', 'consultations'].includes(item.kind))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      group: item.kind === 'reports' ? 'labs' : item.kind === 'prescriptions' ? 'prescriptions' : 'consults',
      title: item.title,
      date: item.date,
      sort: sortStamp(item.date) || sortStamp(item.createdAt),
      meta: [item.doctor, item.status, item.dose].filter(Boolean).join(' · '),
      details: item.details,
      record: item,
    }))

  const visitItems = (visits || []).map((visit) => {
    const date = visit.date?.full || visit.createdAt
    return {
      id: visit.engineId || visit.id,
      kind: 'visit',
      group: 'visits',
      title: visit.doctor?.name || visit.specialty || 'Clinic visit',
      date,
      sort: sortStamp(date),
      meta: [visit.visitType, visit.time].filter(Boolean).join(' · '),
      details: visit.note,
      record: visit,
    }
  })

  return [...records, ...visitItems].sort((a, b) => b.sort - a.sort)
}

export function listItemTitle(kind, item) {
  if (!item) return ''
  if (kind === 'emergencyContacts') return item.name
  if (kind === 'insurancePolicies') return item.provider
  if (kind === 'addresses') return item.label || 'Address'
  return item.title
}

export function listItemMeta(kind, item) {
  if (!item) return ''
  if (kind === 'emergencyContacts') return [item.relation, item.phone].filter(Boolean).join(' · ')
  if (kind === 'insurancePolicies') {
    const till = item.validTill ? `Valid till ${displayHealthDate(item.validTill)}` : ''
    return [item.policyNo, item.type, till].filter(Boolean).join(' · ')
  }
  if (kind === 'addresses') return formatPlaceParts(item.line, item.city)
  return healthItemMeta(item)
}

export function normalizeHealthState(user) {
  const health = emptyHealth()
  const incoming = user?.health && typeof user.health === 'object' ? user.health : {}
  HEALTH_KINDS.forEach((kind) => {
    const list = Array.isArray(incoming[kind]) ? incoming[kind] : []
    health[kind] = list.map((item) => createHealthItem(kind, item))
  })

  const records = user?.records || {}
  ;['consultations', 'reports', 'medications'].forEach((kind) => {
    if (!health[kind].length && Array.isArray(records[kind]) && records[kind].length) {
      health[kind] = records[kind].map((item) => createHealthItem(kind, item))
    }
  })

  if (!health.prescriptions.length && Array.isArray(user?.prescriptions) && user.prescriptions.length) {
    health.prescriptions = user.prescriptions.map((rx) => createHealthItem('prescriptions', {
      id: rx.id,
      title: rx.prescriber?.name ? `Rx · ${rx.prescriber.name}` : 'Prescription',
      date: rx.patient?.date || '',
      doctor: rx.prescriber?.name || '',
      details: rx.note || (rx.medications || []).map((med) => med.name).join(', '),
    }))
  }

  let emergencyContacts = Array.isArray(user?.emergencyContacts)
    ? user.emergencyContacts.map(createEmergencyContact)
    : []
  const legacyEmergency = user?.profile?.emergencyContact
  if (!emergencyContacts.length && legacyEmergency?.name) {
    emergencyContacts = [createEmergencyContact(legacyEmergency)]
  }

  let insurancePolicies = Array.isArray(user?.insurancePolicies)
    ? user.insurancePolicies.map(createInsurancePolicy)
    : []
  const legacyInsurance = user?.profile?.insurance
  if (!insurancePolicies.length && legacyInsurance?.provider) {
    insurancePolicies = [createInsurancePolicy(legacyInsurance)]
  }

  let addresses = Array.isArray(user?.addresses) ? user.addresses.map(createAddress) : []
  if (!addresses.length && user?.profile?.address) {
    addresses = [createAddress({
      id: 'addr-home',
      label: 'Home',
      line: user.profile.address,
      city: user.profile.city,
      isDefault: true,
    })]
  }

  return {
    health,
    emergencyContacts,
    insurancePolicies,
    addresses,
    records: recordsFromHealth(health),
  }
}
