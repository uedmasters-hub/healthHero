import { forwardRef } from 'react'
import './SharedSearchIcon.css'

const ICON_PATH = (
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </>
)

/**
 * Compact header search — sits outside the Bell+Avatar capsule.
 * Crossfades with the large search field via scroll `progress` (0→1).
 * Falls back to boolean `visible` when progress is omitted.
 */
export const HeaderSearchButton = forwardRef(function HeaderSearchButton(
  {
    visible = false,
    progress = null,
    interactive = null,
    style = null,
    onClick,
  },
  ref,
) {
  const driven = typeof progress === 'number'
  const shown = driven ? progress > 0.02 : visible
  const canInteract = interactive == null
    ? (driven ? progress >= 0.45 : visible)
    : interactive

  const drivenStyle = driven
    ? {
        opacity: progress,
        transform: `scale3d(${0.55 + 0.45 * progress}, ${0.55 + 0.45 * progress}, 1)`,
        ...style,
      }
    : style

  return (
    <button
      type="button"
      ref={ref}
      className={[
        'header-search-btn',
        driven ? 'is-scroll-driven' : '',
        shown ? 'is-visible' : 'is-hidden',
        canInteract ? 'is-interactive' : '',
      ].filter(Boolean).join(' ')}
      style={drivenStyle}
      aria-label="Search"
      tabIndex={canInteract ? 0 : -1}
      aria-hidden={!canInteract}
      onClick={canInteract ? onClick : undefined}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATH}
      </svg>
    </button>
  )
})

export default HeaderSearchButton
