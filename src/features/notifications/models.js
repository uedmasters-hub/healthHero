import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from './constants'

let counter = Date.now()

function nextId() {
  counter += 1
  return `notif_${counter}_${Math.random().toString(36).slice(2, 8)}`
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function createNotification({
  id,
  title = 'Notification',
  body = '',
  type = NOTIFICATION_TYPES.BOOKING,
  priority = NOTIFICATION_PRIORITY.NORMAL,
  unread = true,
  to = '',
  actionLabel = '',
  timestamp,
  remoteId = null,
  readAt = null,
} = {}) {
  const ts = timestamp || new Date().toISOString()
  return {
    id: id || nextId(),
    title,
    body,
    type,
    priority,
    unread,
    to,
    actionLabel,
    time: timeAgo(ts),
    timestamp: ts,
    remoteId: remoteId || null,
    readAt: readAt || null,
  }
}

export function refreshTimeAgo(notification) {
  return { ...notification, time: timeAgo(notification.timestamp) }
}

export function sortByNewest(a, b) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
}

export { NOTIFICATION_TYPES as Types, NOTIFICATION_PRIORITY as Priority }
