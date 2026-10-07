import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { VISIT_TYPES, generateDates } from './DatePicker'
import WeeklySchedule from './WeeklySchedule'
import useNow from '../hooks/useNow'
import { getSlotWindow } from '../lib/bookingPolicy'
import { getAppointmentActions, resolveAppointmentPath } from '../lib/appointmentJourney'
import { formatMoney } from '../lib/paymentSession'
import DoctorCard from './DoctorCard'
import { AppBar, Badge, Card, Icon, IconButton, InfoCell, InfoGrid, List, ListRow, SectionHead } from './ui'
import './RescheduleAppointment.css'
import { UnavailablePage } from './system'

export default function RescheduleAppointment() {
  const navigate = useNavigate()
  const now = useNow(15000)
  const { currentBooking, setCurrentBooking } = useBooking()
  const [selectedDate, setSelectedDate] = useState(() => generateDates({ count: 7, offset: 0 })[0])
  const [visitType, setVisitType] = useState('In-Person')
  const [duration] = useState('30')
  const [selectedTime, setSelectedTime] = useState(null)

  if (!currentBooking) {
    return <UnavailablePage title="This appointment is no longer available" />
  }

  const { doctor, date, time, visitType: origVisitType } = currentBooking
  const actions = getAppointmentActions(currentBooking, now, { surface: 'details' })

  if (!actions.canReschedule) {
    navigate(resolveAppointmentPath(currentBooking), { replace: true })
    return null
  }

  const oldDateStr = date.full.toLocaleDateString('en-NP', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return
    const newDateStr = selectedDate.full.toLocaleDateString('en-NP', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    const [timePart, modifier] = selectedTime.split(' ')
    let [hours, minutes] = timePart.split(':')
    hours = parseInt(hours)
    const durMins = parseInt(duration) || 30
    let endHours = hours
    let endMins = parseInt(minutes) + durMins
    if (endMins >= 60) { endHours += 1; endMins -= 60 }
    const endModifier = endHours >= 12 ? 'PM' : 'AM'
    if (endHours > 12) endHours -= 12
    if (endHours === 0) endHours = 12
    const newTimeRange = `${selectedTime} - ${endHours}:${String(endMins).padStart(2, '0')} ${endModifier}`

    const slotWindow = getSlotWindow(selectedDate, selectedTime, now)
    if (slotWindow.isPast) return

    navigate('/confirm-reschedule', {
      state: {
        oldDate: oldDateStr,
        oldTime: time,
        newDate: newDateStr,
        newTime: selectedTime,
        newTimeRange,
        visitType,
        duration,
        rescheduleFee: 150,
        consultationFee: doctor.fee || 1200,
        insuranceCoverage: 200,
        paymentMethod: 'eSewa · 9845271970',
        bookingMode: slotWindow.mode,
      }
    })
  }

  const slotMeta = (slot) => {
    const window = getSlotWindow(selectedDate, slot, now)
    return { disabled: window.isPast, quick: window.isQuickBook }
  }

  const visitTypeItems = VISIT_TYPES.filter(
    (item) => !doctor?.visitTypes?.length || doctor.visitTypes.includes(item.id),
  )

  return (
    <div className="ds-page rsch-page">
      <AppBar
        title="Reschedule Appointment"
        onBack={() => navigate(-1)}
        actions={(
          <IconButton label="More options" className="is-muted">
            <Icon.More />
          </IconButton>
        )}
      />

      <div className="ds-page__body has-fixed-footer rsch-body">
        <Card padded="lg">
          <div className="ds-card__head">
            <h3 className="ds-card__title">Your appointment</h3>
            <Badge tone="info">{doctor.specialty}</Badge>
          </div>
          <DoctorCard doctor={doctor} context="identity" disableNavigate />
          <InfoGrid className="ds-card__section">
            <InfoCell icon={<Icon.Calendar />} label="Date" value={oldDateStr} />
            <InfoCell icon={<Icon.Clock />} label="Time" value={time} />
            <InfoCell icon={<Icon.User />} label="Type" value={`${origVisitType || 'In-Person'} Visit`} />
            <InfoCell icon={<Icon.Pin />} label="Location" value={doctor.address} />
          </InfoGrid>
        </Card>

        <p className="ds-page__lead">Your current appointment is reserved until you confirm a new time.</p>

        <Card padded="lg">
          <div className="ds-card__head">
            <h3 className="ds-card__title rsch-policy-title">
              <Icon.Calendar />
              Reschedule Policy
            </h3>
            <button type="button" className="ds-link">View Policy</button>
          </div>
          <div className="ds-stack is-tight">
            <div className="ds-kv">
              <span className="ds-kv__key">Reschedule Fee</span>
              <span className="ds-kv__value">{formatMoney(150)}</span>
            </div>
            <div className="ds-kv">
              <span className="ds-kv__key">Payment Method</span>
              <span className="ds-kv__value">eSewa · 9845271970</span>
            </div>
          </div>
          <p className="rsch-policy-note">You'll only be charged after confirming the new time.</p>
        </Card>

        <SectionHead as="h3" title="Select new date & time" className="rsch-section-head" />
        <WeeklySchedule
          doctorId={doctor.providerUuid || doctor.id}
          visitType={visitType}
          onVisitTypeChange={setVisitType}
          visitTypeItems={visitTypeItems}
          selectedDate={selectedDate}
          onDateChange={(next) => { setSelectedDate(next); setSelectedTime(null) }}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          getMeta={slotMeta}
        />

        <List className="rsch-links">
          <ListRow as="div" title="Contact Clinic" chevron />
          <ListRow as="div" title="Join Waitlist" chevron />
          <ListRow
            danger
            title="Cancel Appointment"
            onClick={() => {
              if (!actions.canCancelAppointment) return
              setCurrentBooking(null)
              navigate('/treat', { replace: true })
            }}
          />
        </List>
      </div>

      <div className="sticky-footer-cta">
        <button
          type="button"
          className="sticky-footer-cta__primary"
          disabled={!selectedDate || !selectedTime}
          onClick={handleConfirm}
        >
          Confirm New Time
        </button>
      </div>
    </div>
  )
}
