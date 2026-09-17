import { useNavigate } from 'react-router-dom'
import { useUser } from '../../user'
import { InfoCard, InfoRow, NavGroup, NavRow, ProfileIcons, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'

export default function AccountWorkspace() {
  const navigate = useNavigate()
  const { profile, isDemo, logout } = useUser()

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <ProfilePage title="Account" dataset="profile-account">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="account-member" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p>Membership</p>
            <h2>{isDemo ? 'Health Hero PRO' : 'Health Hero member'}</h2>
            <span>{profile?.email}</span>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Preferences" />
            <NavGroup>
              <NavRow icon={ProfileIcons.message} label="Notifications" onClick={() => navigate('/notifications')} />
            </NavGroup>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Privacy & security" />
            <InfoCard>
              <InfoRow label="Sign-in" value={profile?.phone || profile?.email} />
              <InfoRow label="Health data" value="Stored on this device with your profile" />
              <InfoRow label="Sharing" value="Attached only when you choose records at booking" />
            </InfoCard>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead title="Devices" />
            <InfoCard>
              <InfoRow label="This device" value="Health Hero web" extra="Active" />
            </InfoCard>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <SectionHead title="Account management" />
            <div className="user-profile-info-card">
              <button type="button" className="user-profile-logout" onClick={signOut}>Log out</button>
            </div>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
