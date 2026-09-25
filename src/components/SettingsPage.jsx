import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../user'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshProfileData } from '../features/sync/pageRefresh'
import { flowState } from '../lib/careFlow'
import PageSearchHeader from './PageSearchHeader'
import './PlaceholderPage.css'
import './SettingsPage.css'

const SETTINGS_ROWS = [
  { id: 'personal', label: 'Personal details', path: '/profile/personal' },
  { id: 'account', label: 'Account', path: '/profile/account' },
  { id: 'search-radius', label: 'Search radius', path: '/settings/search-radius' },
  { id: 'notifications', label: 'Notifications', path: '/notifications' },
]

function openFromSettings(navigate, path) {
  navigate(path, {
    state: flowState(null, {
      origin: 'settings',
      returnTo: '/settings',
    }),
  })
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, isDemo, logout } = useUser()
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    dataset: 'settings',
  })
  const scrollRef = useRef(null)
  const searchBarRef = useRef(null)
  const [query, setQuery] = useState('')
  const onRefresh = useCallback(() => refreshProfileData(), [])
  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const needle = query.trim().toLowerCase()

  const showProfile = useMemo(() => {
    if (!needle) return true
    const hay = [profile?.name, profile?.email, profile?.phone, 'profile', 'account']
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  }, [needle, profile?.name, profile?.email, profile?.phone])

  const visibleRows = useMemo(() => {
    if (!needle) return SETTINGS_ROWS
    return SETTINGS_ROWS.filter((row) => row.label.toLowerCase().includes(needle))
  }, [needle])

  const showSignOut = !needle || 'sign out'.includes(needle) || 'logout'.includes(needle)

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="placeholder-page settings-page">
      <PageSearchHeader
        title="Settings"
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope="settings"
        placeholder="Search settings…"
        query={query}
        onQueryChange={setQuery}
        dockClassName="settings-search-dock"
      />

      <div className="settings-body" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />

        {showProfile ? (
          <RevealItem className="settings-account" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <button type="button" className="settings-profile" onClick={() => openFromSettings(navigate, '/profile')}>
              <span className="settings-avatar" aria-hidden="true">{profile?.initials || 'U'}</span>
              <span className="settings-profile-copy">
                <span className="settings-profile-name">{profile?.name}</span>
                <span className="settings-profile-meta">{profile?.email}</span>
                <span className="settings-profile-meta">{profile?.phone}</span>
              </span>
              {isDemo ? <span className="settings-pro">PRO</span> : null}
            </button>
          </RevealItem>
        ) : null}

        {visibleRows.length ? (
          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <div className="settings-card">
              {visibleRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="settings-row"
                  onClick={() => openFromSettings(navigate, row.path)}
                >
                  <span>{row.label}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </button>
              ))}
            </div>
          </RevealItem>
        ) : null}

        {showSignOut ? (
          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <button type="button" className="settings-signout" onClick={signOut}>
              Sign out
            </button>
          </RevealItem>
        ) : null}

        {needle && !showProfile && !visibleRows.length && !showSignOut ? (
          <p className="settings-empty">No matching settings.</p>
        ) : null}
      </div>
    </div>
  )
}
