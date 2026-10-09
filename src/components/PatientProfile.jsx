import { useNavigate, useLocation } from 'react-router-dom'
import { useProfileCompletion, useUser } from '../user'
import { HOME_VISIBLE_STATUSES, useBookingStore } from '../booking'
import { CARE_SUPPORT, NavGroup, NavRow, ProfileIcons, ProfilePage, SectionHead } from './profile/ProfileChrome'
import { Badge, Button, List, ListRow, Progress } from './ui'
import ProfileCompletionRing from './home/ProfileCompletionRing'
import RevealItem from './RevealItem'
import { useOriginBack } from '../features/pushNav'
import { flowState } from '../lib/careFlow'
import './PatientProfile.css'
import { RedirectingPage } from './system'

function sectionProgress(sections, id) {
  return sections.find((item) => item.id === id) || null
}

export default function PatientProfile() {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useOriginBack('/')
  const { profile, isDemo, logout, health } = useUser()
  const { bookings } = useBookingStore()
  const completion = useProfileCompletion()

  if (!profile) {
    return <RedirectingPage title="Loading your profile" fallbackTo="/" seconds={12} />
  }

  const openChild = (path) => {
    navigate(path, {
      state: flowState(location, {
        origin: 'profile',
        returnTo: '/profile',
      }),
    })
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const reports = health?.reports?.length || 0
  const prescriptions = health?.prescriptions?.length || 0
  const appointments = (bookings || []).filter((item) => HOME_VISIBLE_STATUSES.includes(item.status)).length
  const personal = sectionProgress(completion.sections, 'personal')
  const medical = sectionProgress(completion.sections, 'medical')
  const records = sectionProgress(completion.sections, 'records')
  const insurance = sectionProgress(completion.sections, 'insurance')
  const district = sectionProgress(completion.sections, 'district')
  const payment = sectionProgress(completion.sections, 'payment')

  return (
    <ProfilePage
      title="My Profile"
      onBack={goBack}
      dataset="profile-hub"
      action={(
        <Button variant="text" size="sm" onClick={() => openChild('/profile/personal')}>
          Edit
        </Button>
      )}
    >
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="ds-card profile-hub-hero" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            {isDemo ? <Badge tone="solid" caps className="profile-hub-pro">PRO</Badge> : null}
            <ProfileCompletionRing percent={completion.percent} className="profile-hub-avatar-ring" size={72}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="profile-hub-avatar profile-hub-avatar--photo" />
              ) : (
                <div className="profile-hub-avatar">{profile.initials}</div>
              )}
            </ProfileCompletionRing>
            <h2 className="profile-hub-name">{profile.name}</h2>
            <p className="profile-hub-email">{profile.email}</p>

            <div className="profile-hub-completion" aria-label={`Profile completion ${completion.percent} percent`}>
              <div className="profile-hub-completion-head">
                <span>Profile Completion</span>
                <strong>{completion.percent}%</strong>
              </div>
              <Progress thin tone="brand" value={completion.percent} />
              <p className="profile-hub-completion-summary">{completion.summary}</p>
            </div>

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

          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Personal" />
            <NavGroup>
              <NavRow
                icon={ProfileIcons.person}
                label="Personal"
                progress={personal}
                onClick={() => openChild('/profile/personal')}
              />
              <NavRow
                icon={ProfileIcons.district}
                label="District & Health ID"
                progress={district}
                onClick={() => openChild('/profile/personal')}
              />
              <NavRow
                icon={ProfileIcons.payment}
                label="Payment"
                progress={payment}
                onClick={() => openChild('/profile/account')}
              />
            </NavGroup>
          </RevealItem>

          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Health" />
            <NavGroup>
              <NavRow
                icon={ProfileIcons.medical}
                label="Medical"
                progress={medical}
                onClick={() => openChild('/profile/medical')}
              />
              <NavRow
                icon={ProfileIcons.records}
                label="Health Records"
                progress={records}
                onClick={() => openChild('/profile/records')}
              />
              <NavRow
                icon={ProfileIcons.insurance}
                label="Insurance"
                progress={insurance}
                onClick={() => openChild('/profile/insurance')}
              />
            </NavGroup>
          </RevealItem>

          <RevealItem revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead title="Support" />
            <NavGroup>
              <NavRow icon={ProfileIcons.message} label="Message" onClick={() => openChild('/profile/support')} />
              <NavRow icon={ProfileIcons.call} label="Call Support" href={`tel:${CARE_SUPPORT.phone}`} />
              <NavRow icon={ProfileIcons.account} label="Account" onClick={() => openChild('/profile/account')} />
            </NavGroup>
          </RevealItem>

          <RevealItem revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <List>
              <ListRow className="is-centered" danger chevron={false} title="Log out" onClick={signOut} />
            </List>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
