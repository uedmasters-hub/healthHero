import { addFamilyMember, currentUser } from '../user/store'
import { membersForBooking } from '../user/models'

export { ageFromDob, isPatientProfileComplete } from '../user/models'

export const PATIENT_GROUPS = [
  { id: 'self', label: 'Self' },
  { id: 'family', label: 'Family Members' },
  { id: 'children', label: 'Children' },
]

export function categoryForRelationship(relationship) {
  if (relationship === 'Self') return 'self'
  if (relationship === 'Child') return 'children'
  return 'family'
}

export function getPatients() {
  return membersForBooking(currentUser())
}

export function getPatientById(id) {
  return getPatients().find((item) => item.id === id) || null
}

export function savePatient(input) {
  return addFamilyMember({
    ...input,
    category: categoryForRelationship(input.relationship || 'Family Member'),
  })
}

export function groupedPatients(list = getPatients()) {
  return PATIENT_GROUPS.map((group) => ({
    ...group,
    patients: list.filter((item) => item.category === group.id),
  })).filter((group) => group.patients.length > 0)
}
