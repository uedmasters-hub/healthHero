import { useNavigate } from 'react-router-dom'
import { useUser } from '../user'
import { HOME_VISIBLE_STATUSES, useBookingStore } from '../booking'
import { CARE_SUPPORT, NavGroup, NavRow, ProfileIcons, ProfilePage } from './profile/ProfileChrome'
import RevealItem from './RevealItem'
import './PatientProfile.css'

export default function PatientProfile() {
  const navigate = useNavigate()
  const { profile, isDemo, logout, health } = useUser()
  const { bookings } = useBookingStore()

  if (!profile) return null

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const reports = health?.reports?.length || 0
  const prescriptions = health?.prescriptions?.length || 0
  const appointments = (bookings || []).filter((item) => HOME_VISIBLE_STATUSES.includes(item.status)).length

  return (
    <ProfilePage
      title="My Profile"
      onBack={() => navigate('/')}
      dataset="profile-hub"
      action={(
        <button type="button" className="profile-header-edit" onClick={() => navigate('/profile/personal')}>
          Edit
        </button>
      )}
    >
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="profile-hub-hero" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            {isDemo ? <span className="profile-hub-pro">PRO</span> : null}
            <div className="profile-hub-avatar">{profile.initials}</div>
            <h2 className="profile-hub-name">{profile.name}</h2>
            <p className="profile-hub-email">{profile.email}</p>
            <div className="profile-hub-metrics">
              <div>
                <strong>{appointments}</strong>
                <span>Appointments</span>
              </div>
              <div>
                <strong>{reports} Active</strong>
                <span>Reports</span>
              </div>
              <div>
                <strong>{prescriptions}</strong>
                <span>Prescriptions</span>
              </div>
            </div>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <h3 className="user-profile-section-title">Personal</h3>
            <NavGroup>
              <NavRow icon={ProfileIcons.person} label="Personal" onClick={() => navigate('/profile/personal')} />
            </NavGroup>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <h3 className="user-profile-section-title">Health</h3>
            <NavGroup>
              <NavRow icon={ProfileIcons.medical} label="Medical" onClick={() => navigate('/profile/medical')} />
              <NavRow icon={ProfileIcons.records} label="Health Records" onClick={() => navigate('/profile/records')} />
              <NavRow icon={ProfileIcons.insurance} label="Insurance" onClick={() => navigate('/profile/insurance')} />
            </NavGroup>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <h3 className="user-profile-section-title">Support</h3>
            <NavGroup>
              <NavRow icon={ProfileIcons.message} label="Message" onClick={() => navigate('/profile/support')} />
              <NavRow icon={ProfileIcons.call} label="Call Support" href={`tel:${CARE_SUPPORT.phone}`} />
              <NavRow icon={ProfileIcons.account} label="Account" onClick={() => navigate('/profile/account')} />
            </NavGroup>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <div className="user-profile-info-card">
              <button type="button" className="user-profile-logout" onClick={signOut}>Log out</button>
            </div>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
