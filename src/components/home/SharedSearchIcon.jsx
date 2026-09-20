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
 * Scale 0→1 + fade when `visible`; reverse on dismiss. No shared-element flyer.
 */
export const HeaderSearchButton = forwardRef(function HeaderSearchButton(
  { visible = false, onClick },
  ref,
) {
  return (
    <button
      type="button"
      ref={ref}
      className={['header-search-btn', visible ? 'is-visible' : 'is-hidden'].join(' ')}
      aria-label="Search"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATH}
      </svg>
    </button>
  )
})

export default HeaderSearchButton
