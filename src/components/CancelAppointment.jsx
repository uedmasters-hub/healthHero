import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { usePushBack } from '../features/pushNav'
import './CancelCheckIn.css'

const CANCEL_REASONS = [
  'Feeling better / no longer needed',
  'Scheduling conflict',
  'Wait time too long',
  'Provider unavailable',
  'Other',
]

const BRANCHES = [
  {
    id: 'reschedule',
    label: 'Request a reschedule',
    detail: 'Notify the clinic and pick a new slot.',
  },
  {
    id: 'contact',
    label: 'Contact the clinic first',
    detail: 'Message or call before cancelling.',
  },
  {
    id: 'refund',
    label: 'Cancel and request a refund',
    detail: 'Eligible visits are reviewed by billing.',
  },
  {
    id: 'cancel',
    label: 'Cancel this appointment',
    detail: 'Release the slot and notify your provider.',
  },
]

/**
 * Full cancel / exception branch workflow for Visit in Progress and details.
 * Collects reason → branch → persists via cancelAppointmentWithReason (audit + slot release).
 */
export default function CancelAppointment() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentBooking,
    cancelAppointmentWithReason,
    focusBooking,
  } = useBooking()

  const bookingId = location.state?.bookingId
  const presetBranch = location.state?.branch || null

  const [step, setStep] = useState(presetBranch ? 'reason' : 'reason')
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0])
  const [note, setNote] = useState('')
  const [branch, setBranch] = useState(presetBranch || 'cancel')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  useEffect(() => {
    if (!currentBooking && !bookingId) {
      navigate('/', { replace: true })
    }
  }, [currentBooking, bookingId, navigate])

  const goBack = usePushBack(() => {
    if (done) {
      navigate('/', { replace: true })
      return
    }
    if (step === 'branch') {
      setStep('reason')
      return
    }
    if (step === 'confirm') {
      setStep('branch')
      return
    }
    navigate(-1)
  })

  const booking = currentBooking
  const title = useMemo(() => {
    if (done?.branch === 'reschedule') return 'Reschedule requested'
    if (done) return 'Appointment cancelled'
    if (step === 'branch') return 'What next?'
    if (step === 'confirm') return 'Confirm'
    return 'Cancel appointment'
  }, [done, step])

  if (!booking && !done) return null

  const doctorName = booking?.doctor?.name || 'your provider'

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = cancelAppointmentWithReason?.(
        booking?.engineId || booking?.id || bookingId,
        {
          reason: selectedReason,
          branch,
          note: note.trim() || null,
          payload: { ui: 'cancel_appointment' },
        },
      )
      if (!result) {
        setError('Could not update this appointment. Check your connection and try again.')
        setSubmitting(false)
        return
      }
      setDone({ branch, reason: selectedReason })
      if (branch === 'reschedule') {
        navigate('/reschedule', {
          replace: true,
          state: {
            bookingId: booking?.engineId || booking?.id || bookingId,
            origin: 'cancel-appointment',
          },
        })
        return
      }
      if (branch === 'contact') {
        navigate('/appointment', {
          replace: true,
          state: {
            bookingId: booking?.engineId || booking?.id || bookingId,
            origin: 'cancel-appointment',
            focus: 'contact',
          },
        })
        return
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done && done.branch !== 'reschedule' && done.branch !== 'contact') {
    return (
      <div className="ccancel-page">
        <div className="ccancel-header-bar">
          <button type="button" className="ccancel-back-btn" onClick={goBack} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="ccancel-header-title">{title}</h1>
          <div className="ccancel-menu-btn" aria-hidden="true" />
        </div>
        <div className="ccancel-body">
          <div className="ccancel-confirmed-banner" role="status">
            <div className="ccancel-confirmed-title">
              {done.branch === 'refund' ? 'Cancellation recorded' : 'Appointment cancelled'}
            </div>
            <p className="ccancel-confirmed-text">
              {doctorName} was notified. The appointment slot was released.
              {done.branch === 'refund'
                ? ' Billing will review any eligible refund.'
                : ''}
            </p>
          </div>
          <div className="ccancel-next-card">
            <div className="ccancel-next-label">Reason</div>
            <div className="ccancel-next-detail">{done.reason}</div>
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
        <h1 className="ccancel-header-title">{title}</h1>
        <div className="ccancel-menu-btn" aria-hidden="true" />
      </div>

      <div className="ccancel-body">
        {step === 'reason' ? (
          <>
            <p className="ccancel-info-banner-text">
              Tell us why you need to change this visit with {doctorName}. Your provider is notified and the slot is released when you confirm.
            </p>
            <div className="ccancel-reasons" role="radiogroup" aria-label="Cancellation reason">
              {CANCEL_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  className={`ccancel-reason-item${selectedReason === reason ? ' is-selected' : ''}`}
                  onClick={() => setSelectedReason(reason)}
                  aria-pressed={selectedReason === reason}
                >
                  <span className="ccancel-reason-text">{reason}</span>
                  <span className={`ccancel-radio${selectedReason === reason ? ' selected' : ''}`} aria-hidden="true">
                    {selectedReason === reason ? <span className="ccancel-radio-inner" /> : null}
                  </span>
                </button>
              ))}
            </div>
            <label className="ccancel-note-label" htmlFor="cancel-note">
              Add a note (optional)
            </label>
            <textarea
              id="cancel-note"
              className="ccancel-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the clinic should know"
            />
          </>
        ) : null}

        {step === 'branch' ? (
          <div className="ccancel-reasons" role="radiogroup" aria-label="Next step">
            {BRANCHES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`ccancel-reason-item${branch === item.id ? ' is-selected' : ''}`}
                onClick={() => setBranch(item.id)}
                aria-pressed={branch === item.id}
              >
                <span>
                  <span className="ccancel-reason-text">{item.label}</span>
                  <span className="ccancel-next-detail" style={{ display: 'block' }}>{item.detail}</span>
                </span>
                <span className={`ccancel-radio${branch === item.id ? ' selected' : ''}`} aria-hidden="true">
                  {branch === item.id ? <span className="ccancel-radio-inner" /> : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 'confirm' ? (
          <div className="ccancel-next-card" role="region" aria-label="Confirm cancellation">
            <div className="ccancel-next-label">Reason</div>
            <div className="ccancel-next-detail">{selectedReason}</div>
            <div className="ccancel-next-label" style={{ marginTop: 'var(--space-3)' }}>Action</div>
            <div className="ccancel-next-detail">
              {BRANCHES.find((b) => b.id === branch)?.label || branch}
            </div>
            {note.trim() ? (
              <>
                <div className="ccancel-next-label" style={{ marginTop: 'var(--space-3)' }}>Note</div>
                <div className="ccancel-next-detail">{note.trim()}</div>
              </>
            ) : null}
            <p className="ccancel-info-banner-text" style={{ marginTop: 'var(--space-4)' }}>
              This updates Supabase as the source of truth, writes an immutable audit event, notifies the provider, and releases the appointment slot.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="ccancel-info-banner-text" role="alert" style={{ color: 'var(--danger, #b42318)' }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="ccancel-footer">
        {step === 'reason' ? (
          <button
            type="button"
            className="ccancel-confirm-btn"
            onClick={() => setStep('branch')}
          >
            Continue
          </button>
        ) : null}
        {step === 'branch' ? (
          <button
            type="button"
            className="ccancel-confirm-btn"
            onClick={() => setStep('confirm')}
          >
            Continue
          </button>
        ) : null}
        {step === 'confirm' ? (
          <button
            type="button"
            className="ccancel-confirm-btn"
            disabled={submitting}
            aria-busy={submitting}
            onClick={submit}
          >
            {submitting ? 'Saving…' : 'Confirm'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
