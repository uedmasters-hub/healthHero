import { canonicalSpecialty, exploreSpecialtyPath } from '../data/specialisations'

export const VIDEO_CALL = 'Video Consultation'
export const IN_PERSON = 'In-Person'

const CONSULTATION_SPECIALTIES = {
  'General Physician': 'General Physician',
  Cardiology: 'Cardiologist',
  Neurology: 'Neurologist',
  Pediatrics: 'Pediatrician',
  Gynecology: 'Gynecologist',
  Orthopedics: 'Orthopedist',
  'Eye Care': 'Ophthalmologist',
  ENT: 'ENT Specialist',
  Dental: 'Dentist',
  Dermatology: 'Dermatologist',
  Dermatologist: 'Dermatologist',
  Pulmonology: 'Pulmonologist',
  'Diabetes Care': 'Endocrinologist',
}

export function resolveVisitType(preferred, visitTypes) {
  if (preferred && (!visitTypes?.length || visitTypes.includes(preferred))) return preferred
  if (visitTypes?.length) return visitTypes[0]
  return IN_PERSON
}

export function resolveServiceAction(name) {
  if (name === 'Book Appointment') {
    return { kind: 'discover' }
  }
  if (name === 'Video Consultation' || name === 'Virtual Visit') {
    return { kind: 'discover', visitType: VIDEO_CALL }
  }
  const specialty = CONSULTATION_SPECIALTIES[name]
  if (specialty) {
    return { kind: 'specialty', specialty: canonicalSpecialty(specialty) }
  }
  return { kind: 'comingSoon', name }
}

export function runServiceAction(name, { navigate, onCloseOverlays, onComingSoon, onPreview }) {
  const action = resolveServiceAction(name)
  if (action.kind === 'comingSoon') {
    (onPreview || onComingSoon)?.(action.name)
    return
  }

  onCloseOverlays?.()

  if (action.kind === 'discover') {
    navigate('/booking', {
      state: {
        origin: 'services',
        returnTo: '/',
        entryReturnTo: '/',
        ...(action.visitType ? { preferredVisitType: action.visitType } : {}),
      },
    })
    return
  }

  navigate(exploreSpecialtyPath(action.specialty), {
    state: { origin: 'services' },
  })
}
