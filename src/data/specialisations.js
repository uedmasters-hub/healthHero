export const ALL_SPECIALISATIONS = [
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
  { name: 'Sexologist', image: '/img/specilisations/Sexologist.png' },
  { name: 'Urologist', image: '/img/specilisations/Urologist.png' },
]

const ALIASES = {
  'end specialist': 'ENT Specialist',
  'ent specialist': 'ENT Specialist',
  'ent': 'ENT Specialist',
  'dental': 'Dentist',
  'dentist': 'Dentist',
  'eye care': 'Ophthalmologist',
  'cardiology': 'Cardiologist',
  'neurology': 'Neurologist',
  'pediatrics': 'Pediatrician',
  'gynaecology': 'Gynecologist',
  'gynecology': 'Gynecologist',
  'orthopedics': 'Orthopedist',
  'orthopaedics': 'Orthopedist',
  'dermatology': 'Dermatologist',
  'pulmonology': 'Pulmonologist',
  'diabetes care': 'Endocrinologist',
  'general physician': 'General Physician',
}

export function canonicalSpecialty(name = '') {
  const key = String(name).trim()
  return ALIASES[key.toLowerCase()] || ALL_SPECIALISATIONS.find((s) => s.name.toLowerCase() === key.toLowerCase())?.name || key
}

export function exploreSpecialtyPath(name) {
  return `/explore/${encodeURIComponent(canonicalSpecialty(name))}`
}

const listMemory = {}
let specialisationsScroll = 0

export function saveSpecialisationsScroll(y) {
  specialisationsScroll = y
}

export function loadSpecialisationsScroll() {
  return specialisationsScroll
}

export function saveExploreListState(specialty, state) {
  listMemory[canonicalSpecialty(specialty)] = { ...state }
}

export function loadExploreListState(specialty) {
  return listMemory[canonicalSpecialty(specialty)] || null
}
