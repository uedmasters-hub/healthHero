import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { freezeNow } from '../lib/scrollLock'
import { useI18n } from '../i18n'
import {
  highlightMatch,
  pushRecentSearch,
  runContextualSearch,
} from '../features/search'
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

export default function SearchSuggestions({
  query = '',
  active = false,
  scope = 'home',
  treatContext = null,
}) {
  const navigate = useNavigate()
  const { tx } = useI18n()
  const { show: showDemoPreview } = useDemoPreview()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      runContextualSearch({
        scope,
        query,
        treatContext,
      }).then((hits) => {
        if (!cancelled) setItems(hits)
      }).catch(() => {
        if (!cancelled) setItems([])
      })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active, scope, query, treatContext])

  const openItem = (item) => {
    pushRecentSearch({
      label: item.label,
      type: item.type,
      id: item.id,
      scope,
      meta: item.meta,
    })

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
    if (item.type === 'pharmacy') {
      navigate(`/pharmacy/${item.id}`, { state: { origin: 'search', returnTo: '/search' } })
      return
    }
    if (item.type === 'center') {
      navigate(`/centers/${item.id}`, { state: { origin: 'search', returnTo: '/search' } })
      return
    }
    if (item.type === 'medicine') {
      navigate('/pharmacy/browse', {
        state: { origin: 'search', returnTo: '/search', q: item.label },
      })
      return
    }
    if (item.type === 'article') {
      navigate(articlePath(item.id), { state: { origin: 'search', returnTo: '/search' } })
      return
    }
    if (item.type === 'service' || item.to) {
      runServiceAction(item.label, {
        navigate,
        onPreview: showDemoPreview,
      })
    }
  }

  const trimmed = String(query || '').trim()

  return (
    <div
      className={`search-suggest ${active ? 'is-active' : ''}`}
      aria-hidden={!active}
      {...(active ? {} : { inert: true })}
    >
      {!trimmed && items.some((item) => item.isRecent) ? (
        <p className="search-suggest-section">{tx('Recent searches')}</p>
      ) : null}
      {items.length === 0 ? (
        trimmed ? (
          <p className="search-suggest-empty">
            {tx('No matches for')} “{trimmed}”
          </p>
        ) : null
      ) : (
        items.map((item) => (
          <button
            type="button"
            key={`${item.isRecent ? 'recent' : item.type}-${item.id ?? item.label}`}
            className="search-suggest-row"
            onClick={() => openItem(item)}
          >
            <SuggestIcon />
            <span className="search-suggest-text">
              <span className="search-suggest-label">
                <HighlightedLabel text={item.label} query={query} />
              </span>
              {item.meta ? (
                <span className="search-suggest-meta">{tx(item.meta) === item.meta ? item.meta : tx(item.meta)}</span>
              ) : null}
            </span>
          </button>
        ))
      )}
    </div>
  )
}
