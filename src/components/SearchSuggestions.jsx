import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { freezeNow } from '../lib/scrollLock'
import { getSearchSuggestions, highlightMatch } from '../data/searchCatalog'
import { searchProviders } from '../features/providers'
import { exploreSpecialtyPath } from '../data/specialisations'
import { runServiceAction } from '../lib/serviceActions'
import { articlePath } from '../data/articles'
import { useDemoPreview } from './DemoPreviewModal'
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

export default function SearchSuggestions({ query, active = false }) {
  const navigate = useNavigate()
  const { show: showDemoPreview } = useDemoPreview()
  const [liveDoctors, setLiveDoctors] = useState(null)
  const trimmed = String(query || '').trim()

  useEffect(() => {
    if (!trimmed) {
      setLiveDoctors(null)
      return undefined
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      searchProviders(trimmed, { limit: 8 }).then((rows) => {
        if (!cancelled) setLiveDoctors(rows)
      }).catch(() => {
        if (!cancelled) setLiveDoctors([])
      })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [trimmed])

  const items = getSearchSuggestions(query, liveDoctors)

  const openItem = (item) => {
    if (item.type === 'doctor') {
      freezeNow('home')
      navigate(`/doctor/${item.id}`, { state: { origin: 'home', returnTo: '/' } })
      return
    }
    if (item.type === 'specialisation') {
      navigate(exploreSpecialtyPath(item.label), {
        state: { origin: 'search', returnTo: '/' },
      })
      return
    }
    if (item.type === 'article') {
      navigate(articlePath(item.id), { state: { origin: 'search', returnTo: '/search' } })
      return
    }
    runServiceAction(item.label, {
      navigate,
      onPreview: showDemoPreview,
    })
  }

  return (
    <div
      className={`search-suggest ${active ? 'is-active' : ''}`}
      aria-hidden={!active}
      {...(active ? {} : { inert: true })}
    >
      {items.length === 0 ? (
        <p className="search-suggest-empty">No matches for “{query.trim()}”</p>
      ) : (
        items.map((item) => (
          <button
            type="button"
            key={`${item.type}-${item.id ?? item.label}`}
            className="search-suggest-row"
            onClick={() => openItem(item)}
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
