import { useState, useEffect, useRef } from 'react'
import { useTransition } from './PageTransition'
import { useFetchSession } from './FetchSession'
import { formatHeight, formatWeight, useUser } from '../user'
import './ProfileOverlay.css'

function dash(value) {
  if (value == null || String(value).trim() === '') return '—'
  return value
}

const SECTION_COUNT = 5
const STAGGER_DELAY = 80

const CACHE_KEY = 'overlay:profile'

export default function ProfileOverlay() {
  const { isProfileOpen, isProfileSlidingOut, closeProfile } = useTransition()
  const { profile, isDemo } = useUser()
  const session = useFetchSession()
  const skipFetch = session.isLoaded(CACHE_KEY)
  const [showEditModal, setShowEditModal] = useState(false)
  const [revealedSections, setRevealedSections] = useState(() => (
    skipFetch ? new Set(Array.from({ length: SECTION_COUNT }, (_, i) => i)) : new Set()
  ))
  const timersRef = useRef([])

  useEffect(() => {
    if (!isProfileOpen || isProfileSlidingOut) return

    if (session.isLoaded(CACHE_KEY)) {
      setRevealedSections(new Set(Array.from({ length: SECTION_COUNT }, (_, i) => i)))
      return
    }

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setRevealedSections(new Set())

    // Profile overlay sections are above-the-fold — start immediately, micro-stagger only.
    for (let i = 0; i < SECTION_COUNT; i++) {
      const timer = setTimeout(() => {
        setRevealedSections(prev => new Set([...prev, i]))
        if (i === SECTION_COUNT - 1) session.markLoaded(CACHE_KEY)
      }, i * STAGGER_DELAY)
      timersRef.current.push(timer)
    }

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [isProfileOpen, isProfileSlidingOut, session])

  if (!isProfileOpen && !isProfileSlidingOut) return null

  const isRevealed = (idx) => revealedSections.has(idx)

  return (
    <div className={`profile-overlay ${isProfileSlidingOut ? 'slide-out' : 'slide-in'}`}>
      <div className="profile-overlay-header">
        <button className="profile-overlay-back-btn" onClick={closeProfile}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="profile-overlay-title">My Profile</h1>
        <div className="profile-overlay-header-placeholder" />
      </div>

      <div className="profile-overlay-content">
        {/* Profile Summary Card */}
        <div className={`profile-section-block ${isRevealed(0) ? 'revealed' : ''}`}>
          <div className={`skeleton-layer ${isRevealed(0) ? 'hidden' : ''}`}>
            <div className="skel-summary-card">
              <div className="skel-avatar-sm shimmer" />
              <div className="skel-summary-info">
                <div className="skel-text-lg shimmer" />
                <div className="skel-text-md shimmer" />
                <div className="skel-btn-sm shimmer" />
              </div>
            </div>
          </div>
          <div className={`content-layer ${isRevealed(0) ? 'visible' : ''}`}>
            <div className="profile-summary-card">
              <div className="profile-summary-avatar">
                <div className="profile-avatar-sm">
                  {profile?.initials || 'U'}
                </div>
                {isDemo ? <span className="profile-pro-badge-sm">PRO</span> : null}
              </div>
              <div className="profile-summary-info">
                <h2 className="profile-summary-name">{profile?.name}</h2>
                <p className="profile-summary-email">{profile?.email}</p>
                <button className="profile-edit-btn-sm" onClick={() => setShowEditModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className={`profile-section-block ${isRevealed(1) ? 'revealed' : ''}`}>
          <div className={`skeleton-layer ${isRevealed(1) ? 'hidden' : ''}`}>
            <div className="skel-section-title shimmer" />
            <div className="skel-card">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skel-row">
                  <div className="skel-row-label shimmer" />
                  <div className="skel-row-value shimmer" />
                </div>
              ))}
            </div>
          </div>
          <div className={`content-layer ${isRevealed(1) ? 'visible' : ''}`}>
            <h3 className="profile-section-title">Personal Information</h3>
            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="profile-info-label">Date of Birth</span>
                <span className="profile-info-value">{dash(profile?.dob)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Age</span>
                <span className="profile-info-value">{profile?.age != null ? `${profile.age} years` : '—'}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Gender</span>
                <span className="profile-info-value">{dash(profile?.gender)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Blood Group</span>
                <span className="profile-info-value">{dash(profile?.bloodGroup)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Height</span>
                <span className="profile-info-value">{dash(formatHeight(profile?.height))}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Weight</span>
                <span className="profile-info-value">{dash(formatWeight(profile?.weight))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className={`profile-section-block ${isRevealed(2) ? 'revealed' : ''}`}>
          <div className={`skeleton-layer ${isRevealed(2) ? 'hidden' : ''}`}>
            <div className="skel-section-title shimmer" />
            <div className="skel-card">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skel-row">
                  <div className="skel-row-icon shimmer" />
                  <div className="skel-row-value shimmer" />
                </div>
              ))}
            </div>
          </div>
          <div className={`content-layer ${isRevealed(2) ? 'visible' : ''}`}>
            <h3 className="profile-section-title">Contact Information</h3>
            <div className="profile-info-card">
              <div className="profile-info-row">
                <svg className="profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="profile-info-value">{dash(profile?.phone)}</span>
                {profile?.phoneVerified ? <span className="profile-verified-tag">Verified</span> : null}
              </div>
              <div className="profile-info-row">
                <svg className="profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="profile-info-value">{dash(profile?.email)}</span>
                {profile?.emailVerified ? <span className="profile-verified-tag">Verified</span> : null}
              </div>
              <div className="profile-info-row">
                <svg className="profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="profile-info-value">{dash(profile?.address)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className={`profile-section-block ${isRevealed(3) ? 'revealed' : ''}`}>
          <div className={`skeleton-layer ${isRevealed(3) ? 'hidden' : ''}`}>
            <div className="skel-section-title shimmer" />
            <div className="skel-card">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skel-row">
                  <div className="skel-row-label shimmer" />
                  <div className="skel-row-value shimmer" />
                </div>
              ))}
            </div>
          </div>
          <div className={`content-layer ${isRevealed(3) ? 'visible' : ''}`}>
            <h3 className="profile-section-title">Emergency Contact</h3>
            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="profile-info-label">Name</span>
                <span className="profile-info-value">{dash(profile?.emergencyContact?.name)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Relation</span>
                <span className="profile-info-value">{dash(profile?.emergencyContact?.relation)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Phone</span>
                <span className="profile-info-value">{dash(profile?.emergencyContact?.phone)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div className={`profile-section-block ${isRevealed(4) ? 'revealed' : ''}`}>
          <div className={`skeleton-layer ${isRevealed(4) ? 'hidden' : ''}`}>
            <div className="skel-section-title shimmer" />
            <div className="skel-card">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skel-row">
                  <div className="skel-row-label shimmer" />
                  <div className="skel-row-value shimmer" />
                </div>
              ))}
            </div>
          </div>
          <div className={`content-layer ${isRevealed(4) ? 'visible' : ''}`}>
            <h3 className="profile-section-title">Health Insurance</h3>
            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="profile-info-label">Provider</span>
                <span className="profile-info-value">{dash(profile?.insurance?.provider)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Policy No</span>
                <span className="profile-info-value">{dash(profile?.insurance?.policyNo)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Valid Till</span>
                <span className="profile-info-value">{dash(profile?.insurance?.validTill)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-footer">- You've reached the end -</div>
      </div>
    </div>
  )
}
