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
import { AppBar, Button, ResultHero } from './ui'
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
      <div className="ds-page">
        <AppBar title="Report saved" onBack={() => navigate('/', { replace: true })} />
        <div className="ds-page__body">
          <div role="status">
            <ResultHero
              title="Thanks for the update"
              message="This stays as your temporary record. When the clinic confirms the visit, your care hub updates from their official outcome."
            />
          </div>
        </div>
        <div className="ds-page__footer">
          <Button size="lg" block onClick={() => navigate('/', { replace: true })}>
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="ds-page">
      <AppBar title="Report visit" onBack={goBack} />

      <div className="ds-page__body">
        <div className="report-lead">
          <h2 id="report-outcomes-label">What best describes your visit?</h2>
          <p id="report-outcomes-hint">We'll save this as a temporary record until the clinic confirms the visit.</p>
        </div>

        <ul
          className="report-outcomes ds-choice-list"
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
                  className="report-option-btn ds-choice"
                  role="radio"
                  aria-checked={on}
                  tabIndex={selected ? (on ? 0 : -1) : (index === 0 ? 0 : -1)}
                  aria-controls={opt.detailKey ? detailId : undefined}
                  onClick={() => choose(opt.id, index)}
                >
                  <span className="ds-choice__title">{opt.label}</span>
                  <span className="ds-radio" aria-hidden="true" />
                </button>
                {opt.detailKey ? (
                  <div className={`report-detail${on ? ' is-open' : ''}`} id={detailId}>
                    <div className="report-detail-inner" inert={!on}>
                      {showFollowUpBooking ? (
                        <div className="report-booking ds-card is-muted is-padded" role="status">
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
                              className="ds-field is-multiline"
                              id={`${detailId}-input`}
                              rows={3}
                              value={details[opt.detailKey]}
                              onChange={(event) => setDetail(opt.detailKey, event.target.value)}
                              placeholder={opt.detailPlaceholder}
                            />
                          ) : (
                            <input
                              className="ds-field"
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
          <p className="ds-page__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {needsSaveStep || (selected === 'felt_better' && (saving || error)) ? (
        <div className="ds-page__footer">
          <p id="report-save-hint" className="ds-page__note">
            {selected === 'felt_better'
              ? 'Saving your report.'
              : 'Add any details you have, then save.'}
          </p>
          <button
            type="button"
            className="ds-btn ds-btn--primary ds-btn--lg ds-btn--block"
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
