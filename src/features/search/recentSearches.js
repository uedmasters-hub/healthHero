const RECENT_KEY = 'em.search.recent'
const QUERY_KEY = 'em.search.query'
const MAX_RECENT = 8

function readJson(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** Recent searches are shared across scopes so preference feels app-wide. */
export function loadRecentSearches() {
  const list = readJson(RECENT_KEY, [])
  return Array.isArray(list) ? list.filter((item) => item && item.label).slice(0, MAX_RECENT) : []
}

export function pushRecentSearch(entry) {
  if (!entry?.label) return loadRecentSearches()
  const next = [
    {
      id: entry.id || entry.label,
      label: String(entry.label).trim(),
      type: entry.type || 'query',
      scope: entry.scope || 'home',
      meta: entry.meta || '',
      at: Date.now(),
    },
    ...loadRecentSearches().filter(
      (item) => item.label.toLowerCase() !== String(entry.label).trim().toLowerCase(),
    ),
  ].slice(0, MAX_RECENT)
  writeJson(RECENT_KEY, next)
  return next
}

export function clearRecentSearches() {
  writeJson(RECENT_KEY, [])
  return []
}

/** Persist active query per scope so Cancel/re-open doesn't wipe context. */
export function loadScopeQuery(scope) {
  const map = readJson(QUERY_KEY, {})
  return typeof map?.[scope] === 'string' ? map[scope] : ''
}

export function saveScopeQuery(scope, query) {
  const map = readJson(QUERY_KEY, {})
  map[scope] = String(query || '')
  writeJson(QUERY_KEY, map)
}
