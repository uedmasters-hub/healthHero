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
import { Badge, EmptyState, List, ListRow } from './ui'
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
    <div className="settings-page">
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
          <RevealItem revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <List>
              <ListRow
                className="settings-profile"
                onClick={() => openFromSettings(navigate, '/profile')}
                icon={<span className="settings-avatar" aria-hidden="true">{profile?.initials || 'U'}</span>}
                title={profile?.name}
                subtitle={[profile?.email, profile?.phone].filter(Boolean).join(' · ')}
                trailing={isDemo ? <Badge tone="solid" caps>PRO</Badge> : null}
              />
            </List>
          </RevealItem>
        ) : null}

        {visibleRows.length ? (
          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <List>
              {visibleRows.map((row) => (
                <ListRow key={row.id} title={row.label} onClick={() => openFromSettings(navigate, row.path)} />
              ))}
            </List>
          </RevealItem>
        ) : null}

        {showSignOut ? (
          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <List>
              <ListRow className="is-centered" danger chevron={false} title="Sign out" onClick={signOut} />
            </List>
          </RevealItem>
        ) : null}

        {needle && !showProfile && !visibleRows.length && !showSignOut ? (
          <EmptyState compact title="No matching settings" message="Try another word, like account or radius." />
        ) : null}
      </div>
    </div>
  )
}
