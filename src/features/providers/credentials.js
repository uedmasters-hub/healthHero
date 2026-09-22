/**
 * Compact doctor credentials for cards and heroes.
 * Prefer "MBBS, #23422" — never prefix with "NMC".
 * Always prefer live registry fields when the provider is indexed.
 */
import { getDoctorById } from './repository'

export function normalizeNmcNumber(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.replace(/^#+\s*/, '').trim()
}

/**
 * Look up the live public.providers row already indexed in-memory.
 */
export function resolveLiveProvider(doctorOrId) {
  if (doctorOrId == null || doctorOrId === '') return null
  if (typeof doctorOrId !== 'object') return getDoctorById(doctorOrId)

  const keys = [
    doctorOrId.providerUuid,
    doctorOrId.id,
    doctorOrId.nmcNumber,
    doctorOrId.nmc_number,
  ].filter((key) => key != null && String(key).trim() !== '')

  for (const key of keys) {
    const found = getDoctorById(key)
    if (found) return found
  }
  return null
}

function readDegree(...sources) {
  for (const source of sources) {
    const value = String(source ?? '').trim()
    if (value) return value
  }
  return ''
}

function readNmc(...sources) {
  for (const source of sources) {
    const value = normalizeNmcNumber(source)
    if (value) return value
  }
  return ''
}

/**
 * @param {{ degree?: string, nmcNumber?: string|number, specialty?: string }} opts
 * @returns {string} e.g. "MBBS, #23422" | "MBBS" | "#23422" | ""
 */
export function formatDoctorCredentials({ degree, nmcNumber, specialty } = {}) {
  let deg = String(degree || '').trim()
  // Avoid repeating the specialty line when degree was used as a specialty fallback.
  if (specialty && deg && deg.toLowerCase() === String(specialty).toLowerCase()) {
    deg = ''
  }
  const nmc = normalizeNmcNumber(nmcNumber)
  if (deg && nmc) return `${deg}, #${nmc}`
  if (deg) return deg
  if (nmc) return `#${nmc}`
  return ''
}

/**
 * Merge prop snapshot with live registry so cards never lose nmc_number.
 * Live public.providers values win for degree + registration number.
 */
export function pickDoctorCredentials(doctor = {}) {
  const live = resolveLiveProvider(doctor)
  const specialty = live?.specialty || doctor?.specialty || ''
  const degree = readDegree(live?.degree, doctor?.degree, doctor?.qualification)
  const nmcNumber = readNmc(live?.nmcNumber, live?.nmc_number, doctor?.nmcNumber, doctor?.nmc_number)
  return {
    live,
    specialty,
    degree,
    nmcNumber: nmcNumber || null,
    line: formatDoctorCredentials({ degree, nmcNumber, specialty }),
  }
}
