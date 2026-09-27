import { useNavigate } from 'react-router-dom'
import { CARE_SUPPORT, NavGroup, NavRow, ProfileIcons, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'

export default function SupportWorkspace() {
  const navigate = useNavigate()

  return (
    <ProfilePage title="Support" dataset="profile-support">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="ds-card profile-hero is-tinted" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p className="ds-overline">Care team</p>
            <h2 className="profile-hero__title">We are here for booking, visits, and health records.</h2>
            <p className="profile-hero__copy">Typically replies within a few hours · 8:00 AM – 10:00 PM IST</p>
          </RevealItem>

          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Contact us" />
            <NavGroup>
              <NavRow icon={ProfileIcons.message} label="Messages" onClick={() => navigate('/chat')} />
              <NavRow icon={ProfileIcons.email} label={`Email ${CARE_SUPPORT.email}`} href={`mailto:${CARE_SUPPORT.email}?subject=eMedicalls%20support`} />
              <NavRow icon={ProfileIcons.call} label={`Call ${CARE_SUPPORT.phoneLabel}`} href={`tel:${CARE_SUPPORT.phone}`} />
            </NavGroup>
          </RevealItem>

          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Help" />
            <NavGroup>
              <NavRow label="Visit updates & alerts" onClick={() => navigate('/notifications')} />
              <NavRow label="Find a report or prescription" onClick={() => navigate('/profile/records')} />
              <NavRow label="Privacy & account" onClick={() => navigate('/profile/account')} />
            </NavGroup>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
