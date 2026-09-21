/**
 * Mounts the SyncEngine under Auth. Boots catalog + connectivity always;
 * starts per-user bootstrap when authenticated (not recovery).
 */
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  getSyncState,
  startSyncRuntime,
  startSyncSession,
  stopSyncSession,
  subscribeSync,
  requestFlush,
  enqueueSync,
  syncNow,
} from './syncEngine'

const SyncContext = createContext(null)

function subscribe(callback) {
  return subscribeSync(callback)
}

function getSnapshot() {
  return getSyncState()
}

export function SyncProvider({ children }) {
  const { user, isRecovery, ready } = useAuth()
  const sync = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => startSyncRuntime(), [])

  useEffect(() => {
    if (!ready) return
    if (user?.id && !isRecovery) {
      startSyncSession(user)
      return
    }
    stopSyncSession()
  }, [ready, user?.id, isRecovery])

  const value = useMemo(() => ({
    ...sync,
    flush: requestFlush,
    enqueue: enqueueSync,
    syncNow,
  }), [sync])

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
