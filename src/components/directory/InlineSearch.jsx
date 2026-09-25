import SearchBar from '../SearchBar'
import './InlineSearch.css'

/**
 * Page-level inline search for directories — never navigates to global /search.
 * 52px field + optional dismiss control.
 */
export default function InlineSearch({
  scope = 'doctors',
  placeholder = 'Search',
  query = '',
  onQueryChange,
  onDismiss,
  autoFocus = true,
  className = '',
}) {
  return (
    <div className={`dir-inline-search ${className}`.trim()}>
      <div className="dir-inline-search__field">
        <SearchBar
          mode="inline"
          scope={scope}
          placeholder={placeholder}
          query={query}
          onQueryChange={onQueryChange}
          autoFocus={autoFocus}
          showDismiss={false}
        />
      </div>
      {typeof onDismiss === 'function' ? (
        <button
          type="button"
          className="dir-inline-search__dismiss"
          onClick={onDismiss}
          aria-label="Close search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
