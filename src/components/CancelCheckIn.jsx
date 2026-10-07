import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import useNow from '../hooks/useNow'
import {
  APPOINTMENT_STATUS,
  getAppointmentActions,
  resolveAppointmentPath,
  withBookingStatus,
} from '../lib/appointmentJourney'
import DoctorCard from './DoctorCard'
import { AppBar, Badge, Button, Callout, Card, Choice, ChoiceList, Icon, IconButton, InfoCell, InfoGrid, List, ListRow, ResultHero, Steps } from './ui'
import { RedirectingPage, UnavailablePage } from './system'

const reasons = [
  "I'll check in when I arrive",
  'Need to reschedule',
  'Checked in by mistake',
  'Other',
]

export default function CancelCheckIn() {
  const navigate = useNavigate()
  const now = useNow(15000)
  const { currentBooking, setCurrentBooking, cancelCheckIn } = useBooking()
  const [selectedReason, setSelectedReason] = useState(reasons[0])
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!currentBooking) {
      navigate('/', { replace: true })
      return
    }
    const next = getAppointmentActions(currentBooking, now, { surface: 'ready' })
    if (!next.canCancelCheckIn) {
      navigate(resolveAppointmentPath(currentBooking), { replace: true })
    }
  }, [currentBooking, now, navigate])

  if (!currentBooking) return <UnavailablePage title="This check-in is no longer available" />

  const actions = getAppointmentActions(currentBooking, now, { surface: 'ready' })
  if (!actions.canCancelCheckIn && !confirmed) return <RedirectingPage title="Opening your appointment" />

  const { doctor, date, time, visitType, duration } = currentBooking

  const dateStr = date.full.toLocaleDateString('en-NP', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const formatTimeRange = () => {
    const [timePart, modifier] = time.split(' ')
    let [hours, minutes] = timePart.split(':')
    hours = parseInt(hours)
    const durMins = parseInt(duration) || 30
    let endHours = hours
    let endMins = parseInt(minutes) + durMins
    if (endMins >= 60) {
      endHours += 1
      endMins -= 60
    }
    const endModifier = endHours >= 12 ? 'PM' : 'AM'
    if (endHours > 12) endHours -= 12
    if (endHours === 0) endHours = 12
    return `${time} - ${endHours}:${String(endMins).padStart(2, '0')} ${endModifier}`
  }

  const handleCancel = () => {
    cancelCheckIn(currentBooking?.engineId || currentBooking?.id)
    setConfirmed(true)
  }

  const resumePath = resolveAppointmentPath(
    withBookingStatus(currentBooking, APPOINTMENT_STATUS.BOOKED),
  )

  if (confirmed) {
    return (
      <div className="ds-page">
        <AppBar
          title="Cancel Check-In"
          onBack={() => navigate(-1)}
          actions={(
            <IconButton label="More options" className="is-muted">
              <Icon.More />
            </IconButton>
          )}
        />

        <div className="ds-page__body">
          <ResultHero title="Check-In Canceled" message="Your appointment is still confirmed." />

          <Card padded="lg">
            <div className="ds-card__head">
              <h3 className="ds-card__title">Your appointment</h3>
              <Badge tone="info">{doctor.specialty}</Badge>
            </div>
            <DoctorCard doctor={doctor} context="identity" disableNavigate />
            <InfoGrid className="ds-card__section">
              <InfoCell icon={<Icon.Calendar />} label="Date" value={dateStr} />
              <InfoCell icon={<Icon.Clock />} label="Time" value={formatTimeRange()} />
              <InfoCell icon={<Icon.User />} label="Type" value={`${visitType || 'In-Person'} Visit`} />
              <InfoCell icon={<Icon.Pin />} label="Location" value={doctor.address} />
            </InfoGrid>
          </Card>

          <Card padded="lg">
            <h3 className="ds-card__title">What&apos;s next</h3>
            <Steps
              items={[
                { state: 'active', title: 'Check in again anytime', body: 'You can easily restart pre-visit check-in through this app.' },
                { title: 'Arrive 15 minutes early', body: "Since you'll register in person, please allow extra time." },
                { title: 'Front desk check-in', body: 'Present citizenship ID or photo ID and your health insurance card upon arrival.' },
              ]}
            />
          </Card>

          <section className="ds-stack is-tight" aria-label="Need help?">
            <h3 className="ds-section-title">Need help?</h3>
            <List>
              <ListRow title="Reschedule Appointment" onClick={() => navigate('/reschedule')} />
              <ListRow title="Contact Clinic" onClick={() => {}} />
            </List>
          </section>
        </div>

        <div className="ds-page__footer">
          <Button size="lg" block onClick={() => navigate(resumePath, { replace: true })}>
            Back to Appointment
          </Button>
          <button type="button" className="sticky-footer-cta__secondary" onClick={() => navigate(resumePath, { replace: true })}>
            Check In Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ds-page">
      <AppBar
        title="Cancel Check-In"
        onBack={() => navigate(-1)}
        actions={(
          <IconButton label="More options" className="is-muted">
            <Icon.More />
          </IconButton>
        )}
      />

      <div className="ds-page__body">
        <Callout icon={<Icon.Clock />} title="Your Appointment is Secure">
          Canceling this pre-visit check-in does not cancel your scheduled appointment. It only clears your current pre-registration details.
        </Callout>

        <Card padded="lg">
          <div className="ds-card__head">
            <h3 className="ds-card__title">Your appointment</h3>
            <Badge tone="info">{doctor.specialty}</Badge>
          </div>
          <DoctorCard doctor={doctor} context="identity" disableNavigate />
          <InfoGrid className="ds-card__section">
            <InfoCell icon={<Icon.Calendar />} label="Date" value={dateStr} />
            <InfoCell icon={<Icon.Clock />} label="Time" value={formatTimeRange()} />
            <InfoCell icon={<Icon.User />} label="Type" value={`${visitType || 'In-Person'} Visit`} />
            <InfoCell icon={<Icon.Pin />} label="Location" value={doctor.address} />
          </InfoGrid>
        </Card>

        <section className="ds-stack is-tight">
          <h3 className="ds-section-title">Why are you canceling?</h3>
          <ChoiceList label="Why are you canceling?">
            {reasons.map((reason) => (
              <Choice
                key={reason}
                title={reason}
                selected={selectedReason === reason}
                onClick={() => setSelectedReason(reason)}
              />
            ))}
          </ChoiceList>
          {selectedReason === 'Other' && (
            <textarea
              className="ds-field is-multiline"
              aria-label="Add a note"
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          )}
        </section>

        <Callout icon={<Icon.Calendar />} tone="neutral">
          Good to know: You can easily check in again anytime before the visit starts.
        </Callout>
      </div>

      <div className="ds-page__footer">
        <Button size="lg" variant="danger" block onClick={handleCancel}>Cancel Pre-Visit Check-In</Button>
        <button type="button" className="sticky-footer-cta__secondary" onClick={() => navigate(-1)}>Keep My Check-In</button>
      </div>
    </div>
  )
}
