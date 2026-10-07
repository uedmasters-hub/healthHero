import { useState } from 'react'
import { formatHeight, formatPhone, formatWeight, useUser } from '../../user'
import { formatPlaceParts } from '../../features/geography/formatPlace'
import { ProfileSheets } from './ProfileHealth'
import { GuidedEmpty, InfoCard, InfoRow, MapThumb, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'
import { Badge, Button, List, ListRow } from '../ui'
import { RedirectingPage } from '../system'

export default function PersonalWorkspace() {
  const { profile, addresses, emergencyContacts, health } = useUser()
  const [sheet, setSheet] = useState(null)
  const allergies = health?.allergies || []
  const emergencyPhones = emergencyContacts.map((item) => item.phone).filter(Boolean).join(', ')
  const allergySummary = allergies.length
    ? allergies.map((item) => item.title).join(', ')
    : ''
  const emergencyInfo = emergencyContacts[0]
    ? `${emergencyContacts[0].name} · ${emergencyContacts[0].relation}`
    : ''

  if (!profile) return <RedirectingPage title="Loading your details" seconds={12} />

  return (
    <ProfilePage title="Personal" dataset="profile-personal">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <SectionHead title="Basic Details" action="Edit" onAction={() => setSheet({ mode: 'profile', scope: 'basic' })} />
            <InfoCard>
              <InfoRow label="Name" value={profile.name} />
              <InfoRow
                label="Date of Birth"
                value={profile.dob || (profile.age != null ? `${profile.age} years` : '')}
                extra={profile.dob && profile.age != null ? `${profile.age} years` : ''}
                emptyLabel="Add date of birth"
              />
              <InfoRow label="Height" value={formatHeight(profile.height)} emptyLabel="Add height" />
              <InfoRow label="Weight" value={formatWeight(profile.weight)} emptyLabel="Add weight" />
            </InfoCard>
          </RevealItem>

          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Contact" action="Edit" onAction={() => setSheet({ mode: 'profile', scope: 'contact' })} />
            <InfoCard>
              <InfoRow
                label="Phone"
                value={formatPhone(profile.phone)}
                extra={profile.phoneVerified ? <Badge tone="success">Verified</Badge> : null}
                emptyLabel="Add this detail"
              />
              <InfoRow
                label="Email"
                value={profile.email}
                extra={profile.emailVerified ? <Badge tone="success">Verified</Badge> : null}
                emptyLabel="Add this detail"
              />
              <InfoRow
                label="Emergency"
                value={emergencyPhones}
                extra={emergencyContacts[0]?.name ? `${emergencyContacts[0].name}${emergencyContacts[0].relation ? ` · ${emergencyContacts[0].relation}` : ''}` : null}
                emptyLabel="Add an emergency contact"
              />
            </InfoCard>
          </RevealItem>

          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead
              title="Address"
              action="Manage"
              onAction={() => setSheet({ mode: 'form', kind: 'addresses', item: null })}
            />
            {addresses.length ? (
              <List>
                {addresses.map((item) => (
                  <ListRow
                    key={item.id}
                    onClick={() => setSheet({ mode: 'view', kind: 'addresses', item })}
                    title={item.label || 'Address'}
                    subtitle={formatPlaceParts(item.line, item.city)}
                    chevron={false}
                    trailing={<MapThumb seed={`${item.label}-${item.line}-${item.city}`} />}
                  />
                ))}
              </List>
            ) : (
              <GuidedEmpty
                title="Save a home or work address"
                body="Keep clinic visits and sample collection easier with a saved address."
                cta="Add address"
                onClick={() => setSheet({ mode: 'form', kind: 'addresses', item: null })}
              />
            )}
          </RevealItem>

          <RevealItem revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead title="Health Passport" action="Update" onAction={() => setSheet({ mode: 'profile', scope: 'passport' })} />
            <InfoCard>
              <InfoRow label="Blood Group" value={profile.bloodGroup} emptyLabel="Add blood group" />
              <InfoRow label="Allergies" value={allergySummary} emptyLabel="Add known allergies" />
              <InfoRow label="Emergency Info" value={emergencyInfo} emptyLabel="Add who we should call" />
            </InfoCard>
            {!allergies.length ? (
              <Button variant="text" size="sm" className="profile-inline-action" onClick={() => setSheet({ mode: 'form', kind: 'allergies', item: null })}>
                Add allergy to your passport
              </Button>
            ) : null}
          </RevealItem>

          <ProfileSheets sheet={sheet} setSheet={setSheet} />
        </>
      )}
    </ProfilePage>
  )
}
