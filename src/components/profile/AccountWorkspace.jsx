import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../user'
import { InfoCard, InfoRow, NavGroup, NavRow, ProfileIcons, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'
import { Badge, List, ListRow } from '../ui'
import { flowState } from '../../lib/careFlow'

export default function AccountWorkspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, isDemo, logout } = useUser()

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <ProfilePage title="Account" dataset="profile-account">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="ds-card profile-hero" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p className="ds-overline">Membership</p>
            <h2 className="profile-hero__title">{isDemo ? 'eMedicalls PRO' : 'eMedicalls member'}</h2>
            <p className="profile-hero__copy">{profile?.email}</p>
          </RevealItem>

          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Preferences" />
            <NavGroup>
              <NavRow
                icon={ProfileIcons.message}
                label="Notifications"
                onClick={() => navigate('/notifications', {
                  state: flowState(location, {
                    origin: 'account',
                    returnTo: location.state?.returnTo || '/profile/account',
                  }),
                })}
              />
            </NavGroup>
          </RevealItem>

          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Privacy & security" />
            <InfoCard>
              <InfoRow label="Sign-in" value={profile?.phone || profile?.email} />
              <InfoRow label="Health data" value="Stored on this device with your profile" />
              <InfoRow label="Sharing" value="Attached only when you choose records at booking" />
            </InfoCard>
          </RevealItem>

          <RevealItem revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead title="Devices" />
            <InfoCard>
              <InfoRow label="This device" value="eMedicalls web" extra={<Badge tone="success">Active</Badge>} />
            </InfoCard>
          </RevealItem>

          <RevealItem revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <SectionHead title="Account management" />
            <List>
              <ListRow className="is-centered" danger chevron={false} title="Log out" onClick={signOut} />
            </List>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
