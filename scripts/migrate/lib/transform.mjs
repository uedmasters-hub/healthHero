import { createHash } from 'node:crypto'

/** Deterministic UUID from a seed string (idempotent upserts). */
export function stableUuid(seed) {
  const hex = createHash('md5').update(String(seed)).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(16, 19)}-${hex.slice(19, 31)}`
}

export function splitDoctorName(display = '') {
  const cleaned = String(display).replace(/^Dr\.?\s*/i, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: 'Provider', last: '', display: 'Provider' }
  if (parts.length === 1) {
    return { first: parts[0], last: '', display: `Dr. ${parts[0]}` }
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(' '),
    display: `Dr. ${cleaned}`,
  }
}

export function genderAvatar(gender, nmcNumber) {
  const idx = (Number(String(nmcNumber).replace(/\D/g, '')) || 0) % 3 || 1
  const female = String(gender || '').toLowerCase().startsWith('f')
  return female
    ? `/img/doctors/doctor-w${idx}.png`
    : `/img/doctors/doctor-m${idx}.png`
}

/** Strip trailing "(…Devanagari…)" while capturing the Nepali text. */
export function splitPharmacyName(raw) {
  const original = String(raw || '').trim()
  const match = original.match(/^(.*?)\s*\(([^)]*[\u0900-\u097F][^)]*)\)\s*$/u)
  if (match) {
    return {
      name: match[1].trim(),
      nameLocal: match[2].trim(),
    }
  }
  // Broken trailing paren leftovers: "name नेपाली)"
  const broken = original.match(/^(.*?)\s+([\u0900-\u097F].*?)\)?\s*$/u)
  if (broken && /[\u0900-\u097F]/u.test(broken[2])) {
    return {
      name: broken[1].replace(/[(\s]+$/g, '').trim(),
      nameLocal: broken[2].replace(/\)+$/g, '').trim(),
    }
  }
  return { name: original, nameLocal: null }
}

export function cleanFacilityName(name = '') {
  return String(name || '')
    .replace(/_+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function normalizeFacilityLevel(level = '') {
  const raw = String(level || '').trim()
  if (!raw || raw === '--') return null
  return raw.replace(/\?+/g, '').trim() || null
}
