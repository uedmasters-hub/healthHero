import { useNavigate } from 'react-router-dom'
import { useUser } from '../user'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './PlaceholderPage.css'
import './SettingsPage.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, isDemo, logout } = useUser()
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 200 })

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="placeholder-page settings-page">
      <div className="placeholder-header">
        <h1 className="placeholder-title">Settings</h1>
        <p className="placeholder-subtitle">Your account and preferences</p>
      </div>
      <div className="settings-body">
        <RevealItem className="settings-account" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
          <button type="button" className="settings-profile" onClick={() => navigate('/profile')}>
            <span className="settings-avatar" aria-hidden="true">{profile?.initials || 'U'}</span>
            <span className="settings-profile-copy">
              <span className="settings-profile-name">{profile?.name}</span>
              <span className="settings-profile-meta">{profile?.email}</span>
              <span className="settings-profile-meta">{profile?.phone}</span>
            </span>
            {isDemo ? <span className="settings-pro">PRO</span> : null}
          </button>
        </RevealItem>

        <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
          <div className="settings-card">
            <button type="button" className="settings-row" onClick={() => navigate('/profile')}>
              <span>Personal details</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
            <button type="button" className="settings-row" onClick={() => navigate('/notifications')}>
              <span>Notifications</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>
        </RevealItem>

        <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
          <button type="button" className="settings-signout" onClick={signOut}>
            Sign out
          </button>
        </RevealItem>
      </div>
    </div>
  )
}
