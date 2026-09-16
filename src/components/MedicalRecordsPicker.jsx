import { useRef, useState } from 'react'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { ATTACH_GROUPS, displayHealthDate, healthItemMeta, itemsForAttachGroup, useUser } from '../user'
import './ConfirmBooking.css'

const categoryIcons = {
  reports: (
    <svg className="confirm-record-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  prescriptions: (
    <svg className="confirm-record-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  ),
  medications: (
    <svg className="confirm-record-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="2" width="8" height="20" rx="4" />
      <path d="M10 8h4M8 12h8" />
    </svg>
  ),
  history: (
    <svg className="confirm-record-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <>
      <div className="confirm-section-label">
        Medical Records
        <span className="confirm-optional-badge">optional</span>
      </div>
      <div className="confirm-records-card">
        {ATTACH_GROUPS.map((group) => {
          const groupItems = itemsForAttachGroup(health, group.key)
          const selectedInCategory = selectedRecords.filter((id) => groupItems.some((item) => item.id === id))
          const hasSelection = selectedInCategory.length > 0
          return (
            <div key={group.key} className="confirm-record-row" onClick={() => openSheet(group.key)}>
              {categoryIcons[group.key]}
              <span>{group.label}</span>
              <div className="confirm-record-right">
                {hasSelection ? <span className="confirm-record-count">{selectedInCategory.length}</span> : null}
                {hasSelection ? (
                  <svg className="confirm-record-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                ) : (
                  <button type="button" className="confirm-record-add" onClick={(e) => { e.stopPropagation(); openSheet(group.key) }} aria-label={`Add ${group.label}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {hint ? <div className="confirm-records-hint">{hint}</div> : null}

      {isPresented ? (
        <AppBottomSheet open closing={isClosing} onClose={() => hide()} labelledBy="records-sheet-title" sheetClassName="records-sheet">
              <div className="records-sheet-header">
                <h2 id="records-sheet-title" className="records-sheet-title">Add from your profile</h2>
                <button type="button" className="records-sheet-close" onClick={() => hide()} aria-label="Close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </button>
              </div>

              <div className="records-tabs">
                {ATTACH_GROUPS.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    className={`records-tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="records-content">
                <div className="records-section-label">Choose from My Profile</div>
                <div className="records-list">
                  {items.length === 0 ? (
                    <p className="records-empty">Nothing saved here yet. Add it in My Profile, or upload a file below.</p>
                  ) : items.map((record) => (
                    <div
                      key={record.id}
                      className={`record-item ${selectedRecords.includes(record.id) ? 'selected' : ''} ${expandedRecord === record.id ? 'expanded' : ''}`}
                    >
                      <button type="button" className="record-item-main" onClick={() => toggleRecord(record.id)}>
                        <div className={`record-checkbox ${selectedRecords.includes(record.id) ? 'checked' : ''}`}>
                          {selectedRecords.includes(record.id) && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        {record.image && (
                          <img src={record.image} alt="" className="record-item-image" />
                        )}
                        <div className="record-item-info">
                          <div className="record-item-title">{record.title}</div>
                          <div className="record-item-meta">{healthItemMeta(record) || [displayHealthDate(record.date), record.doctor || record.severity || record.status].filter(Boolean).join(' • ')}</div>
                        </div>
                        <div
                          className="record-expand-icon"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedRecord((id) => id === record.id ? null : record.id) }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points={expandedRecord === record.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                          </svg>
                        </div>
                      </button>
                      {expandedRecord === record.id && (
                        <div className="record-item-details">
                          <p className="record-details-text">{record.details || 'No additional notes.'}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="records-bottom-section">
                <div className="records-divider"><span>or</span></div>
                <div className="records-section-label">Upload from device</div>
                <div className="records-upload-area">
                  <div className="records-upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="records-upload-text">Upload reports or documents</div>
                  <div className="records-upload-hint">Saved to your profile and attached to this visit</div>
                  <button type="button" className="records-upload-btn" onClick={() => fileRef.current?.click()}>Browse files</button>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" hidden onChange={handleUpload} />
                </div>
              </div>

              <div className="records-sheet-footer">
                <button type="button" className="records-add-btn" onClick={() => hide()}>
                  Add Selected ({selectedRecords.length})
                </button>
              </div>
        </AppBottomSheet>
      ) : null}
    </>
  )
}

export function AttachedRecordsSummary({ selectedRecords }) {
  const { health } = useUser()
  if (!selectedRecords?.length) return null
  return (
    <>
      <div className="confirm-section-label">
        Health Records
        <span className="confirm-records-badge">{selectedRecords.length} added</span>
      </div>
      <div className="confirm-records-card">
        {ATTACH_GROUPS.map((group) => {
          const groupItems = itemsForAttachGroup(health, group.key)
          const selectedInCategory = selectedRecords.filter((id) => groupItems.some((item) => item.id === id))
          if (!selectedInCategory.length) return null
          return (
            <div key={group.key} className="confirm-record-row is-static">
              {categoryIcons[group.key]}
              <span>{group.label}</span>
              <div className="confirm-record-right">
                <span className="confirm-record-count">{selectedInCategory.length}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
