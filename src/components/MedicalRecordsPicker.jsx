import { useRef, useState } from 'react'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { ATTACH_GROUPS, displayHealthDate, healthItemMeta, itemsForAttachGroup, useUser } from '../user'
import { Badge, Button, CheckboxMark, Chip, ChipRow, EmptyState, Icon, IconButton, List, ListRow, SectionHead, SheetHeader, cx } from './ui'
import './MedicalRecordsPicker.css'

const categoryIcons = {
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  prescriptions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  ),
  medications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="8" y="2" width="8" height="20" rx="4" />
      <path d="M10 8h4M8 12h8" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function MedicalRecordsPicker({
  selectedRecords,
  onChange,
  hint = 'Attach reports, prescriptions, medications, or medical history from your profile.',
}) {
  const { health, saveHealthItem } = useUser()
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [activeTab, setActiveTab] = useState('reports')
  const [expandedRecord, setExpandedRecord] = useState(null)
  const fileRef = useRef(null)

  const openSheet = (tab) => {
    setActiveTab(tab)
    show()
  }

  const toggleRecord = (recordId) => {
    onChange(
      selectedRecords.includes(recordId)
        ? selectedRecords.filter((id) => id !== recordId)
        : [...selectedRecords, recordId]
    )
  }

  const items = itemsForAttachGroup(health, activeTab)

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const created = saveHealthItem('reports', {
      title: file.name.replace(/\.[^.]+$/, '') || file.name,
      date: todayIso(),
      doctor: 'Uploaded from device',
      details: `Uploaded for this visit (${file.name}).`,
      attachments: [file.name],
    })
    if (created?.id) {
      setActiveTab('reports')
      onChange(selectedRecords.includes(created.id) ? selectedRecords : [...selectedRecords, created.id])
    }
  }

  return (
    <section className="records-picker">
      <SectionHead group as="h3" title="Medical records" action={<Badge tone="neutral">Optional</Badge>} />
      <List>
        {ATTACH_GROUPS.map((group) => {
          const groupItems = itemsForAttachGroup(health, group.key)
          const count = selectedRecords.filter((id) => groupItems.some((item) => item.id === id)).length
          return (
            <ListRow
              key={group.key}
              onClick={() => openSheet(group.key)}
              icon={<span className="ds-icon-well" aria-hidden="true">{categoryIcons[group.key]}</span>}
              title={group.label}
              chevron={false}
              aria-label={count ? `${group.label}, ${count} attached` : `Add ${group.label}`}
              trailing={count ? (
                <Badge tone="solid">{count}</Badge>
              ) : (
                <span className="ds-icon-btn is-subtle is-sm-size" aria-hidden="true"><Icon.Plus /></span>
              )}
            />
          )
        })}
      </List>
      {hint ? <p className="ds-caption records-picker__hint">{hint}</p> : null}

      {isPresented ? (
        <AppBottomSheet open closing={isClosing} onClose={() => hide()} labelledBy="records-sheet-title" sheetClassName="records-sheet">
          <SheetHeader titleId="records-sheet-title" title="Add from your profile" onClose={() => hide()} />

          <ChipRow bleed label="Record type" className="records-sheet__tabs">
            {ATTACH_GROUPS.map((tab) => (
              <Chip key={tab.key} selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </Chip>
            ))}
          </ChipRow>

          <div className="records-sheet__body">
            <h4 className="ds-section-title">Choose from My Profile</h4>
            {items.length === 0 ? (
              <EmptyState compact card title="Nothing saved here yet" message="Add it in My Profile, or upload a file below." />
            ) : (
              <List>
                {items.map((record) => {
                  const selected = selectedRecords.includes(record.id)
                  const expanded = expandedRecord === record.id
                  return (
                    <div key={record.id} className={cx('records-item', expanded && 'is-expanded')}>
                      <div className="records-item__row">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          className="ds-list-row records-item__main"
                          onClick={() => toggleRecord(record.id)}
                        >
                          <CheckboxMark />
                          {record.image ? <img src={record.image} alt="" className="records-item__image" /> : null}
                          <span className="ds-list-row__body">
                            <span className="ds-list-row__title">{record.title}</span>
                            <span className="ds-list-row__sub">
                              {healthItemMeta(record) || [displayHealthDate(record.date), record.doctor || record.severity || record.status].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                        <IconButton
                          className="records-item__toggle"
                          label={expanded ? 'Hide notes' : 'Show notes'}
                          aria-expanded={expanded}
                          onClick={() => setExpandedRecord((id) => (id === record.id ? null : record.id))}
                        >
                          <Icon.ChevronDown />
                        </IconButton>
                      </div>
                      {expanded ? (
                        <p className="ds-caption records-item__details">{record.details || 'No additional notes.'}</p>
                      ) : null}
                    </div>
                  )
                })}
              </List>
            )}

            <p className="ds-divider-label">or</p>
            <h4 className="ds-section-title">Upload from device</h4>
            <EmptyState
              card
              compact
              className="records-upload"
              icon={<Icon.Upload />}
              title="Upload reports or documents"
              message="Saved to your profile and attached to this visit"
              action={<Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Browse files</Button>}
            />
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" hidden onChange={handleUpload} />
          </div>

          <div className="records-sheet__footer">
            <Button size="lg" block onClick={() => hide()}>
              Add selected ({selectedRecords.length})
            </Button>
          </div>
        </AppBottomSheet>
      ) : null}
    </section>
  )
}

export function AttachedRecordsSummary({ selectedRecords }) {
  const { health } = useUser()
  if (!selectedRecords?.length) return null
  return (
    <section>
      <SectionHead group as="h3" title="Health records" action={<Badge tone="success">{selectedRecords.length} added</Badge>} />
      <List>
        {ATTACH_GROUPS.map((group) => {
          const groupItems = itemsForAttachGroup(health, group.key)
          const count = selectedRecords.filter((id) => groupItems.some((item) => item.id === id)).length
          if (!count) return null
          return (
            <ListRow
              key={group.key}
              icon={<span className="ds-icon-well" aria-hidden="true">{categoryIcons[group.key]}</span>}
              title={group.label}
              trailing={<Badge tone="solid">{count}</Badge>}
            />
          )
        })}
      </List>
    </section>
  )
}
