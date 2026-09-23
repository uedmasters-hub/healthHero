import { useNavigate } from 'react-router-dom'
import { useProfileCompletion, useUser } from '../user'
import { HOME_VISIBLE_STATUSES, useBookingStore } from '../booking'
import { CARE_SUPPORT, NavGroup, NavRow, ProfileIcons, ProfilePage } from './profile/ProfileChrome'
import ProfileCompletionRing from './home/ProfileCompletionRing'
import RevealItem from './RevealItem'
import { usePushBack } from '../features/pushNav'
import './PatientProfile.css'

function sectionProgress(sections, id) {
  return sections.find((item) => item.id === id) || null
}

export default function PatientProfile() {
  const navigate = useNavigate()
  const goHome = usePushBack('/')
  const { profile, isDemo, logout, health } = useUser()
  const { bookings } = useBookingStore()
  const completion = useProfileCompletion()

  if (!profile) return null

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
      onBack={goHome}
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
              <div className="profile-hub-completion-track" aria-hidden="true">
                <span
                  className="profile-hub-completion-fill"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
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

          <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <h3 className="user-profile-section-title">Personal</h3>
            <NavGroup>
              <NavRow
                icon={ProfileIcons.person}
                label="Personal"
                progress={personal}
                onClick={() => navigate('/profile/personal')}
              />
              <NavRow
                icon={ProfileIcons.district}
                label="District & Health ID"
                progress={district}
                onClick={() => navigate('/profile/personal')}
              />
              <NavRow
                icon={ProfileIcons.payment}
                label="Payment"
                progress={payment}
                onClick={() => navigate('/profile/account')}
              />
            </NavGroup>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <h3 className="user-profile-section-title">Health</h3>
            <NavGroup>
              <NavRow
                icon={ProfileIcons.medical}
                label="Medical"
                progress={medical}
                onClick={() => navigate('/profile/medical')}
              />
              <NavRow
                icon={ProfileIcons.records}
                label="Health Records"
                progress={records}
                onClick={() => navigate('/profile/records')}
              />
              <NavRow
                icon={ProfileIcons.insurance}
                label="Insurance"
                progress={insurance}
                onClick={() => navigate('/profile/insurance')}
              />
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
