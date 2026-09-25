import './CollapsingSearchDock.css'

/**
 * Reusable large-header search dock — collapses with scroll progress from
 * `useSearchScrollCompact`, releasing space without layout jump.
 */
export default function CollapsingSearchDock({
  progress = 0,
  fieldStyle = null,
  expandedHeight = 72,
  locked = false,
  inert = false,
  className = '',
  children,
}) {
  const collapsed = !locked && progress >= 0.92

  return (
    <div
      className={[
        'large-header-search-dock',
        collapsed ? 'is-collapsed' : '',
        locked ? 'is-locked' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={locked ? undefined : {
        ...fieldStyle,
        // Keep a stable expanded measure for the first paint / reverse expand.
        ['--large-header-search-expanded']: `${expandedHeight}px`,
        ['--large-header-search-progress']: String(progress),
      }}
      aria-hidden={inert && !locked ? true : undefined}
      {...(inert && !locked ? { inert: true } : {})}
    >
      <div className="large-header-search-dock__inner">
        {children}
      </div>
    </div>
  )
}
