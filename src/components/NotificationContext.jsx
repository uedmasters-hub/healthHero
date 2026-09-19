import { createContext, useContext } from 'react'
import useNotificationService from '../features/notifications/useNotifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const value = useNotificationService()

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
