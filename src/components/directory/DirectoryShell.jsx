import { useRef } from 'react'
import PageSearchHeader from '../PageSearchHeader'
import ResultsHeader, { formatShowingCount } from './ResultsHeader'
import './DirectoryShell.css'

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

/**
 * Shared directory page shell — Pharmacy-matching chrome across Doctors,
 * Centers, Clinics, Pharmacies, and future entity directories.
 *
 * Search is docked open by default and collapses on scroll.
 * Stays page-local — never opens global /search.
 */
export default function DirectoryShell({
  title,
  onBack,
  showBack = true,
  showSearch = true,
  searchScope = 'doctors',
  searchPlaceholder = 'Search',
  searchQuery = '',
  onSearchChange,
  shown = 0,
  total = 0,
  countSuffix = '',
  loading = false,
  onSort,
  sortActive = false,
  scrollRef: externalScrollRef,
  className = '',
  headerExtra = null,
  headerTrailing = null,
  radiusMode = false,
  bare = false,
  children,
  footer = null,
}) {
  const internalScrollRef = useRef(null)
  const scrollRef = externalScrollRef || internalScrollRef
  const searchBarRef = useRef(null)

  const quietHeader = bare || radiusMode
  const leading = showBack ? (
    <div className="tab-page-header__leading">
      <button type="button" className="dir-shell__icon-btn ds-icon-btn is-ink" data-push-back onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>
    </div>
  ) : null

  return (
    <div className={`dir-shell${radiusMode ? ' is-radius' : ''} ${className}`.trim()}>
      <PageSearchHeader
        title={title}
        leading={leading}
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope={searchScope}
        placeholder={searchPlaceholder}
        query={searchQuery}
        onQueryChange={onSearchChange}
        showSearch={showSearch && !quietHeader}
        showAvatar={!quietHeader}
        className={quietHeader ? 'is-radius-chrome' : ''}
        dockClassName="dir-shell__search-dock"
        trailing={headerTrailing}
      />

      {headerExtra}

      {quietHeader ? null : (
        <ResultsHeader
          shown={shown}
          total={total}
          suffix={countSuffix}
          loading={loading}
          onSort={onSort}
          sortActive={sortActive}
        />
      )}

      <div className="dir-shell__scroll" ref={scrollRef}>
        {children}
      </div>

      {radiusMode ? (
        <footer className="dir-shell__radius-foot">
          {loading ? null : (
            <p className="dir-results__count">{formatShowingCount(shown, total, countSuffix)}</p>
          )}
        </footer>
      ) : footer}
    </div>
  )
}
