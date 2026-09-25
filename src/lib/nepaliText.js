/**
 * Nepali / Devanagari text helpers for DDA pharmacy names.
 * Prefer clean English display; suppress Nepali UI for now.
 *
 * Display-name resolution lives in `pharmacyModel.js` (PocketPills parity).
 */

const DEVANAGARI_RE = /[\u0900-\u097F]/
const MOJIBAKE_HINT_RE = /[ÃÂ]|à¤|à¥/

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
