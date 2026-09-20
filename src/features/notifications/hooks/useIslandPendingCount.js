import { useSyncExternalStore } from 'react'
import { getIslandSnapshot, subscribeIslandStore } from '../island'

/** Unread still flying through the island — subtract from badge display. */
export default function useIslandPendingCount() {
  const snap = useSyncExternalStore(subscribeIslandStore, getIslandSnapshot, getIslandSnapshot)
  return snap.pendingCount
}
