/**
 * Nepali / Devanagari text helpers for DDA pharmacy names.
 * Prefer clean English display; suppress Nepali UI for now.
 */

const DEVANAGARI_RE = /[\u0900-\u097F]/
const MOJIBAKE_HINT_RE = /[ÃÂ]|à¤|à¥/
const PREETI_GARBAGE_RE = /[;:][a-zA-Z]|[\]\\]|[àáâãäåæç]/

/** True when the string contains Devanagari code points. */
export function hasDevanagari(value) {
  return DEVANAGARI_RE.test(String(value || ''))
}

/**
 * Repair text that was UTF-8 interpreted as Latin-1 (classic mojibake).
 * Leaves already-correct Devanagari and ASCII alone.
 */
export function repairUtf8Mojibake(value) {
  const text = String(value || '')
  if (!text || hasDevanagari(text) || !MOJIBAKE_HINT_RE.test(text)) return text
  try {
    const bytes = Uint8Array.from(Array.from(text, (ch) => ch.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (hasDevanagari(decoded) && decoded.includes('\uFFFD') === false) return decoded.trim()
  } catch {
    /* keep original */
  }
  return text
}

/**
 * Split bilingual pharmacy labels: "ENGLISH NAME (नेपाली नाम)".
 */
export function splitBilingualPharmacyName(raw) {
  const original = repairUtf8Mojibake(String(raw || '').trim())
  const match = original.match(/^(.*?)\s*\(([^)]*[\u0900-\u097F][^)]*)\)\s*$/u)
  if (match) {
    return {
      name: match[1].trim(),
      nameLocal: match[2].trim(),
    }
  }
  const broken = original.match(/^(.*?)\s+([\u0900-\u097F].*?)\)?\s*$/u)
  if (broken && hasDevanagari(broken[2])) {
    return {
      name: broken[1].replace(/[(\s]+$/g, '').trim(),
      nameLocal: broken[2].replace(/\)+$/g, '').trim(),
    }
  }
  // Non-Devanagari paren junk (Preeti / mojibake) — keep Latin head.
  const latinParen = original.match(/^(.*?)\s*\([^)]*\)\s*$/)
  if (latinParen && /[a-zA-Z]{3,}/.test(latinParen[1])) {
    return { name: latinParen[1].trim(), nameLocal: null }
  }
  return {
    name: original,
    nameLocal: hasDevanagari(original) ? original : null,
  }
}

function titleCasePharmacy(value) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^(pvt|ltd|llc|co|and|&)$/i.test(word)) {
        return word.toLowerCase() === 'and' ? 'and' : word.toUpperCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
    .replace(/\bpvt\b/gi, 'Pvt')
    .replace(/\bltd\b/gi, 'Ltd')
}

function looksLikeEnglishName(value) {
  const text = String(value || '').trim()
  if (!text || hasDevanagari(text) || PREETI_GARBAGE_RE.test(text)) return false
  const letters = (text.match(/[a-zA-Z]/g) || []).length
  return letters >= 3
}

function cleanEnglishFallback(raw) {
  const text = repairUtf8Mojibake(String(raw || '').trim())
  const split = splitBilingualPharmacyName(text)
  let candidate = split.name || text
  candidate = candidate
    .replace(DEVANAGARI_RE, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (looksLikeEnglishName(candidate)) return titleCasePharmacy(candidate)
  return 'Pharmacy'
}

/**
 * Normalize display fields — English only for UI; Nepali suppressed for now.
 */
export function normalizePharmacyNames({ name, nameLocal } = {}) {
  const primary = repairUtf8Mojibake(name)
  const split = splitBilingualPharmacyName(primary)
  let english = split.name || ''

  if (!looksLikeEnglishName(english)) {
    english = cleanEnglishFallback(primary || nameLocal)
  } else {
    english = titleCasePharmacy(
      english
        .replace(DEVANAGARI_RE, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
  }

  return {
    name: english || 'Pharmacy',
    nameLocal: null,
  }
}

/** Title-case DDA Pranali / system_type into a clean pharmacy type label. */
export function formatPharmacyType(systemType) {
  const raw = String(systemType || '').trim()
  if (!raw) return 'Pharmacy'
  const key = raw.toUpperCase()
  if (key.includes('VETERINARY')) return 'Veterinary'
  if (key.includes('AYURVED')) return 'Ayurvedic'
  if (key.includes('HOMEOPATH')) return 'Homeopathy'
  if (key.includes('UNANI')) return 'Unani'
  if (key.includes('ALLOPATH') || key.includes('HUMAN')) return 'Allopathy'
  return raw
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export const PHARMACY_TYPE_FILTERS = Object.freeze([
  { id: 'all', label: 'All types', match: null },
  { id: 'allopathy', label: 'Allopathy', match: 'ALLOPATHY - HUMAN' },
  { id: 'ayurvedic', label: 'Ayurvedic', match: 'AYURVEDIC' },
  { id: 'veterinary', label: 'Veterinary', match: 'ALLOPATHY - VETERINARY' },
  { id: 'homeopathy', label: 'Homeopathy', match: 'HOMEOPATHY' },
  { id: 'unani', label: 'Unani', match: 'UNANI' },
])
