import { useEffect, useRef, useState } from 'react'
import { runContextualSearch } from './engine'
import { loadScopeQuery, saveScopeQuery } from './recentSearches'

/**
 * Persistent, debounced contextual suggestions for a search scope.
 */
export function useContextualSearch(scope, {
  initialQuery,
  treatContext = null,
  debounceMs = 220,
  enabled = true,
} = {}) {
  const [query, setQueryState] = useState(() => (
    initialQuery != null ? initialQuery : loadScopeQuery(scope)
  ))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  const setQuery = (value) => {
    const next = typeof value === 'string' ? value : String(value?.target?.value ?? '')
    setQueryState(next)
    saveScopeQuery(scope, next)
  }

  useEffect(() => {
    if (!enabled) return undefined
    const id = ++requestId.current
    const trimmed = String(query || '').trim()
    setLoading(Boolean(trimmed))
    const timer = window.setTimeout(() => {
      runContextualSearch({
        scope,
        query,
        treatContext,
      }).then((hits) => {
        if (requestId.current !== id) return
        setItems(hits)
        setLoading(false)
      }).catch(() => {
        if (requestId.current !== id) return
        setItems([])
        setLoading(false)
      })
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [scope, query, enabled, debounceMs, treatContext])

  return {
    query,
    setQuery,
    items,
    loading,
  }
}
