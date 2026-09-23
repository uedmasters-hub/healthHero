import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  clearRecentSearches,
  loadRecentSearches,
  loadScopeQuery,
  pushRecentSearch,
  saveScopeQuery,
} from './recentSearches'

const SearchContext = createContext(null)

/**
 * App-wide search state — one pipeline for typed, voice, recent, and suggestions.
 */
export function SearchProvider({ children }) {
  const [queries, setQueries] = useState(() => ({}))
  const [recent, setRecent] = useState(() => loadRecentSearches())

  const getQuery = useCallback((scope) => {
    if (Object.prototype.hasOwnProperty.call(queries, scope)) return queries[scope]
    return loadScopeQuery(scope)
  }, [queries])

  const setQuery = useCallback((scope, value) => {
    const next = String(value ?? '')
    saveScopeQuery(scope, next)
    setQueries((prev) => (prev[scope] === next ? prev : { ...prev, [scope]: next }))
  }, [])

  const remember = useCallback((entry) => {
    setRecent(pushRecentSearch(entry))
  }, [])

  const clearRecent = useCallback(() => {
    setRecent(clearRecentSearches())
  }, [])

  const value = useMemo(() => ({
    getQuery,
    setQuery,
    recent,
    remember,
    clearRecent,
  }), [getQuery, setQuery, recent, remember, clearRecent])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearchStore() {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    return {
      getQuery: (scope) => loadScopeQuery(scope),
      setQuery: (scope, value) => saveScopeQuery(scope, value),
      recent: loadRecentSearches(),
      remember: pushRecentSearch,
      clearRecent: clearRecentSearches,
    }
  }
  return ctx
}

/** Scope-bound query helpers for screens. */
export function useSearchQuery(scope) {
  const { getQuery, setQuery } = useSearchStore()
  const query = getQuery(scope)
  const update = useCallback((value) => setQuery(scope, value), [scope, setQuery])
  return [query, update]
}
