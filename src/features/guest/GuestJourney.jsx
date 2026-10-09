import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AUTH_CONFIRM_PATH, AUTH_PATHS } from '../auth/types'
import { useAuth } from '../auth/hooks/useAuth'
import { signInAnonymously } from '../auth/services/authService'
import { addToCart } from '../pharmacy/shopApi'
import { adoptGuestSavedInsights } from '../../user/store'
import {
  clearGuestCartSnapshot,
  flushGuestEvents,
  migrateGuestActivity,
  readGuestCartSnapshot,
  recordGuestEvent,
  setGuestCapture,
} from './activity'
import { describeGuestRoute } from './routes'
import { clearGuestResume, peekGuestResume } from './resume'

let anonymousAttempted = false

/**
 * Keeps a Supabase anonymous session for guests, records route activity,
 * and migrates that activity once a patient identity exists.
 */
export default function GuestJourney() {
  const { ready, user, isAnonymous, isAuthenticated, isRecovery, sessionExpired } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!ready || isRecovery || sessionExpired || user) return undefined
    const path = location.pathname
    if (path === AUTH_CONFIRM_PATH || path === AUTH_PATHS.callback) return undefined
    if (anonymousAttempted) return undefined
    anonymousAttempted = true
    signInAnonymously().finally(() => {
      anonymousAttempted = false
    })
    return undefined
  }, [ready, user, isRecovery, sessionExpired, location.pathname])

  useEffect(() => {
    setGuestCapture(Boolean(ready && !isAuthenticated && !isRecovery))
  }, [ready, isAuthenticated, isRecovery])

  useEffect(() => {
    if (!ready || isAuthenticated || isRecovery) return undefined
    const described = describeGuestRoute(location.pathname)
    if (!described) return undefined
    recordGuestEvent({
      eventType: 'view',
      entityType: 'route',
      entityId: location.pathname,
      metadata: { search: location.search || '', label: described.label },
      dedupeKey: `${location.pathname}|${location.key || ''}`,
    })
    return undefined
  }, [ready, isAuthenticated, isRecovery, location.pathname, location.search, location.key])

  useEffect(() => {
    if (!ready || !isAuthenticated) return undefined
    let cancelled = false
    ;(async () => {
      await migrateGuestActivity()
      if (cancelled) return
      adoptGuestSavedInsights()
      const snap = readGuestCartSnapshot()
      if (!snap?.lines?.length || snap.anonymousUserId === user?.id) {
        clearGuestCartSnapshot()
        return
      }
      clearGuestCartSnapshot()
      for (const line of snap.lines) {
        try {
          await addToCart(line.drugId, line.quantity)
        } catch {
          /* cart replay is best-effort; the event row still holds the selection */
        }
      }
      const resume = peekGuestResume()
      if (resume?.path && location.pathname === resume.path) clearGuestResume()
    })()
    return () => { cancelled = true }
  }, [ready, isAuthenticated, user?.id, location.pathname])

  useEffect(() => {
    if (ready && isAnonymous) flushGuestEvents()
  }, [ready, isAnonymous])

  return null
}
