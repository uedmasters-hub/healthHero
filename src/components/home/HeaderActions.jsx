import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNotifications } from '../NotificationContext'
import useNotificationPresence from '../../features/notifications/hooks/useNotificationPresence'
import {
  getIslandSnapshot,
  subscribeBellLand,
  subscribeIslandStore,
} from '../../features/notifications/island'
import NotificationButton from '../../features/notifications/components/NotificationButton'
import ProfileAvatar from './ProfileAvatar'
import { isHomePath } from '../../lib/careFlow'
import './HeaderActions.css'

/**
 * Avatar is absolutely pinned to the right edge of a fixed 44×44 slot.
 * Capsule + bell animate around it — avatar never participates in layout flow.
 * Optional searchSlot sits outside the capsule (left of shell / avatar).
 */
export default function HeaderActions({ searchSlot = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { unreadCount } = useNotifications()
  const islandSnap = useSyncExternalStore(subscribeIslandStore, getIslandSnapshot, getIslandSnapshot)
  const pendingIsland = islandSnap.pendingCount
  // Badge lags until the island absorbs into the bell.
  const badgeCount = Math.max(0, unreadCount - pendingIsland)
  const onHome = isHomePath(location.pathname)
  const {
    phase,
    showShell,
    showBell,
    showBadge,
    displayCount,
    avatarMode,
  } = useNotificationPresence(badgeCount, {
    settleHide: onHome,
    forceBell: islandSnap.dockPreparing,
  })

  const [bellBounce, setBellBounce] = useState(false)

  useEffect(() => {
    let bounceTimer = 0
    const unsub = subscribeBellLand(() => {
      setBellBounce(true)
      window.clearTimeout(bounceTimer)
      bounceTimer = window.setTimeout(() => setBellBounce(false), 520)
    })
    return () => {
      unsub()
      window.clearTimeout(bounceTimer)
    }
  }, [])

  return (
    <div
      className={[
        'header-actions',
        `header-actions--${phase}`,
        `header-actions--avatar-${avatarMode}`,
        showShell ? 'header-actions--has-shell' : '',
      ].filter(Boolean).join(' ')}
      data-phase={phase}
    >
      {searchSlot}

      {/* Always-on fly target — layout matches bell slot even when bell is hidden */}
      <div
        className="header-actions__bell-target"
        data-hh-bell-target
        aria-hidden="true"
      />

      {showShell ? (
        <div className="header-actions__shell" aria-hidden="true" />
      ) : null}

      {showBell ? (
        <div className={`header-actions__bell${bellBounce ? ' is-island-land' : ''}`}>
          <NotificationButton
            unreadCount={displayCount}
            showBadge={showBadge}
            phase={phase === 'dock-ready' ? 'visible' : phase}
            bounce={bellBounce}
            onClick={() => navigate('/notifications')}
          />
        </div>
      ) : null}

      <ProfileAvatar className="header-actions__avatar" />
    </div>
  )
}
