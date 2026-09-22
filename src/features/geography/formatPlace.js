/**
 * Shared place / location labels for Nepal and provider cards.
 * Never repeats the same place name (e.g. Kathmandu, Kathmandu → Kathmandu).
 */

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function tokenKey(value) {
  return normalizeToken(value).toLowerCase()
}

/**
 * Join place parts without repeating identical names (case-insensitive).
 * Also collapses already-joined strings that contain duplicates.
 *
 * @example
 * formatPlaceParts('Kathmandu', 'Kathmandu') // 'Kathmandu'
 * formatPlaceParts('Pokhara', 'Kaski') // 'Pokhara, Kaski'
 * formatPlaceParts('Thamel', 'Kathmandu', 'Kathmandu') // 'Thamel, Kathmandu'
 * formatPlaceParts('Kathmandu, Kathmandu') // 'Kathmandu'
 */
export function formatPlaceParts(...parts) {
  const out = []
  const seen = new Set()

  for (const part of parts) {
    if (part == null) continue
    const chunks = String(part)
      .split(',')
      .map(normalizeToken)
      .filter(Boolean)

    for (const chunk of chunks) {
      const key = tokenKey(chunk)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(chunk)
    }
  }

  return out.join(', ')
}

/** City + district label — same when equal, "Pokhara, Kaski" when different. */
export function formatCityDistrict(city, district) {
  return formatPlaceParts(city, district)
}

/**
 * Full provider / facility address from structured registry fields.
 * Prefers street/line → place → city → district (deduped).
 */
export function formatProviderAddress({
  addressLine1,
  line1,
  place,
  city,
  district,
  country,
} = {}) {
  const countryLabel = normalizeToken(country)
  const includeCountry = countryLabel
    && !/^(np|npl)$/i.test(countryLabel)
    && tokenKey(countryLabel) !== 'nepal'

  return formatPlaceParts(
    addressLine1 ?? line1,
    place,
    city,
    district,
    includeCountry ? countryLabel : null,
  )
}
