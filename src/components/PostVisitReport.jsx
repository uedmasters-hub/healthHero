import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { usePushBack } from '../features/pushNav'
import './CancelCheckIn.css'

const REPORT_OPTIONS = [
  { id: 'felt_better', label: 'I felt better / visit went well' },
  { id: 'prescription', label: 'I received a prescription' },
  { id: 'tests', label: 'Tests or labs were ordered' },
  { id: 'referral', label: 'I was referred to another specialist' },
  { id: 'follow_up', label: 'A follow-up was scheduled' },
  { id: 'other', label: 'Something else happened' },
]

/**
 * Temporary patient report while waiting for provider confirmation.
 * Official provider outcomes reconcile over this when they arrive.
 */
export default function PostVisitReport() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentBooking,
    focusBooking,
    submitPatientVisitReport,
  } = useBooking()
  const bookingId = location.state?.bookingId
  const [selected, setSelected] = useState([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  const goBack = usePushBack(() => navigate(-1))

  if (!currentBooking && !bookingId) {
    return null
  }

  const toggle = (id) => {
    setSelected((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ))
  }

  const submit = async () => {
    if (saving) return
    if (!selected.length && !note.trim()) {
      setError('Select at least one outcome or add a short note.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const report = {
        outcomes: selected,
        note: note.trim() || null,
        temporary: true,
      }
      const result = submitPatientVisitReport?.(
        currentBooking?.engineId || currentBooking?.id || bookingId,
        report,
      )
      if (!result) {
        setError('Could not save your report. Check connection and try again.')
        return
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="ccancel-page">
        <div className="ccancel-header-bar">
          <button type="button" className="ccancel-back-btn" onClick={() => navigate('/', { replace: true })} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="ccancel-header-title">Report saved</h1>
          <div className="ccancel-menu-btn" aria-hidden="true" />
        </div>
        <div className="ccancel-body">
          <div className="ccancel-confirmed-banner" role="status">
            <div className="ccancel-confirmed-title">Thanks for the update</div>
            <p className="ccancel-confirmed-text">
              This is a temporary patient report. When your provider confirms the visit, official outcomes replace or merge with this note automatically.
            </p>
          </div>
        </div>
        <div className="ccancel-footer">
          <button type="button" className="ccancel-confirm-btn" onClick={() => navigate('/', { replace: true })}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ccancel-page">
      <div className="ccancel-header-bar">
        <button type="button" className="ccancel-back-btn" onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="ccancel-header-title">Report visit</h1>
        <div className="ccancel-menu-btn" aria-hidden="true" />
      </div>

      <div className="ccancel-body">
        <p className="ccancel-info-banner-text">
          Your provider has not confirmed outcomes yet. Share a temporary summary — it stays provisional until the clinic updates Supabase.
        </p>

        <div className="ccancel-reasons" role="group" aria-label="What happened after the visit">
          {REPORT_OPTIONS.map((opt) => {
            const on = selected.includes(opt.id)
            return (
              <button
                type="button"
                key={opt.id}
                className={`ccancel-reason-item${on ? ' is-selected' : ''}`}
                onClick={() => toggle(opt.id)}
                aria-pressed={on}
              >
                <span className="ccancel-reason-text">{opt.label}</span>
                <span className={`ccancel-radio${on ? ' selected' : ''}`} aria-hidden="true">
                  {on ? <span className="ccancel-radio-inner" /> : null}
                </span>
              </button>
            )
          })}
        </div>

        <label className="ccancel-note-label" htmlFor="patient-report-note">
          Add details (optional)
        </label>
        <textarea
          id="patient-report-note"
          className="ccancel-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Medications, tests, or anything else to remember"
        />

        {error ? (
          <p className="ccancel-info-banner-text" role="alert" style={{ color: 'var(--danger, #b42318)' }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="ccancel-footer">
        <button
          type="button"
          className="ccancel-confirm-btn"
          disabled={saving}
          aria-busy={saving}
          onClick={submit}
        >
          {saving ? 'Saving…' : 'Save temporary report'}
        </button>
      </div>
    </div>
  )
}
