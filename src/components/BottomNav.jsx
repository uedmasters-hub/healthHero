import { flushSync } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

const TAB_PATHS = ['/', '/treat', '/pharmacy', '/centers', '/settings']

const tabs = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'treat', label: 'Treat', path: '/treat' },
  { key: 'pharmacy', label: 'Pharmacy', path: '/pharmacy' },
  { key: 'centers', label: 'Centers', path: '/centers' },
  { key: 'settings', label: 'Settings', path: '/settings' },
]

const icons = {
  home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6.2H10V21H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  ),
  treat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
  pharmacy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3.8h6v3.2H9z" />
      <path d="M8 7h8v11.4a2.2 2.2 0 0 1-2.2 2.2h-3.6A2.2 2.2 0 0 1 8 18.4V7z" />
      <path d="M8 10.2h8" />
    </svg>
  ),
  centers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V8.2L12 4l7 4.2V21" />
      <path d="M9.2 21v-6h5.6v6" />
      <path d="M10 11h.01M14 11h.01M10 14h.01M14 14h.01" strokeWidth="1.7" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

/**
 * Mobile tab bar — PocketPills pattern: equal columns, icon in a 32px tile,
 * label always visible. Active = brand ink + medium weight + tinted tile
 * (no filled pill), 200ms colour-only transitions.
 */
export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isSearchPage = location.pathname === '/search'
  const visible = TAB_PATHS.includes(location.pathname)
  const activeIdx = Math.max(0, tabs.findIndex(t => t.path === (isSearchPage ? '/' : location.pathname)))

  if (!visible && !isSearchPage) return null

  return (
    <nav className={`bottom-nav ${isSearchPage ? 'is-search-away' : ''}`} aria-label="Main">
      <div className="bottom-nav-bar">
        {tabs.map((tab, idx) => {
          const isActive = activeIdx === idx
          return (
            <button
              key={tab.key}
              type="button"
              className={`bottom-nav-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                if (tab.path === location.pathname) return
                flushSync(() => {
                  navigate(tab.path)
                })
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="bottom-nav-tab-icon" aria-hidden="true">
                {icons[tab.key]()}
              </span>
              <span className="bottom-nav-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
