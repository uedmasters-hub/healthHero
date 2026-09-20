import { useNavigate } from 'react-router-dom'
import { CARE_SUPPORT, ProfilePage } from './ProfileChrome'
import RevealItem from '../RevealItem'

export default function SupportWorkspace() {
  const navigate = useNavigate()

  return (
    <ProfilePage title="Support" dataset="profile-support">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="support-hero" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p>Care team</p>
            <h2>We are here for booking, visits, and health records.</h2>
            <span>Typically replies within a few hours · 8:00 AM – 10:00 PM IST</span>
          </RevealItem>

          <RevealItem className="support-actions" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <button type="button" className="support-action" onClick={() => navigate('/chat')}>
              <strong>Messages</strong>
              <span>Open Conversation Center</span>
            </button>
            <a className="support-action" href={`mailto:${CARE_SUPPORT.email}?subject=eMedicalls%20support`}>
              <strong>Email</strong>
              <span>Write to {CARE_SUPPORT.email}</span>
            </a>
            <a className="support-action is-call" href={`tel:${CARE_SUPPORT.phone}`}>
              <strong>Call support</strong>
              <span>{CARE_SUPPORT.phoneLabel}</span>
            </a>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <h3 className="user-profile-section-title">Help</h3>
            <div className="profile-nav-card">
              <button type="button" className="profile-nav-row" onClick={() => navigate('/notifications')}>
                <span className="profile-nav-label">Visit updates & alerts</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button type="button" className="profile-nav-row" onClick={() => navigate('/profile/records')}>
                <span className="profile-nav-label">Find a report or prescription</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button type="button" className="profile-nav-row" onClick={() => navigate('/profile/account')}>
                <span className="profile-nav-label">Privacy & account</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
