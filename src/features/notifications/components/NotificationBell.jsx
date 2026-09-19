import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../../components/NotificationContext'
import { formatUnreadCount } from '../format'
import './NotificationBell.css'

export default function NotificationBell({ className = '', onClick }) {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const label = unreadCount > 0
    ? `Notifications (${unreadCount} unread)`
    : 'Notifications'
  const badge = formatUnreadCount(unreadCount)

  return (
    <div className={['notification-bell', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="notification-btn"
        aria-label={label}
        onClick={onClick || (() => navigate('/notifications'))}
      >
        <svg className="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
      {badge ? (
        <span key={unreadCount} className="notification-badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
    </div>
  )
}
