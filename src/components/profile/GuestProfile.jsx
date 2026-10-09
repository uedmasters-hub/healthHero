import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildGuestProfile } from '../../features/guest/guestProfile'
import { useOriginBack } from '../../features/pushNav'
import { Button, List, ListRow } from '../ui'
import GuestMark from './GuestMark'
import { ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'

const SECTIONS = [
  ['pending', 'To continue', 'A booking, order, or payment you start stays here until you sign in.'],
  ['activity', 'Recent activity', 'Pages you open are kept on this device.'],
  ['viewed', 'Recently viewed', 'Doctors, pharmacies, and articles you open show up here.'],
  ['saved', 'Saved', 'Articles you save stay on this device until you sign in.'],
  ['searches', 'Searches', 'Searches you run are kept with this guest profile.'],
]

function GuestSection({ title, empty, items, revealed, cached, itemRef, onOpen }) {
  return (
    <RevealItem revealed={revealed} cached={cached} ref={itemRef}>
      <SectionHead title={title} />
      {items.length ? (
        <List>
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              chevron={Boolean(item.href)}
              onClick={item.href ? () => onOpen(item) : undefined}
            />
          ))}
        </List>
      ) : (
        <p className="guest-profile-empty">{empty}</p>
      )}
    </RevealItem>
  )
}

/**
 * Limited profile for someone exploring without a patient record.
 * Sign-in is offered here. It is not required to open this page.
 */
export default function GuestProfile() {
  const navigate = useNavigate()
  const goBack = useOriginBack('/')
  const [snapshot] = useState(() => buildGuestProfile())

  const openAuth = (path) => {
    navigate(path, { state: { from: '/profile' } })
  }

  const openItem = (item) => {
    navigate(item.href, item.state ? { state: item.state } : undefined)
  }

  return (
    <ProfilePage title="Guest" onBack={goBack} dataset="guest-profile">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="ds-card profile-hub-hero" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <div className="profile-hub-avatar is-guest" aria-hidden="true">
              <GuestMark />
            </div>
            <h2 className="profile-hub-name">Guest</h2>
            <p className="guest-profile-note">
              You can explore the app without an account. Sign in is only needed when you book, order, upload a prescription, pay, or open patient records. What you do now stays on this device and is linked to your patient record when you sign in.
            </p>
            <div className="guest-profile-actions">
              <Button variant="primary" size="lg" block onClick={() => openAuth('/login')}>Sign in</Button>
              <Button variant="secondary" size="lg" block onClick={() => openAuth('/register')}>Create account</Button>
            </div>
          </RevealItem>

          {SECTIONS.map(([key, title, empty], index) => (
            <GuestSection
              key={key}
              title={title}
              empty={empty}
              items={snapshot[key]}
              revealed={isRevealed(index + 1)}
              cached={isCached}
              itemRef={setItemRef(index + 1)}
              onOpen={openItem}
            />
          ))}
        </>
      )}
    </ProfilePage>
  )
}
