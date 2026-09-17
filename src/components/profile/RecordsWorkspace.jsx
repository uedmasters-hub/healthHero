import { useMemo, useState } from 'react'
import { displayHealthDate, healthMemoryTimeline, useUser } from '../../user'
import { useCareHistory } from '../../booking'
import { ProfileSheets } from './ProfileHealth'
import { GuidedEmpty, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'consults', label: 'Consults' },
  { key: 'labs', label: 'Labs' },
  { key: 'prescriptions', label: 'Rx' },
  { key: 'visits', label: 'Visits' },
]

const KIND_LABEL = {
  reports: 'Lab report',
  prescriptions: 'Prescription',
  consultations: 'Consultation',
  visit: 'Visit',
}

export default function RecordsWorkspace() {
  const { health } = useUser()
  const history = useCareHistory()
  const [filter, setFilter] = useState('all')
  const [sheet, setSheet] = useState(null)
  const timeline = useMemo(
    () => healthMemoryTimeline(health, Array.isArray(history) ? history : []),
    [health, history],
  )
  const visible = filter === 'all' ? timeline : timeline.filter((item) => item.group === filter)

  const openRecord = (item) => {
    if (item.kind === 'visit') return
    setSheet({ mode: 'view', kind: item.kind, item: item.record })
  }

  return (
    <ProfilePage title="Health Memory" dataset="profile-records">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="memory-intro" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p>A single timeline of labs, prescriptions, consult notes, and clinic visits — ready to attach when you book.</p>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Timeline" action="Add report" onAction={() => setSheet({ mode: 'form', kind: 'reports', item: null })} />
            <div className="memory-filters">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={filter === item.key ? 'is-on' : ''}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            {visible.length ? (
              <ol className="memory-timeline">
                {visible.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <button type="button" className="memory-event" onClick={() => openRecord(item)} disabled={item.kind === 'visit'}>
                      <span className="memory-kind">{KIND_LABEL[item.kind] || item.kind}</span>
                      <strong>{item.title}</strong>
                      <span>{[displayHealthDate(item.date), item.meta].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <GuidedEmpty
                title={filter === 'all' ? 'Your health memory is empty' : 'Nothing in this filter yet'}
                body="Upload a lab report or keep prescriptions here so future appointments can pull them in."
                cta="Add report"
                onClick={() => setSheet({ mode: 'form', kind: 'reports', item: null })}
              />
            )}
            <div className="memory-extra-actions">
              <button type="button" className="profile-inline-link" onClick={() => setSheet({ mode: 'form', kind: 'prescriptions', item: null })}>Add prescription</button>
            </div>
          </RevealItem>

          <ProfileSheets sheet={sheet} setSheet={setSheet} />
        </>
      )}
    </ProfilePage>
  )
}
