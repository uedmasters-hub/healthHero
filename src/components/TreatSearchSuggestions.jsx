import { useMemo } from 'react'
import { highlightMatch } from '../data/searchCatalog'
import { getTreatSearchSuggestions } from '../lib/treatSearch'
import './SearchSuggestions.css'

const SuggestIcon = () => (
  <svg className="search-suggest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

function HighlightedLabel({ text, query }) {
  const parts = highlightMatch(text, query)
  if (typeof parts === 'string') return parts
  return (
    <>
      {parts.before}
      <b>{parts.match}</b>
      {parts.after}
    </>
  )
}

/**
 * Care-scoped suggestions for Treat search — appointments, treating doctors,
 * prescriptions, labs, documents, and care history only.
 */
export default function TreatSearchSuggestions({
  query = '',
  active = false,
  visits = [],
  health,
  onSelect,
}) {
  const items = useMemo(
    () => getTreatSearchSuggestions(query, { visits, health }),
    [query, visits, health],
  )

  return (
    <div
      className={`search-suggest ${active ? 'is-active' : ''}`}
      aria-hidden={!active}
      {...(active ? {} : { inert: true })}
    >
      {!active ? null : items.length === 0 ? (
        <p className="search-suggest-empty">
          {String(query || '').trim()
            ? `No care matches for “${query.trim()}”`
            : 'No care items to search yet'}
        </p>
      ) : (
        items.map((item) => (
          <button
            type="button"
            key={`${item.type}-${item.id ?? item.label}`}
            className="search-suggest-row"
            onClick={() => onSelect?.(item)}
          >
            <SuggestIcon />
            <span className="search-suggest-text">
              <span className="search-suggest-label">
                <HighlightedLabel text={item.label} query={query} />
              </span>
              {item.meta ? (
                <span className="search-suggest-meta">{item.meta}</span>
              ) : null}
            </span>
          </button>
        ))
      )}
    </div>
  )
}
