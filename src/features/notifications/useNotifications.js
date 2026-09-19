import { useSyncExternalStore, useCallback, useEffect } from 'react'
import * as service from './service'

let snapshot = { notifications: [], unreadCount: 0 }

function onStoreChange(fn) {
  return service.subscribe((state) => {
    snapshot = state
    fn()
  })
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return { notifications: [], unreadCount: 0 }
}

export default function useNotifications() {
  const state = useSyncExternalStore(onStoreChange, getSnapshot, getServerSnapshot)

  useEffect(() => {
    service.init()
  }, [])

  const markRead = useCallback((id) => service.markRead(id), [])
  const markAllRead = useCallback(() => service.markAllRead(), [])
  const clearNotification = useCallback((id) => service.clearNotification(id), [])
  const clearAll = useCallback(() => service.clearAll(), [])

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    markRead,
    markAllRead,
    clearNotification,
    clearAll,
  }
}
