import { useRef } from 'react'
import PageSearchHeader from '../PageSearchHeader'
import ResultsHeader from './ResultsHeader'
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
  loading = false,
  onSort,
  sortActive = false,
  scrollRef: externalScrollRef,
  className = '',
  headerExtra = null,
  children,
  footer = null,
}) {
  const internalScrollRef = useRef(null)
  const scrollRef = externalScrollRef || internalScrollRef
  const searchBarRef = useRef(null)

  const leading = showBack ? (
    <div className="tab-page-header__leading">
      <button type="button" className="dir-shell__icon-btn" data-push-back onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>
    </div>
  ) : null

  return (
    <div className={`dir-shell ${className}`.trim()}>
      <PageSearchHeader
        title={title}
        leading={leading}
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope={searchScope}
        placeholder={searchPlaceholder}
        query={searchQuery}
        onQueryChange={onSearchChange}
        showSearch={showSearch}
        dockClassName="dir-shell__search-dock"
      />

      {headerExtra}

      <ResultsHeader
        shown={shown}
        total={total}
        loading={loading}
        onSort={onSort}
        sortActive={sortActive}
      />

      <div className="dir-shell__scroll" ref={scrollRef}>
        {children}
      </div>

      {footer}
    </div>
  )
}
