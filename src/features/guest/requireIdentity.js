import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { rememberReturnTo } from '../auth/returnTo'
import { recordGuestEvent } from './activity'
import { saveGuestResume } from './resume'

/**
 * Exploration stays open. Call this only at a transactional boundary
 * (booking, order, upload, payment, patient profile). Returns true when a
 * patient identity already exists; otherwise stores the page and opens login.
 */
export function useRequirePatient() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(async (reason, metadata = {}) => {
    if (isAuthenticated) return true
    const path = `${location.pathname}${location.search || ''}`
    saveGuestResume(location, reason, metadata)
    rememberReturnTo(path)
    await recordGuestEvent({
      eventType: 'auth_required',
      entityType: reason || 'transaction',
      entityId: path,
      metadata: {
        ...metadata,
        anonymousUserId: user?.id || null,
      },
      dedupeKey: `${reason}|${path}|${location.key || ''}`,
    })
    navigate('/login', { state: { from: path, reason } })
    return false
  }, [isAuthenticated, location, navigate, user?.id])
}
