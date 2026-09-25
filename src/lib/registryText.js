/**
 * Shared registry text cleaning for HF facilities + DDA pharmacies.
 * Used by facilityModel, pharmacyModel, and migrate mappers.
 */

/** Leading registry noise tokens (whole-word only). */
const REGISTRY_PREFIX_RE = /^(?:UHPC|UHC|21|20|2)\b[\s.,\-–—:]*/i

/** Parenthetical / trailing pharmacy-unit stubs. */
const PHARMACY_UNIT_RE = /\(\s*pharmacy\s+units?\b[^)]*\)/gi
const PHARMACY_UNIT_INLINE_RE =
  /\bpharmacy\s+units?\b(?:\s*(?:two|branch|-\s*\d+|\d+))*/gi

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Collapse whitespace, underscores, and odd separators.
 */
export function collapseRegistryWhitespace(raw) {
  return String(raw || '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Strip registry prefixes: 2, 20, 21, UHC, UHPC (word-boundary).
 */
export function stripRegistryPrefixes(raw) {
  let s = String(raw || '').trim()
  // Repeat once in case of stacked tokens ("UHC 2 NAME")
  for (let i = 0; i < 3; i += 1) {
    const next = s.replace(REGISTRY_PREFIX_RE, '').trim()
    if (next === s) break
    s = next
  }
  return s
}

/**
 * Strip Pharmacy Unit stubs (parenthetical + inline).
 */
export function stripPharmacyUnitNoise(raw) {
  let s = String(raw || '')
  s = s.replace(PHARMACY_UNIT_RE, ' ')
  s = s.replace(PHARMACY_UNIT_INLINE_RE, ' ')
  s = s.replace(/\bunit(?:\s+(?:two|branch))?(?:\s*-\s*\d+)?\s*$/gi, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Strip trailing / leading punctuation noise while keeping legal abbreviations.
 */
export function stripRegistryPunctuation(raw) {
  let s = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!s) return ''

  // Duplicate punctuation (..., ,, ··)
  s = s.replace(/([.,;:!?·•])\1+/g, '$1')
  // Space before punctuation
  s = s.replace(/\s+([.,;:!?])/g, '$1')
  // Extra dashes
  s = s.replace(/\s*[-–—]{2,}\s*/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  // Trailing ellipsis / dots / commas / dashes / leftover ?
  s = s.replace(/[.\u2026?]+$/g, '').trim()
  s = s.replace(/[,;:\-_–—/]+$/g, '').trim()
  // Leading punctuation
  s = s.replace(/^[,;:\-_–—./?]+/, '').trim()
  // Trailing commas from registry dumps ("BAIBAHA BELDADI,")
  s = s.replace(/,+$/g, '').trim()

  return s
}

/**
 * Drop a trailing district / place token when the registry glued it onto the name
 * (e.g. "EYE CENTER TAPLEJUNG" with district Taplejung).
 */
export function stripTrailingPlace(raw, place) {
  const s = String(raw || '').trim()
  const p = String(place || '').trim()
  if (!s || !p || p.length < 3) return s
  const re = new RegExp(`(?:\\s*[,_\\-–—]?\\s*|\\s+)${escapeRegExp(p)}\\s*$`, 'i')
  return s.replace(re, '').trim() || s
}

/**
 * Title-case Latin registry labels. Preserves Pvt. Ltd. / Co. / LLC.
 */
export function titleCaseRegistryName(raw) {
  let out = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!out) return ''

  out = out
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, 'and')

  out = out
    .replace(/\bP\.?\s*Ltd\b\.?/gi, 'Pvt. Ltd.')
    .replace(/\bPvt\b\.?/gi, 'Pvt.')
    .replace(/\bLtd\b\.?/gi, 'Ltd.')
    .replace(/\bLlc\b\.?/gi, 'LLC')
    .replace(/\bCo\b\.?/gi, 'Co.')
    .replace(/\bInc\b\.?/gi, 'Inc.')
    .replace(/\bPvt\.\s*Ltd\./g, 'Pvt. Ltd.')
    .replace(/\s+/g, ' ')
    .trim()

  // Strip trailing dots unless legal abbreviation.
  if (!/\b(Ltd|Pvt|Co|LLC|Inc)\.$/i.test(out)) {
    out = out.replace(/\.+$/g, '').trim()
  }

  return out
}

/**
 * Shared display-name cleaner for facilities + pharmacies.
 * Preserves Hospital, Clinic, Medical Centre, Pvt. Ltd., Pharmaceuticals.
 */
export function cleanRegistryDisplayName(raw, {
  district = null,
  place = null,
  stripPharmacyUnit = false,
} = {}) {
  let s = collapseRegistryWhitespace(raw)
  if (!s) return ''

  if (stripPharmacyUnit) s = stripPharmacyUnitNoise(s)
  s = stripRegistryPrefixes(s)
  s = stripTrailingPlace(s, district)
  s = stripTrailingPlace(s, place)
  s = stripRegistryPunctuation(s)
  s = collapseRegistryWhitespace(s)

  return s
}
