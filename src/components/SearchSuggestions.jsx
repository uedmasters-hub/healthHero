import { useNavigate } from 'react-router-dom'
import { freezeNow } from '../lib/scrollLock'
import { getSearchSuggestions, highlightMatch } from '../data/searchCatalog'
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
  const items = getSearchSuggestions(query)

  const openItem = (item) => {
    if (item.type === 'doctor') {
      freezeNow('home')
      navigate(`/doctor/${item.id}`, { state: { origin: 'home' } })
      return
    }
    if (item.type === 'specialisation') {
      navigate(exploreSpecialtyPath(item.label))
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
              <HighlightedLabel text={item.label} query={query} />
            </span>
          </button>
        ))
      )}
    </div>
  )
}
