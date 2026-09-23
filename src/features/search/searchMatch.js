/**
 * Flexible search matching for typed and voice queries (PocketPills searchMatch).
 */

export function normalizeSearchQuery(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function compactSearchText(text) {
  return normalizeSearchQuery(text).replace(/\s+/g, '')
}

function tokenMatchesHay(token, hayTokens, compactHay) {
  if (!token) return true
  if (compactHay.includes(token)) return true
  return hayTokens.some((h) => {
    if (h === token) return true
    if (h.startsWith(token)) return true
    if (token.length >= 3 && h.includes(token)) return true
    return false
  })
}

export function textMatchesQuery(haystack, query) {
  const needle = normalizeSearchQuery(query)
  if (!needle) return true
  const hay = normalizeSearchQuery(haystack)
  if (!hay) return false
  if (hay.includes(needle)) return true

  const compactHay = hay.replace(/\s+/g, '')
  const compactNeedle = needle.replace(/\s+/g, '')
  if (compactHay.includes(compactNeedle)) return true

  const hayTokens = hay.split(' ').filter(Boolean)
  const needleTokens = needle.split(' ').filter(Boolean)
  return needleTokens.every((token) => tokenMatchesHay(token, hayTokens, compactHay))
}

export function fieldsMatchQuery(fields, query) {
  return textMatchesQuery(
    (fields || []).filter((f) => f != null && f !== '').join(' '),
    query,
  )
}

export const SEARCH_TIER_ORDER = { exact: 0, combination: 1, also: 2 }

function betterTier(a, b) {
  if (!a) return b
  return SEARCH_TIER_ORDER[b] < SEARCH_TIER_ORDER[a] ? b : a
}

export function rankSearchMatch(haystack, query) {
  const needle = normalizeSearchQuery(query)
  if (!needle) return null
  if (!textMatchesQuery(haystack, query)) return null

  const hay = normalizeSearchQuery(haystack)
  const hayTokens = hay.split(' ').filter(Boolean)
  const needleTokens = needle.split(' ').filter(Boolean)
  const compactNeedle = needle.replace(/\s+/g, '')
  const compactHay = hay.replace(/\s+/g, '')

  let best = null

  if (hay === needle || compactHay === compactNeedle) best = betterTier(best, 'exact')
  if (needleTokens.every((nt) => hayTokens.some((ht) => ht === nt))) best = betterTier(best, 'exact')

  let acc = ''
  for (const token of hayTokens) {
    acc += token
    if (acc === compactNeedle) {
      best = betterTier(best, 'exact')
      break
    }
    if (acc.startsWith(compactNeedle) && acc.length > compactNeedle.length) {
      best = betterTier(best, 'combination')
      break
    }
    if (!compactNeedle.startsWith(acc)) break
  }

  for (const ht of hayTokens) {
    if (ht === compactNeedle || needleTokens.some((nt) => ht === nt)) {
      best = betterTier(best, 'exact')
      continue
    }
    if (ht.startsWith(compactNeedle) || needleTokens.some((nt) => nt.length >= 2 && ht.startsWith(nt) && ht !== nt)) {
      best = betterTier(best, 'combination')
      continue
    }
    if (
      (compactNeedle.length >= 3 && ht.includes(compactNeedle) && !ht.startsWith(compactNeedle))
      || needleTokens.some((nt) => nt.length >= 3 && ht.includes(nt) && !ht.startsWith(nt))
    ) {
      best = betterTier(best, 'also')
    }
  }

  if (compactHay.includes(compactNeedle) && !best) best = 'also'
  return best
}

export function rankFieldsMatch(fields, query) {
  const list = (fields || []).filter((f) => f != null && f !== '')
  if (!list.length) return null
  const primary = rankSearchMatch(list[0], query)
  if (primary) return primary
  let best = null
  for (const field of list.slice(1)) {
    const tier = rankSearchMatch(field, query)
    if (tier) best = best ? betterTier(best, tier) : tier
  }
  return best
}

export function compareSearchTier(a, b) {
  const oa = a ? SEARCH_TIER_ORDER[a] : 99
  const ob = b ? SEARCH_TIER_ORDER[b] : 99
  return oa - ob
}

export function sortBySearchRank(items, query, haystack, prefer) {
  const needle = normalizeSearchQuery(query)
  if (!needle && !prefer) return items
  return [...items].sort((a, b) => {
    if (prefer) {
      const pa = prefer(a) ? 0 : 1
      const pb = prefer(b) ? 0 : 1
      if (pa !== pb) return pa - pb
    }
    if (!needle) return 0
    const ha = haystack(a)
    const hb = haystack(b)
    const ra = Array.isArray(ha) ? rankFieldsMatch(ha, query) : rankSearchMatch(ha, query)
    const rb = Array.isArray(hb) ? rankFieldsMatch(hb, query) : rankSearchMatch(hb, query)
    const order = compareSearchTier(ra, rb)
    if (order !== 0) return order
    const na = Array.isArray(ha) ? String(ha[0] || '') : ha
    const nb = Array.isArray(hb) ? String(hb[0] || '') : hb
    return na.localeCompare(nb, undefined, { sensitivity: 'base' })
  })
}

export function highlightMatch(text, query) {
  const source = String(text || '')
  const needle = String(query || '').trim()
  if (!needle || !source) return source
  const lower = source.toLowerCase()
  const idx = lower.indexOf(needle.toLowerCase())
  if (idx < 0) return source
  return {
    before: source.slice(0, idx),
    match: source.slice(idx, idx + needle.length),
    after: source.slice(idx + needle.length),
  }
}
