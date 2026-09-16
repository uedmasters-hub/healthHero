import { useRef, useEffect, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

const DURATION_MS = 420
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const TAB_PATHS = ['/', '/treat', '/pharmacy', '/centers', '/settings']

const tabs = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'treat', label: 'Treat', path: '/treat' },
  { key: 'pharmacy', label: 'Pharmacy', path: '/pharmacy' },
  { key: 'centers', label: 'Centers', path: '/centers' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const icons = {
  home: (filled) => filled ? (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.2 3.4a1.3 1.3 0 0 1 1.6 0l8 6.4c.4.32.5.9.18 1.3-.32.4-.9.5-1.3.18L19 10.7V19.2c0 1-.8 1.8-1.8 1.8h-3.4v-6.2h-3.6v6.2H6.8c-1 0-1.8-.8-1.8-1.8v-8.5l-.68.54c-.4.32-1 .22-1.3-.18a.95.95 0 0 1 .18-1.3l8-6.4z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6.2H10V21H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  ),
  treat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
  pharmacy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3.8h6v3.2H9z" />
      <path d="M8 7h8v11.4a2.2 2.2 0 0 1-2.2 2.2h-3.6A2.2 2.2 0 0 1 8 18.4V7z" />
      <path d="M8 10.2h8" />
    </svg>
  ),
  centers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V8.2L12 4l7 4.2V21" />
      <path d="M9.2 21v-6h5.6v6" />
      <path d="M10 11h.01M14 11h.01M10 14h.01M14 14h.01" strokeWidth="2" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

// Survives Strict Mode remounts so the pill can slide from the last tab.
const pillPos = { x: 0, w: 0, ready: false }

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const measureRef = useRef(null)
  const pillRef = useRef(null)
  const tabRefs = useRef([])
  const prevLefts = useRef([])

  const isSearchPage = location.pathname === '/search'
  const visible = TAB_PATHS.includes(location.pathname)
  const activeIdx = Math.max(0, tabs.findIndex(t => t.path === (isSearchPage ? '/' : location.pathname)))
  const active = tabs[activeIdx]

  const applyTabWidths = (pillW) => {
    tabRefs.current.forEach((el, i) => {
      if (!el) return
      if (i === activeIdx) {
        el.style.flex = `0 0 ${pillW}px`
        el.style.width = `${pillW}px`
      } else {
        el.style.flex = '1 1 0'
        el.style.width = 'auto'
      }
    })
  }

  useLayoutEffect(() => {
    if (!visible) return

    const measure = measureRef.current
    const tab = tabRefs.current[activeIdx]
    const pillEl = pillRef.current
    if (!measure || !tab || !pillEl) return

    const pillW = Math.max(88, Math.ceil(measure.getBoundingClientRect().width))
    applyTabWidths(pillW)

    const toX = tab.offsetLeft
    const nextLefts = tabRefs.current.map((el) => el?.offsetLeft ?? 0)
    const fromX = pillPos.ready ? pillPos.x : toX
    const fromW = pillPos.ready ? pillPos.w : pillW
    const shouldSlide = Math.abs(fromX - toX) > 0.5 || Math.abs(fromW - pillW) > 0.5

    if (shouldSlide) {
      pillEl.getAnimations().forEach((a) => a.cancel())
      pillEl.style.transition = 'none'
      pillEl.style.width = `${pillW}px`
      pillEl.style.transform = `translate3d(${toX}px, 0, 0)`
      pillEl.animate(
        [
          { transform: `translate3d(${fromX}px, 0, 0)`, width: `${fromW}px` },
          { transform: `translate3d(${toX}px, 0, 0)`, width: `${pillW}px` },
        ],
        { duration: DURATION_MS, easing: EASING }
      )
    } else if (pillEl.getAnimations().length === 0) {
      pillEl.style.transition = 'none'
      pillEl.style.width = `${pillW}px`
      pillEl.style.transform = `translate3d(${toX}px, 0, 0)`
    }

    if (pillPos.ready) {
      tabRefs.current.forEach((el, i) => {
        if (!el) return
        const prev = prevLefts.current[i]
        const next = nextLefts[i]
        if (prev == null || prev === next) return
        el.animate(
          [{ transform: `translateX(${prev - next}px)` }, { transform: 'translateX(0)' }],
          { duration: DURATION_MS, easing: EASING }
        )
      })
    }

    prevLefts.current = nextLefts
    pillPos.x = toX
    pillPos.w = pillW
    pillPos.ready = true
  }, [activeIdx, visible])

  useEffect(() => {
    if (!visible) return
    const onResize = () => {
      const measure = measureRef.current
      const tab = tabRefs.current[activeIdx]
      const pillEl = pillRef.current
      if (!measure || !tab || !pillEl) return
      const pillW = Math.max(88, Math.ceil(measure.getBoundingClientRect().width))
      applyTabWidths(pillW)
      pillEl.style.transition = 'none'
      pillEl.style.width = `${pillW}px`
      pillEl.style.transform = `translate3d(${tab.offsetLeft}px, 0, 0)`
      pillPos.x = tab.offsetLeft
      pillPos.w = pillW
      prevLefts.current = tabRefs.current.map((el) => el?.offsetLeft ?? 0)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeIdx, visible])

  if (!visible && !isSearchPage) return null

  return (
    <nav className={`bottom-nav ${isSearchPage ? 'is-search-away' : ''}`}>
      <div className="bottom-nav-inner">
        <div className="bottom-nav-bar">
          <div
            ref={measureRef}
            className="bottom-nav-pill-measure"
            aria-hidden="true"
          >
            <span className="bottom-nav-pill-icon">{icons[active.key](true)}</span>
            <span className="bottom-nav-pill-label">{active.label}</span>
          </div>

          <div ref={pillRef} className="bottom-nav-pill" aria-hidden="true">
            <span className="bottom-nav-pill-face" key={active.key}>
              <span className="bottom-nav-pill-icon">{icons[active.key](true)}</span>
              <span className="bottom-nav-pill-label">{active.label}</span>
            </span>
          </div>

          {tabs.map((tab, idx) => {
            const isActive = activeIdx === idx
            return (
              <button
                key={tab.key}
                ref={(el) => { tabRefs.current[idx] = el }}
                className={`bottom-nav-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  if (tab.path === location.pathname) return
                  flushSync(() => {
                    navigate(tab.path)
                  })
                }}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`bottom-nav-tab-icon ${isActive ? 'is-hidden' : ''}`}>
                  {icons[tab.key](false)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
