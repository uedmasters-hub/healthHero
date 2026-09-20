import { useLayoutEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { setPresentationMode } from './island'
import { resolvePresentationMode } from './presentation'
import { getQuietOverride, subscribeQuietOverride } from './quietFlow'

/**
 * Global notification presentation controller.
 * Keeps the island store's presentation mode in sync with route + quiet overrides.
 * Mount once next to NotificationIsland.
 */
export default function NotificationPresentationSync() {
  const location = useLocation()
  const quietOverride = useSyncExternalStore(
    subscribeQuietOverride,
    getQuietOverride,
    getQuietOverride,
  )

  useLayoutEffect(() => {
    const mode = resolvePresentationMode(location.pathname, { quietOverride })
    setPresentationMode(mode)
  }, [location.pathname, quietOverride])

  return null
}
