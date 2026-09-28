import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from './NotificationContext'
import { useBooking } from './BookingContext'
import { resolveSmartRelay } from '../booking/smartRelay'
import { isPreviewPath } from '../lib/previewModules'
import { useDemoPreview } from './DemoPreviewModal'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { useOriginBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshNotificationsData } from '../features/sync/pageRefresh'
import { AppBar, Button, EmptyState, Icon, cx } from './ui'
import './NotificationsPage.css'

/* Icon-well tone per notification type (same tones as the rest of the app) */
const NOTIFICATION_TONE = {
  results: 'is-success',
  booking: 'is-success',
  health_tip: 'is-success',
  prescription: 'is-info',
  insurance: 'is-info',
  emergency: 'is-warning',
  profile: 'is-muted',
}

const typeIcon = {
  appointment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  results: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </svg>
  ),
  booking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  prescription: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3.8h6v3.2H9z" />
      <path d="M8 7h8v11.4a2.2 2.2 0 0 1-2.2 2.2h-3.6A2.2 2.2 0 0 1 8 18.4V7z" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  ),
  vaccination: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21h10" />
      <path d="M12 21V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M8 17l4 4 4-4" />
    </svg>
  ),
  insurance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  health_tip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-3 7H8c-1-2-3-4-3-7a7 7 0 0 1 7-7z" />
      <path d="M9 21h6" />
    </svg>
  ),
  telehealth: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="15" height="12" rx="2" />
      <path d="M17 10l5-3v10l-5-3" />
    </svg>
  ),
  emergency: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const goBack = useOriginBack('/')
  const { bookings } = useBooking()
  const { notifications, unreadCount, markRead, markAllRead, clearNotification } = useNotifications()
  const { show: showDemoPreview } = useDemoPreview()
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    dataset: 'notifications',
  })
  const pageRef = useRef(null)
  const onRefresh = useCallback(() => refreshNotificationsData(), [])
  const ptr = usePullToRefresh(pageRef, onRefresh)

  const openItem = (item) => {
    markRead(item.id)
    if (!item.to) return
    if (item.type === 'pharmacy' || item.to === '/pharmacy') {
      navigate('/pharmacy')
      return
    }
    if (isPreviewPath(item.to)) {
      showDemoPreview()
      return
    }
    if (item.type === 'appointment' || item.type === 'booking') {
      const linked = item.bookingId
        ? bookings.find((row) => row.id === item.bookingId || row.clientId === item.bookingId)
        : null
      const relay = linked ? resolveSmartRelay(linked) : null
      if (relay?.bookingId) {
        navigate(relay.path || item.to || '/', { state: { bookingId: relay.bookingId } })
        return
      }
      if (item.to) navigate(item.to)
      return
    }
    navigate(item.to)
  }

  return (
    <div className="ds-page notifications-page" ref={pageRef}>
      <AppBar
        title="Notifications"
        onBack={goBack}
        actions={unreadCount > 0 ? (
          <Button variant="text" size="sm" onClick={markAllRead}>Mark all read</Button>
        ) : null}
      />
      <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />

      {notifications.length === 0 ? (
        <EmptyState
          className="notifications-empty"
          icon={<Icon.Bell />}
          title="No notifications yet"
          message="Visit updates, results and reminders will appear here."
        />
      ) : (
        <div className="notifications-list" ref={containerRef}>
          {notifications.map((item, i) => {
            const linked = item.bookingId
              ? bookings.find((row) => row.id === item.bookingId || row.clientId === item.bookingId)
              : null
            const relay = linked ? resolveSmartRelay(linked) : null
            return (
            <RevealItem
              as="div"
              key={item.id}
              className={cx('notification-card', item.unread && 'is-unread')}
              revealed={isRevealed(i)}
              cached={isCached}
              ref={setItemRef(i)}
            >
              <button
                type="button"
                className={cx('ds-card', 'is-interactive', 'notification-card-inner', item.unread && 'is-selected')}
                onClick={() => openItem(item)}
              >
                <div className={cx('ds-icon-well', 'is-tile', 'notification-card-icon', NOTIFICATION_TONE[item.type])} aria-hidden="true">
                  {typeIcon[item.type] || typeIcon.booking}
                </div>
                <div className="notification-card-body">
                  <div className="notification-card-top">
                    <h2>{item.title}</h2>
                    <span>{item.time}</span>
                  </div>
                  <p>{relay?.message || item.body}</p>
                  {relay ? <span className={`ds-badge relay-chip is-${relay.accent}`}>{relay.label}</span> : null}
                </div>
                {item.unread && <span className="notification-unread-dot" aria-label="Unread" />}
              </button>
              <button
                type="button"
                className="ds-icon-btn is-sm-size notification-card-dismiss"
                onClick={(e) => { e.stopPropagation(); clearNotification(item.id) }}
                aria-label="Dismiss notification"
              >
                <Icon.Close />
              </button>
            </RevealItem>
            )
          })}
        </div>
      )}
    </div>
  )
}
