import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { usePushBack } from '../features/pushNav'
import { AppBar, Button, Card, Choice, ChoiceList, InfoCell, InfoGrid, ResultHero } from './ui'
import './CancelAppointment.css'
import { UnavailablePage } from './system'

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

  if (!booking && !done) return <UnavailablePage title="This appointment is no longer available" />

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
      <div className="ds-page">
        <AppBar title={title} onBack={goBack} />
        <div className="ds-page__body">
          <div role="status">
            <ResultHero
              tone="info"
              title={done.branch === 'refund' ? 'Cancellation recorded' : 'Appointment cancelled'}
              message={`${doctorName} was notified. The appointment slot was released.${done.branch === 'refund' ? ' Billing will review any eligible refund.' : ''}`}
            />
          </div>
          <Card padded>
            <InfoGrid single>
              <InfoCell label="Reason" value={done.reason} />
            </InfoGrid>
          </Card>
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
      <AppBar title={title} onBack={goBack} />

      <div className="ds-page__body">
        {step === 'reason' ? (
          <>
            <p className="ds-page__lead">
              Tell us why you need to change this visit with {doctorName}. Your provider is notified and the slot is released when you confirm.
            </p>
            <ChoiceList label="Cancellation reason">
              {CANCEL_REASONS.map((reason) => (
                <Choice
                  key={reason}
                  title={reason}
                  selected={selectedReason === reason}
                  onClick={() => setSelectedReason(reason)}
                />
              ))}
            </ChoiceList>
            <div>
              <label className="ds-field-label" htmlFor="cancel-note">
                Add a note (optional)
              </label>
              <textarea
                id="cancel-note"
                className="ds-field is-multiline"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything the clinic should know"
              />
            </div>
          </>
        ) : null}

        {step === 'branch' ? (
          <ChoiceList label="Next step">
            {BRANCHES.map((item) => (
              <Choice
                key={item.id}
                title={item.label}
                subtitle={item.detail}
                selected={branch === item.id}
                onClick={() => setBranch(item.id)}
              />
            ))}
          </ChoiceList>
        ) : null}

        {step === 'confirm' ? (
          <Card padded role="region" aria-label="Confirm cancellation">
            <InfoGrid single>
              <InfoCell label="Reason" value={selectedReason} />
              <InfoCell label="Action" value={BRANCHES.find((b) => b.id === branch)?.label || branch} />
              {note.trim() ? <InfoCell label="Note" value={note.trim()} /> : null}
            </InfoGrid>
            <p className="ds-page__lead cancel-confirm-copy">
              This updates Supabase as the source of truth, writes an immutable audit event, notifies the provider, and releases the appointment slot.
            </p>
          </Card>
        ) : null}

        {error ? (
          <p className="ds-page__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="ds-page__footer">
        {step === 'reason' ? (
          <Button size="lg" block onClick={() => setStep('branch')}>
            Continue
          </Button>
        ) : null}
        {step === 'branch' ? (
          <Button size="lg" block onClick={() => setStep('confirm')}>
            Continue
          </Button>
        ) : null}
        {step === 'confirm' ? (
          <Button
            size="lg"
            block
            disabled={submitting}
            loading={submitting}
            onClick={submit}
          >
            {submitting ? 'Saving…' : 'Confirm'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
