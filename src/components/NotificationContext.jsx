import { createContext, useContext, useMemo } from 'react'
import { useUser } from '../user'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { notifications, markRead, markAllRead } = useUser()

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  )

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead }),
    [notifications, unreadCount, markRead, markAllRead],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
