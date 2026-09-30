import './ResultsHeader.css'

function SortIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5v14M5.5 7.5L8 5l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 19V5M13.5 16.5L16 19l2.5-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.2 9.2h3.2M11.2 12h2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function formatShowingCount(shown, total, suffix = '') {
  const shownLabel = Number(shown || 0).toLocaleString('en-NP')
  const totalLabel = Number(total || 0).toLocaleString('en-NP')
  const tail = suffix ? ` ${suffix}` : ''
  return `Showing ${shownLabel} of ${totalLabel}${tail}`
}

export function ResultsSortButton({ onSort, sortActive = false }) {
  if (typeof onSort !== 'function') return null
  return (
    <button
      type="button"
      className={`dir-results__icon-btn ds-icon-btn${sortActive ? ' is-selected' : ''}`}
      onClick={onSort}
      aria-label="Sort"
      aria-pressed={sortActive}
    >
      <SortIcon />
    </button>
  )
}

/**
 * Results row — "Showing X of Y" + optional Sort icon.
 */
export default function ResultsHeader({
  shown = 0,
  total = 0,
  suffix = '',
  loading = false,
  onSort,
  sortActive = false,
  className = '',
}) {
  return (
    <div className={`dir-results ${className}`.trim()} aria-live="polite">
      {loading ? (
        <span className="dir-results__count-skel shimmer" aria-hidden="true" />
      ) : (
        <p className="dir-results__count">{formatShowingCount(shown, total, suffix)}</p>
      )}
      {typeof onSort === 'function' ? (
        <div className="dir-results__actions" role="toolbar" aria-label="Sort">
          <ResultsSortButton onSort={onSort} sortActive={sortActive} />
        </div>
      ) : null}
    </div>
  )
}
