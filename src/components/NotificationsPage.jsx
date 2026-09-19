import { useNavigate } from 'react-router-dom'
import { useNotifications } from './NotificationContext'
import { useBooking } from './BookingContext'
import { resolveAppointmentPath } from '../lib/appointmentJourney'
import { isPreviewPath } from '../lib/previewModules'
import { useDemoPreview } from './DemoPreviewModal'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './NotificationsPage.css'

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
  const { currentBooking } = useBooking()
  const { notifications, unreadCount, markRead, markAllRead, clearNotification } = useNotifications()
  const { show: showDemoPreview } = useDemoPreview()
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 220 })

  const openItem = (item) => {
    markRead(item.id)
    if (!item.to) return
    if (item.type === 'pharmacy' || isPreviewPath(item.to)) {
      showDemoPreview()
      return
    }
    if (item.type === 'appointment' || item.type === 'booking') {
      navigate(currentBooking ? resolveAppointmentPath(currentBooking) : item.to)
      return
    }
    navigate(item.to)
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="notifications-back" type="button" onClick={() => navigate('/')} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="notifications-title">Notifications</h1>
        {unreadCount > 0 ? (
          <button className="notifications-mark-all" type="button" onClick={markAllRead}>
            Mark all read
          </button>
        ) : (
          <span className="notifications-header-spacer" />
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="notifications-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="notifications-list" ref={containerRef}>
          {notifications.map((item, i) => (
            <RevealItem
              as="div"
              key={item.id}
              className={`notification-card ${item.unread ? 'unread' : ''}`}
              revealed={isRevealed(i)}
              cached={isCached}
              ref={setItemRef(i)}
            >
              <button
                type="button"
                className="notification-card-inner"
                onClick={() => openItem(item)}
              >
                <div className={`notification-card-icon ${item.type}`}>
                  {typeIcon[item.type] || typeIcon.booking}
                </div>
                <div className="notification-card-body">
                  <div className="notification-card-top">
                    <h2>{item.title}</h2>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.body}</p>
                </div>
                {item.unread && <span className="notification-unread-dot" />}
              </button>
              <button
                type="button"
                className="notification-card-dismiss"
                onClick={(e) => { e.stopPropagation(); clearNotification(item.id) }}
                aria-label="Dismiss notification"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </RevealItem>
          ))}
        </div>
      )}
    </div>
  )
}
