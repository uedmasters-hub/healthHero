/**
 * Map UI specialty names → live registry match clauses.
 * NMC imports rarely have provider_specializations rows; most signal is in `degree`.
 */

const ALIASES = {
  'end specialist': 'ENT Specialist',
  'ent specialist': 'ENT Specialist',
  ent: 'ENT Specialist',
  dental: 'Dentist',
  dentist: 'Dentist',
  'eye care': 'Ophthalmologist',
  cardiology: 'Cardiologist',
  neurology: 'Neurologist',
  pediatrics: 'Pediatrician',
  gynaecology: 'Gynecologist',
  gynecology: 'Gynecologist',
  orthopedics: 'Orthopedist',
  orthopaedics: 'Orthopedist',
  dermatology: 'Dermatologist',
  pulmonology: 'Pulmonologist',
  'diabetes care': 'Endocrinologist',
  'general physician': 'General Physician',
}

const SPECIALTY_TERMS = {
  Neurologist: {
    specialties: ['Neurologist'],
    degrees: ['neuro', 'neurosurg'],
  },
  Cardiologist: {
    specialties: ['Cardiologist'],
    degrees: ['cardio'],
  },
  Orthopedist: {
    specialties: ['Orthopedist', 'Orthopaedic', 'Orthopedic'],
    degrees: ['ortho'],
  },
  Pulmonologist: {
    specialties: ['Pulmonologist'],
    degrees: ['pulmo', 'respiratory', 'chest'],
  },
  Dermatologist: {
    specialties: ['Dermatologist'],
    degrees: ['derma', 'skin'],
  },
  Dentist: {
    specialties: ['Dentist'],
    degrees: ['bds', 'dental', 'dentistry', 'oral'],
  },
  'ENT Specialist': {
    specialties: ['ENT Specialist', 'ENT'],
    degrees: ['ent', 'otolaryng', 'oto-rhino'],
  },
  Endocrinologist: {
    specialties: ['Endocrinologist'],
    degrees: ['endocrin', 'diabet'],
  },
  Gastroenterologist: {
    specialties: ['Gastroenterologist'],
    degrees: ['gastro', 'hepat'],
  },
  'General Physician': {
    specialties: ['General Physician', 'General Practice', 'Family Medicine'],
    degrees: [],
  },
  Gynecologist: {
    specialties: ['Gynecologist', 'Gynaecologist'],
    degrees: ['gyne', 'gyna', 'obstetric', 'obgyn'],
  },
  Immunologist: {
    specialties: ['Immunologist'],
    degrees: ['immun'],
  },
  Nutritionist: {
    specialties: ['Nutritionist', 'Dietitian'],
    degrees: ['nutrition', 'diet'],
  },
  Ophthalmologist: {
    specialties: ['Ophthalmologist'],
    degrees: ['ophthal', 'eye'],
  },
  Pediatrician: {
    specialties: ['Pediatrician', 'Paediatrician'],
    degrees: ['pedia', 'paedia', 'child'],
  },
  Physiotherapist: {
    specialties: ['Physiotherapist'],
    degrees: ['physio'],
  },
  Psychiatrist: {
    specialties: ['Psychiatrist'],
    degrees: ['psychiatr', 'mental'],
  },
  Sexologist: {
    specialties: ['Sexologist'],
    degrees: ['sexol', 'androlog'],
  },
  Urologist: {
    specialties: ['Urologist'],
    degrees: ['urolog'],
  },
}

function resolveSpecialtyName(specialty) {
  const key = String(specialty || '').trim()
  if (!key || key === 'All') return null
  const alias = ALIASES[key.toLowerCase()]
  if (alias) return alias
  const exact = Object.keys(SPECIALTY_TERMS).find((name) => name.toLowerCase() === key.toLowerCase())
  return exact || key
}

/** Infer a display specialty from an NMC degree string. */
export function inferSpecialtyFromDegree(degree = '') {
  const text = String(degree || '').toLowerCase()
  if (!text) return null
  for (const [name, cfg] of Object.entries(SPECIALTY_TERMS)) {
    if (cfg.degrees.some((term) => text.includes(term))) return name
  }
  if (/\bmbbs\b/.test(text) || /\bmd\b/.test(text)) return 'General Physician'
  if (/\bbds\b/.test(text)) return 'Dentist'
  return null
}

/**
 * PostgREST `.or(...)` clause for specialty matching on v_provider_search.
 * Returns null when no specialty filter should apply.
 */
export function specialtyOrClause(specialty) {
  const name = resolveSpecialtyName(specialty)
  if (!name) return null
  const cfg = SPECIALTY_TERMS[name] || { specialties: [name], degrees: [name] }
  const parts = []
  for (const s of cfg.specialties) {
    parts.push(`primary_specialty.ilike.%${escapeIlike(s)}%`)
  }
  for (const d of cfg.degrees) {
    parts.push(`degree.ilike.%${escapeIlike(d)}%`)
  }
  return parts.length ? parts.join(',') : null
}

function escapeIlike(value) {
  return String(value).replace(/[%(),]/g, '')
}
