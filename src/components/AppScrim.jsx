import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  acquireAppScrim,
  emitScrimClick,
  getAppScrimSnapshot,
  releaseAppScrim,
  subscribeAppScrim,
} from '../lib/appScrim'
import './AppScrim.css'

/**
 * Keep the global scrim acquired while `active` is true.
 * Safe to call from any overlay; ref-counted under the hood.
 */
export function useAppScrim(active) {
  useEffect(() => {
    if (!active) return undefined
    acquireAppScrim()
    return () => releaseAppScrim()
  }, [active])
}

/**
 * Full-viewport scrim on #phone-screen — covers status bar, safe areas, and app.
 * Render once near the app root (inside PhoneFrame / AppShell).
 */
export default function AppScrimHost() {
  const snap = useSyncExternalStore(subscribeAppScrim, getAppScrimSnapshot, getAppScrimSnapshot)
  const [root, setRoot] = useState(null)

  useEffect(() => {
    setRoot(document.getElementById('phone-screen'))
  }, [])

  if (!root) return null

  return createPortal(
    <div
      className={`app-scrim${snap.active ? ' is-active' : ''}`}
      aria-hidden="true"
      onClick={() => {
        if (snap.active) emitScrimClick()
      }}
    />,
    root,
  )
}
