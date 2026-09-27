import { useMemo, useState } from 'react'
import { displayHealthDate, healthMemoryTimeline, useUser } from '../../user'
import { useCareHistory } from '../../booking'
import { ProfileSheets } from './ProfileHealth'
import { GuidedEmpty, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'
import { Button, Chip, ChipRow, List, ListRow } from '../ui'

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
          <RevealItem className="ds-card is-padded" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <p className="ds-body">A single timeline of labs, prescriptions, consult notes, and clinic visits — ready to attach when you book.</p>
          </RevealItem>

          <RevealItem revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
            <SectionHead title="Timeline" action="Add report" onAction={() => setSheet({ mode: 'form', kind: 'reports', item: null })} />
            <ChipRow bleed label="Filter records">
              {FILTERS.map((item) => (
                <Chip
                  key={item.key}
                  selected={filter === item.key}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </Chip>
              ))}
            </ChipRow>
          </RevealItem>

          <RevealItem revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            {visible.length ? (
              <List as="ol" className="profile-timeline">
                {visible.map((item) => (
                  <ListRow
                    as="li"
                    key={`${item.kind}-${item.id}`}
                    className={item.kind === 'visit' ? undefined : 'is-interactive'}
                    role={item.kind === 'visit' ? undefined : 'button'}
                    tabIndex={item.kind === 'visit' ? undefined : 0}
                    onClick={item.kind === 'visit' ? undefined : () => openRecord(item)}
                    onKeyDown={item.kind === 'visit' ? undefined : (event) => {
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRecord(item) }
                    }}
                    chevron={item.kind !== 'visit'}
                    title={item.title}
                    subtitle={[displayHealthDate(item.date), item.meta].filter(Boolean).join(' · ')}
                  >
                    <span className="ds-list-row__label profile-timeline__kind">{KIND_LABEL[item.kind] || item.kind}</span>
                  </ListRow>
                ))}
              </List>
            ) : (
              <GuidedEmpty
                title={filter === 'all' ? 'Your health memory is empty' : 'Nothing in this filter yet'}
                body="Upload a lab report or keep prescriptions here so future appointments can pull them in."
                cta="Add report"
                onClick={() => setSheet({ mode: 'form', kind: 'reports', item: null })}
              />
            )}
            <Button variant="text" size="sm" className="profile-inline-action" onClick={() => setSheet({ mode: 'form', kind: 'prescriptions', item: null })}>Add prescription</Button>
          </RevealItem>

          <ProfileSheets sheet={sheet} setSheet={setSheet} />
        </>
      )}
    </ProfilePage>
  )
}
