import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { usePushBack } from '../features/pushNav'
import { toLegacyBooking } from '../booking/models'
import { presentBookingCard } from '../booking/presentBooking'
import {
  VISIT_OUTCOMES,
  bookingIdentity,
  buildPatientReport,
  findScheduledFollowUp,
} from '../booking/visitOutcomes'
import './CancelCheckIn.css'
import './PostVisitReport.css'

/**
 * One primary outcome for this visit. The original submission stays
 * as a temporary record until the clinic confirms the official outcome.
 */
export default function PostVisitReport() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    bookings,
    currentBooking,
    focusBooking,
    submitPatientVisitReport,
  } = useBooking()
  const bookingId = location.state?.bookingId
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState({
    medications: '',
    tests: '',
    referral: '',
    followUp: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const savingRef = useRef(false)
  const optionRefs = useRef([])

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  const goBack = usePushBack(() => navigate(-1))
  const followUpRecord = findScheduledFollowUp(bookings || [], currentBooking)
  const followUpCard = followUpRecord ? presentBookingCard(toLegacyBooking(followUpRecord)) : null

  if (!currentBooking && !bookingId) {
    return null
  }

  const setDetail = (key, value) => {
    setError('')
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  const submitOutcome = async (outcomeId) => {
    if (savingRef.current || !outcomeId) return
    const report = buildPatientReport({
      primaryOutcome: outcomeId,
      details,
      followUpBookingId: outcomeId === 'follow_up' ? bookingIdentity(followUpRecord) : null,
    })
    if (!report.primaryOutcome) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const result = await submitPatientVisitReport?.(
        currentBooking?.engineId || currentBooking?.id || bookingId,
        report,
      )
      if (!result) {
        setError('Could not save your report. Check connection and try again.')
        return
      }
      setSaved(true)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const choose = (id, index) => {
    setError('')
    setSelected(id)
    optionRefs.current[index]?.focus()
    if (id === 'felt_better') submitOutcome('felt_better')
  }

  const onGroupKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return
    event.preventDefault()
    const delta = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
    const current = VISIT_OUTCOMES.findIndex((item) => item.id === selected)
    const next = current < 0
      ? (delta > 0 ? 0 : VISIT_OUTCOMES.length - 1)
      : (current + delta + VISIT_OUTCOMES.length) % VISIT_OUTCOMES.length
    choose(VISIT_OUTCOMES[next].id, next)
  }

  const needsSaveStep = Boolean(selected && selected !== 'felt_better')
  const canSave = needsSaveStep && !saving

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
              This stays as your temporary record. When the clinic confirms the visit, your care hub updates from their official outcome.
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
        <div className="report-lead">
          <h2 id="report-outcomes-label">What best describes your visit?</h2>
          <p id="report-outcomes-hint">We'll save this as a temporary record until the clinic confirms the visit.</p>
        </div>

        <ul
          className="report-outcomes"
          role="radiogroup"
          aria-labelledby="report-outcomes-label"
          aria-describedby="report-outcomes-hint"
          onKeyDown={onGroupKeyDown}
        >
          {VISIT_OUTCOMES.map((opt, index) => {
            const on = selected === opt.id
            const detailId = `report-detail-${opt.id}`
            const showFollowUpBooking = on && opt.id === 'follow_up' && followUpCard
            return (
              <li key={opt.id} className={`report-option${on ? ' is-selected' : ''}`}>
                <button
                  type="button"
                  ref={(node) => { optionRefs.current[index] = node }}
                  className="report-option-btn"
                  role="radio"
                  aria-checked={on}
                  tabIndex={selected ? (on ? 0 : -1) : (index === 0 ? 0 : -1)}
                  aria-controls={opt.detailKey ? detailId : undefined}
                  onClick={() => choose(opt.id, index)}
                >
                  <span className="report-option-text">{opt.label}</span>
                  <span className="report-radio" aria-hidden="true">
                    {on ? <span className="report-radio-dot" /> : null}
                  </span>
                </button>
                {opt.detailKey ? (
                  <div className={`report-detail${on ? ' is-open' : ''}`} id={detailId}>
                    <div className="report-detail-inner" inert={!on}>
                      {showFollowUpBooking ? (
                        <div className="report-booking" role="status">
                          <p className="report-booking-kicker">Scheduled follow-up</p>
                          <p className="report-booking-title">
                            {followUpCard.doctor?.name ? `Dr. ${String(followUpCard.doctor.name).replace(/^Dr\.?\s*/i, '')}` : 'Your follow-up'}
                          </p>
                          <p className="report-booking-meta">
                            {[followUpCard.dateLabel, followUpCard.timeLabel].filter(Boolean).join(' · ') || 'Already on your bookings'}
                          </p>
                        </div>
                      ) : (
                        <label className="report-detail-field" htmlFor={`${detailId}-input`}>
                          <span>
                            {opt.detailLabel}
                            {' '}
                            <span className="report-optional">(optional)</span>
                          </span>
                          {opt.multiline ? (
                            <textarea
                              id={`${detailId}-input`}
                              rows={3}
                              value={details[opt.detailKey]}
                              onChange={(event) => setDetail(opt.detailKey, event.target.value)}
                              placeholder={opt.detailPlaceholder}
                            />
                          ) : (
                            <input
                              id={`${detailId}-input`}
                              type="text"
                              value={details[opt.detailKey]}
                              onChange={(event) => setDetail(opt.detailKey, event.target.value)}
                              placeholder={opt.detailPlaceholder}
                              autoComplete="off"
                            />
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        {error ? (
          <p className="ccancel-form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {needsSaveStep || (selected === 'felt_better' && (saving || error)) ? (
        <div className="ccancel-footer">
          <p id="report-save-hint" className="ccancel-save-hint">
            {selected === 'felt_better'
              ? 'Saving your report.'
              : 'Add any details you have, then save.'}
          </p>
          <button
            type="button"
            className="ccancel-confirm-btn"
            aria-disabled={!canSave}
            aria-busy={saving}
            aria-describedby="report-save-hint"
            onClick={() => submitOutcome(selected)}
          >
            {saving ? 'Saving…' : 'Save temporary report'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
