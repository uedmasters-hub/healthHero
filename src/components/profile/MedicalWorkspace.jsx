import { useState } from 'react'
import { healthItemMeta, listItemMeta, listItemTitle, useUser } from '../../user'
import { ProfileSheets } from './ProfileHealth'
import { GuidedEmpty, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'

function isActiveStatus(status) {
  const value = String(status || '').toLowerCase()
  return !value || value === 'active' || value === 'managed' || value === 'monitoring'
}

function MedCard({ item, onOpen }) {
  return (
    <button type="button" className="med-now-card" onClick={() => onOpen(item)}>
      <span className="med-now-mark" aria-hidden="true" />
      <span className="med-now-copy">
        <strong>{item.title}</strong>
        <span>{item.details || item.doctor || 'Tap to review dose and instructions'}</span>
      </span>
      {item.status ? <span className={`med-status is-${String(item.status).toLowerCase()}`}>{item.status}</span> : null}
    </button>
  )
}

function AllergyPill({ item, onOpen }) {
  const severity = String(item.severity || 'noted').toLowerCase()
  return (
    <button type="button" className={`allergy-pill is-${severity}`} onClick={() => onOpen(item)}>
      <strong>{item.title}</strong>
      <span>{item.severity || 'Noted'}</span>
    </button>
  )
}

function ConditionRow({ kind, item, onOpen }) {
  return (
    <button type="button" className="condition-row" onClick={() => onOpen(item)}>
      <span>
        <strong>{listItemTitle(kind, item)}</strong>
        <span>{listItemMeta(kind, item) || healthItemMeta(item)}</span>
      </span>
      {item.status ? <em>{item.status}</em> : null}
    </button>
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
          <RevealItem className="med-hero" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p className="med-hero-kicker">Current chart</p>
            <h2>{activeMeds.length ? `${activeMeds.length} active medicine${activeMeds.length === 1 ? '' : 's'}` : 'No active medicines'}</h2>
            <p>
              {allergies.length
                ? `${allergies.length} allerg${allergies.length === 1 ? 'y' : 'ies'} on file`
                : 'Add allergies so doctors can prescribe safely.'}
            </p>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Medications" action="Add" onAction={() => open('medications')} />
            {medications.length ? medications.map((item) => (
              <MedCard key={item.id} item={item} onOpen={(entry) => open('medications', entry)} />
            )) : (
              <GuidedEmpty
                title="Keep your current medicines here"
                body="Dose, timing, and status stay with your profile and can be attached when you book."
                cta="Add medication"
                onClick={() => open('medications')}
              />
            )}
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Allergies" action="Add" onAction={() => open('allergies')} />
            {allergies.length ? (
              <div className="allergy-pill-row">
                {allergies.map((item) => (
                  <AllergyPill key={item.id} item={item} onOpen={(entry) => open('allergies', entry)} />
                ))}
              </div>
            ) : (
              <GuidedEmpty
                title="Tell us what to avoid"
                body="Drug and food allergies are shared with booking and consultation flows."
                cta="Add allergy"
                onClick={() => open('allergies')}
              />
            )}
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead title="Diagnoses & conditions" action="Add" onAction={() => open('diagnoses')} />
            {diagnoses.length || conditions.length ? (
              <div className="condition-stack">
                {diagnoses.map((item) => <ConditionRow key={item.id} kind="diagnoses" item={item} onOpen={(entry) => open('diagnoses', entry)} />)}
                {conditions.map((item) => <ConditionRow key={item.id} kind="conditions" item={item} onOpen={(entry) => open('conditions', entry)} />)}
              </div>
            ) : (
              <GuidedEmpty
                title="Track what you are managing"
                body="Diagnoses and chronic conditions stay on your chart for every visit."
                cta="Add diagnosis"
                onClick={() => open('diagnoses')}
              />
            )}
            {diagnoses.length || conditions.length ? (
              <button type="button" className="profile-inline-link" onClick={() => open('conditions')}>Add chronic condition</button>
            ) : null}
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <SectionHead title="Surgeries" action="Add" onAction={() => open('surgeries')} />
            {surgeries.length ? surgeries.map((item) => (
              <ConditionRow key={item.id} kind="surgeries" item={item} onOpen={(entry) => open('surgeries', entry)} />
            )) : (
              <GuidedEmpty title="No surgeries recorded" body="Past procedures help clinicians plan safely." cta="Add surgery" onClick={() => open('surgeries')} />
            )}
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(5)} cached={isCached} ref={setItemRef(5)}>
            <SectionHead title="Vaccinations" action="Add" onAction={() => open('vaccinations')} />
            {vaccinations.length ? (
              <div className="vax-rail">
                {vaccinations.map((item) => (
                  <button type="button" key={item.id} className="vax-chip" onClick={() => open('vaccinations', item)}>
                    <strong>{item.title}</strong>
                    <span>{[item.dose, healthItemMeta(item)].filter(Boolean).join(' · ')}</span>
                  </button>
                ))}
              </div>
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
