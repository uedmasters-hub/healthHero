import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProfileCompletion, useUser } from '../../user'
import { flowState } from '../../lib/careFlow'
import ProfileCompletionRing from './ProfileCompletionRing'
import './ProfileAvatar.css'

const ENTRANCE_MS = 420

/**
 * Shared profile control — Home + every page header.
 * On each screen open, scales in while the completion ring fills 0 → actual %.
 */
export default function ProfileAvatar({ className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, isDemo } = useUser()
  const { percent } = useProfileCompletion()
  const [ringPercent, setRingPercent] = useState(0)
  const [entering, setEntering] = useState(true)
  const prevPathRef = useRef(null)

  useEffect(() => {
    const pathChanged = prevPathRef.current !== location.pathname
    prevPathRef.current = location.pathname

    if (!pathChanged) {
      setRingPercent(percent)
      return undefined
    }

    let cancelled = false
    let raf1 = 0
    let raf2 = 0
    let timer = 0

    setRingPercent(0)
    setEntering(true)

    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      setRingPercent(percent)
      setEntering(false)
      return undefined
    }

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (!cancelled) setRingPercent(percent)
      })
    })

    timer = window.setTimeout(() => {
      if (!cancelled) setEntering(false)
    }, ENTRANCE_MS)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      window.clearTimeout(timer)
    }
  }, [location.pathname, percent])

  return (
    <button
      type="button"
      className={[
        'profile-avatar',
        entering ? 'is-entering' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={() => navigate('/profile', {
        state: flowState(location, {
          origin: 'header',
          returnTo: location.pathname || '/',
        }),
      })}
      aria-label="Open profile"
    >
      <ProfileCompletionRing percent={ringPercent} className="profile-avatar__ring">
        {profile?.avatar ? (
          <img src={profile.avatar} alt="" className="profile-avatar-img" />
        ) : (
          <span className="profile-avatar-placeholder">{profile?.initials || 'U'}</span>
        )}
      </ProfileCompletionRing>
      {isDemo ? <span className="profile-avatar-pro">PRO</span> : null}
    </button>
  )
}
