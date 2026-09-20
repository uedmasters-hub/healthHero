import { formatUnreadCount, badgeSizeTone } from '../format'
import './NotificationButton.css'

/**
 * 36×36 gray well. Badge anchored on the hit control.
 * Phase classes drive enter/exit springs from HeaderActions.
 */
export default function NotificationButton({
  unreadCount = 0,
  showBadge = false,
  phase = 'visible',
  bounce = false,
  onClick,
  className = '',
}) {
  const label = unreadCount > 0
    ? `Notifications (${unreadCount} unread)`
    : 'Notifications'
  const badgeText = formatUnreadCount(unreadCount)
  const sizeTone = badgeSizeTone(unreadCount)
  const badgeExiting = phase === 'exit-bell'

  return (
    <div
      className={[
        'notif-btn',
        `notif-btn--${phase}`,
        bounce ? 'notif-btn--island-bounce' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="notif-btn__hit"
        aria-label={label}
        onClick={onClick}
      >
        <svg
          className="notif-btn__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {showBadge && badgeText ? (
          <span
            key={badgeExiting ? 'exit' : unreadCount}
            className={[
              'notif-btn__badge',
              sizeTone,
              badgeExiting ? 'notif-btn__badge--out' : 'notif-btn__badge--in',
            ].join(' ')}
            aria-hidden="true"
          >
            {badgeText}
          </span>
        ) : null}
      </button>
    </div>
  )
}
