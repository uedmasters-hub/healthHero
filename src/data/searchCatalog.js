import { getDoctorList, pickDoctorCredentials } from '../features/providers'
import { articles } from './articles'

export const SEARCH_SPECIALISATIONS = [
  { name: 'Cardiologist', image: '/img/specilisations/Cardiologist.png' },
  { name: 'Dentist', image: '/img/specilisations/Dentist.png' },
  { name: 'Dermatologist', image: '/img/specilisations/Dermatologist.png' },
  { name: 'ENT Specialist', image: '/img/specilisations/ENT Specialist.png' },
  { name: 'Endocrinologist', image: '/img/specilisations/Endocrinologist.png' },
  { name: 'Gastroenterologist', image: '/img/specilisations/Gastroenterologist.png' },
  { name: 'General Physician', image: '/img/specilisations/General Physician.png' },
  { name: 'Gynecologist', image: '/img/specilisations/Gynecologist.png' },
  { name: 'Immunologist', image: '/img/specilisations/Immunologist.png' },
  { name: 'Neurologist', image: '/img/specilisations/Neurologist.png' },
  { name: 'Nutritionist', image: '/img/specilisations/Nutritionist.png' },
  { name: 'Ophthalmologist', image: '/img/specilisations/Ophthalmologist.png' },
  { name: 'Orthopedist', image: '/img/specilisations/Orthopedist.png' },
  { name: 'Pediatrician', image: '/img/specilisations/Pediatrician.png' },
  { name: 'Physiotherapist', image: '/img/specilisations/Physiotherapist.png' },
  { name: 'Psychiatrist', image: '/img/specilisations/Psychiatrist.png' },
  { name: 'Pulmonologist', image: '/img/specilisations/Pulmonologist.png' },
  { name: 'Urologist', image: '/img/specilisations/Urologist.png' },
]

export const SEARCH_SERVICES = [
  { name: 'Book Appointment', to: '/booking' },
  { name: 'Video Consultation', to: '/booking' },
  { name: 'Pharmacy', to: '/pharmacy' },
  { name: 'Pathology Labs', to: '/booking' },
  { name: 'Emergency', to: '/booking' },
  { name: 'Home Sample Collection', to: '/booking' },
  { name: 'Blood Test', to: '/booking' },
  { name: 'Medicine Delivery', to: '/pharmacy' },
  { name: 'Health Checkup', to: '/booking' },
  { name: 'Dental', to: '/booking' },
]

function popularSuggestions() {
  const doctors = getDoctorList().slice(0, 2).map((doc) => {
    const creds = pickDoctorCredentials(doc)
    return {
      type: 'doctor',
      label: `Dr. ${doc.name}`,
      meta: [doc.specialty, creds.line].filter(Boolean).join(' · '),
      id: doc.providerUuid || doc.id,
    }
  })
  return [
    { type: 'specialisation', label: 'Dermatologist' },
    { type: 'service', label: 'Pharmacy', to: '/pharmacy' },
    ...doctors,
    { type: 'specialisation', label: 'Cardiologist' },
    { type: 'service', label: 'Book Appointment', to: '/booking' },
    { type: 'specialisation', label: 'Pediatrician' },
    { type: 'service', label: 'Pathology Labs', to: '/booking' },
  ].slice(0, 8)
}

const score = (label, query) => {
  const hay = String(label || '').toLowerCase()
  const q = query.toLowerCase()
  if (!hay) return -1
  if (hay.startsWith(q)) return 0
  if (hay.includes(` ${q}`)) return 1
  if (hay.includes(q)) return 2
  return -1
}

/** Sync suggestions from local featured cache + taxonomy (instant). */
export function getSearchSuggestions(rawQuery, doctorHits = null) {
  const query = rawQuery.trim()
  if (!query) return popularSuggestions()

  const hits = []
  const doctors = Array.isArray(doctorHits) ? doctorHits : getDoctorList()

  doctors.forEach((doc) => {
    const label = `Dr. ${doc.name}`
    const creds = pickDoctorCredentials(doc)
    const s = score(label, query)
    const s2 = score(doc.specialty, query)
    const s3 = score(doc.degree, query)
    const s4 = score(doc.city || doc.district, query)
    const s5 = score(creds.nmcNumber, query)
    const best = [s, s2, s3, s4, s5].filter((n) => n >= 0).sort((a, b) => a - b)[0]
    if (best != null) {
      hits.push({
        type: 'doctor',
        label,
        meta: [doc.specialty, creds.line].filter(Boolean).join(' · '),
        id: doc.providerUuid || doc.id,
        rank: best,
        kind: 0,
      })
    }
  })

  SEARCH_SPECIALISATIONS.forEach((spec) => {
    const s = score(spec.name, query)
    if (s >= 0) {
      hits.push({ type: 'specialisation', label: spec.name, image: spec.image, rank: s, kind: 1 })
    }
  })

  SEARCH_SERVICES.forEach((service) => {
    const s = score(service.name, query)
    if (s >= 0) {
      hits.push({ type: 'service', label: service.name, to: service.to, rank: s, kind: 2 })
    }
  })

  articles.forEach((article) => {
    const s = score(article.title, query)
    const s2 = score(article.category, query)
    const best = s < 0 ? s2 : s2 < 0 ? s : Math.min(s, s2)
    if (best >= 0) {
      hits.push({ type: 'article', label: article.title, id: article.id, rank: best, kind: 3 })
    }
  })

  hits.sort((a, b) => a.rank - b.rank || a.kind - b.kind || a.label.localeCompare(b.label))

  const seen = new Set()
  return hits.filter((item) => {
    const key = `${item.type}:${item.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}

export function highlightMatch(text, rawQuery) {
  const query = rawQuery.trim()
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  return {
    before: text.slice(0, i),
    match: text.slice(i, i + query.length),
    after: text.slice(i + query.length),
  }
}
