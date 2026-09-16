import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_SECTIONS, LIST_SECTIONS, useUser } from '../user'
import {
  HealthSection,
  ProfileEditSheet,
  RecordEditorSheet,
  RecordViewSheet,
} from './profile/ProfileHealth'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './PatientProfile.css'

function dash(value) {
  if (value == null || String(value).trim() === '') return '—'
  return value
}

export default function PatientProfile() {
  const navigate = useNavigate()
  const { profile, isDemo, logout } = useUser()
  const [sheet, setSheet] = useState(null)
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 180 })

  if (!profile) return null

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="user-profile-page">
      <div className="user-profile-header-bar">
        <button className="user-profile-back-btn" onClick={() => navigate('/')} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="user-profile-header-title">My Profile</h1>
        <div className="user-profile-header-spacer" />
      </div>

      <div className="user-profile-content" ref={containerRef}>
        <RevealItem className="user-profile-summary-card" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
          <div className="user-profile-summary-avatar">
            <div className="user-profile-avatar-sm">{profile.initials}</div>
            {isDemo ? <span className="user-profile-pro-badge-sm">PRO</span> : null}
          </div>
          <div className="user-profile-summary-info">
            <h2 className="user-profile-summary-name">{profile.name}</h2>
            <p className="user-profile-summary-email">{profile.email}</p>
            <button type="button" className="user-profile-edit-btn" onClick={() => setSheet({ mode: 'profile' })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </RevealItem>

        <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
          <div className="health-section-head">
            <h3 className="user-profile-section-title">Personal Information</h3>
            <button type="button" className="health-add-btn" onClick={() => setSheet({ mode: 'profile' })}>Edit</button>
          </div>
          <div className="user-profile-info-card">
            <div className="user-profile-info-row">
              <span className="user-profile-info-label">Date of Birth</span>
              <span className="user-profile-info-value">{dash(profile.dob)}</span>
            </div>
            <div className="user-profile-info-row">
              <span className="user-profile-info-label">Age</span>
              <span className="user-profile-info-value">{profile.age != null ? `${profile.age} years` : '—'}</span>
            </div>
            <div className="user-profile-info-row">
              <span className="user-profile-info-label">Gender</span>
              <span className="user-profile-info-value">{dash(profile.gender)}</span>
            </div>
            <div className="user-profile-info-row">
              <span className="user-profile-info-label">Blood Group</span>
              <span className="user-profile-info-value">{dash(profile.bloodGroup)}</span>
            </div>
            <div className="user-profile-info-row">
              <span className="user-profile-info-label">Height</span>
              <span className="user-profile-info-value">{dash(profile.height)}</span>
            </div>
            <div className="user-profile-info-row">
              <span className="user-profile-info-label">Weight</span>
              <span className="user-profile-info-value">{dash(profile.weight)}</span>
            </div>
          </div>
        </RevealItem>

        <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
          <h3 className="user-profile-section-title">Contact Information</h3>
          <div className="user-profile-info-card">
            <div className="user-profile-info-row">
              <svg className="user-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="user-profile-info-value">{dash(profile.phone)}</span>
            </div>
            <div className="user-profile-info-row">
              <svg className="user-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2 .9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span className="user-profile-info-value">{dash(profile.email)}</span>
            </div>
            <div className="user-profile-info-row">
              <svg className="user-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="user-profile-info-value">{dash(profile.address)}</span>
            </div>
          </div>
        </RevealItem>

        {HEALTH_SECTIONS.map((section, index) => (
          <RevealItem key={section.kind} revealed={isRevealed(index + 3)} cached={isCached} ref={setItemRef(index + 3)}>
            <HealthSection
              kind={section.kind}
              onAdd={(kind) => setSheet({ mode: 'form', kind, item: null })}
              onOpen={(kind, item) => setSheet({ mode: 'view', kind, item })}
            />
          </RevealItem>
        ))}

        {LIST_SECTIONS.map((section, index) => (
          <RevealItem key={section.kind} revealed={isRevealed(index + 11)} cached={isCached} ref={setItemRef(index + 11)}>
            <HealthSection
              kind={section.kind}
              onAdd={(kind) => setSheet({ mode: 'form', kind, item: null })}
              onOpen={(kind, item) => setSheet({ mode: 'view', kind, item })}
            />
          </RevealItem>
        ))}

        <RevealItem className="user-profile-section" revealed={isRevealed(14)} cached={isCached} ref={setItemRef(14)}>
          <h3 className="user-profile-section-title">Account</h3>
          <div className="user-profile-info-card">
            <button type="button" className="user-profile-logout" onClick={signOut}>
              Log out
            </button>
          </div>
        </RevealItem>

        <div className="user-profile-footer">- You've reached the end -</div>
      </div>

      {sheet?.mode === 'profile' ? <ProfileEditSheet onClose={() => setSheet(null)} /> : null}
      {sheet?.mode === 'form' ? (
        <RecordEditorSheet kind={sheet.kind} item={sheet.item} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.mode === 'view' ? (
        <RecordViewSheet
          kind={sheet.kind}
          item={sheet.item}
          onClose={() => setSheet(null)}
          onEdit={(kind, item) => setSheet({ mode: 'form', kind, item })}
        />
      ) : null}
    </div>
  )
}
