import { useState } from 'react'
import { healthItemMeta, listItemMeta, listItemTitle, useUser } from '../../user'
import { ProfileSheets } from './ProfileHealth'
import { GuidedEmpty, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'
import { Badge, Button, List, ListRow } from '../ui'

function isActiveStatus(status) {
  const value = String(status || '').toLowerCase()
  return !value || value === 'active' || value === 'managed' || value === 'monitoring'
}

const STATUS_TONE = { active: 'success', managed: 'success', monitoring: 'info', resolved: 'muted', paused: 'warning', stopped: 'muted' }
const SEVERITY_TONE = { severe: 'danger', moderate: 'warning', mild: 'info' }

function statusBadge(status, map = STATUS_TONE) {
  if (!status) return null
  const tone = map[String(status).toLowerCase()] || 'neutral'
  return <Badge tone={tone}>{status}</Badge>
}

function MedRow({ item, onOpen }) {
  return (
    <ListRow
      onClick={() => onOpen(item)}
      title={item.title}
      subtitle={item.details || item.doctor || 'Tap to review dose and instructions'}
      trailing={statusBadge(item.status)}
    />
  )
}

function AllergyRow({ item, onOpen }) {
  return (
    <ListRow
      onClick={() => onOpen(item)}
      title={item.title}
      trailing={statusBadge(item.severity || 'Noted', SEVERITY_TONE)}
    />
  )
}

function ConditionRow({ kind, item, onOpen }) {
  return (
    <ListRow
      onClick={() => onOpen(item)}
      title={listItemTitle(kind, item)}
      subtitle={listItemMeta(kind, item) || healthItemMeta(item)}
      trailing={statusBadge(item.status)}
    />
  )
}

export default function MedicalWorkspace() {
  const { health } = useUser()
  const [sheet, setSheet] = useState(null)
  const medications = health?.medications || []
  const allergies = health?.allergies || []
  const diagnoses = health?.diagnoses || []
  const conditions = health?.conditions || []
  const surgeries = health?.surgeries || []
  const vaccinations = health?.vaccinations || []
  const activeMeds = medications.filter((item) => isActiveStatus(item.status))
  const open = (kind, item = null, mode = item ? 'view' : 'form') => setSheet({ mode, kind, item })

  return (
    <ProfilePage title="Medical" dataset="profile-medical">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="ds-card profile-hero is-tinted" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p className="ds-overline">Current chart</p>
            <h2 className="profile-hero__title">{activeMeds.length ? `${activeMeds.length} active medicine${activeMeds.length === 1 ? '' : 's'}` : 'No active medicines'}</h2>
            <p className="profile-hero__copy">
              {allergies.length
                ? `${allergies.length} allerg${allergies.length === 1 ? 'y' : 'ies'} on file`
                : 'Add allergies so doctors can prescribe safely.'}
            </p>
          </RevealItem>

          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Medications" action="Add" onAction={() => open('medications')} />
            {medications.length ? (
              <List>
                {medications.map((item) => (
                  <MedRow key={item.id} item={item} onOpen={(entry) => open('medications', entry)} />
                ))}
              </List>
            ) : (
              <GuidedEmpty
                title="Keep your current medicines here"
                body="Dose, timing, and status stay with your profile and can be attached when you book."
                cta="Add medication"
                onClick={() => open('medications')}
              />
            )}
          </RevealItem>

          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Allergies" action="Add" onAction={() => open('allergies')} />
            {allergies.length ? (
              <List>
                {allergies.map((item) => (
                  <AllergyRow key={item.id} item={item} onOpen={(entry) => open('allergies', entry)} />
                ))}
              </List>
            ) : (
              <GuidedEmpty
                title="Tell us what to avoid"
                body="Drug and food allergies are shared with booking and consultation flows."
                cta="Add allergy"
                onClick={() => open('allergies')}
              />
            )}
          </RevealItem>

          <RevealItem revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead title="Diagnoses & conditions" action="Add" onAction={() => open('diagnoses')} />
            {diagnoses.length || conditions.length ? (
              <List>
                {diagnoses.map((item) => <ConditionRow key={item.id} kind="diagnoses" item={item} onOpen={(entry) => open('diagnoses', entry)} />)}
                {conditions.map((item) => <ConditionRow key={item.id} kind="conditions" item={item} onOpen={(entry) => open('conditions', entry)} />)}
              </List>
            ) : (
              <GuidedEmpty
                title="Track what you are managing"
                body="Diagnoses and chronic conditions stay on your chart for every visit."
                cta="Add diagnosis"
                onClick={() => open('diagnoses')}
              />
            )}
            {diagnoses.length || conditions.length ? (
              <Button variant="text" size="sm" className="profile-inline-action" onClick={() => open('conditions')}>Add chronic condition</Button>
            ) : null}
          </RevealItem>

          <RevealItem revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <SectionHead title="Surgeries" action="Add" onAction={() => open('surgeries')} />
            {surgeries.length ? (
              <List>
                {surgeries.map((item) => (
                  <ConditionRow key={item.id} kind="surgeries" item={item} onOpen={(entry) => open('surgeries', entry)} />
                ))}
              </List>
            ) : (
              <GuidedEmpty title="No surgeries recorded" body="Past procedures help clinicians plan safely." cta="Add surgery" onClick={() => open('surgeries')} />
            )}
          </RevealItem>

          <RevealItem revealed={isRevealed(5)} cached={isCached} ref={setItemRef(5)}>
            <SectionHead title="Vaccinations" action="Add" onAction={() => open('vaccinations')} />
            {vaccinations.length ? (
              <List>
                {vaccinations.map((item) => (
                  <ListRow
                    key={item.id}
                    onClick={() => open('vaccinations', item)}
                    title={item.title}
                    subtitle={[item.dose, healthItemMeta(item)].filter(Boolean).join(' · ')}
                  />
                ))}
              </List>
            ) : (
              <GuidedEmpty title="Keep immunisation history handy" body="Boosters and travel vaccines live with your profile." cta="Add vaccination" onClick={() => open('vaccinations')} />
            )}
          </RevealItem>

          <ProfileSheets sheet={sheet} setSheet={setSheet} />
        </>
      )}
    </ProfilePage>
  )
}
