import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { useBookingById, useRouteBookingId } from '../booking'
import { resolveAppointmentPath } from '../lib/appointmentJourney'
import { formatMoney } from '../lib/paymentSession'
import DoctorCard from './DoctorCard'
import StickyFooterCta from './StickyFooterCta'
import { AppBar, Badge, Callout, Card, InfoCell, InfoGrid, ResultHero } from './ui'
import './RescheduleSuccess.css'
import { UnavailablePage } from './system'

export default function RescheduleSuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentBooking, completeReschedule, focusBooking } = useBooking()
  const bookingId = useRouteBookingId(location.state)
  const bookingFromStore = useBookingById(bookingId)
  const current = bookingFromStore || currentBooking
  const { amount, appointmentData } = location.state || {}
  const appliedRef = useRef(false)

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  useEffect(() => {
    if (!appointmentData || !current || appliedRef.current) return
    const history = current.rescheduleHistory || current.meta?.rescheduleHistory || []
    const already = history.some(
      (entry) => entry?.newTime === appointmentData.newTime && entry?.oldTime === appointmentData.oldTime,
    )
    if (!already) {
      completeReschedule?.(
        { amount, draftBooking: current },
        appointmentData,
      )
    }
    appliedRef.current = true
  }, [appointmentData, amount, completeReschedule, current])

  if (!current || !appointmentData) {
    return <UnavailablePage title="This reschedule is already complete" />
  }

  const { doctor } = current
  const { oldDate, oldTime, newDate, newTime, newTimeRange, visitType, duration } = appointmentData
  const newWhen = newTimeRange || `${newDate || ''} ${newTime || ''}`.trim()

  const handleDone = () => {
    navigate('/')
  }

  const handleViewAppointment = () => {
    navigate(resolveAppointmentPath(current), {
      replace: true,
      state: { bookingId: current.engineId || current.id },
    })
  }

  return (
    <div className="ds-page rsucc-page">
      <AppBar title="Reschedule Confirmed" onBack={() => navigate(-1)} as="div" />

      <div className="ds-page__body has-fixed-footer">
        <ResultHero
          title="You're all set"
          message="Your appointment has been updated to the new time."
        />

        <Card padded="lg" className="rsucc-card">
          <div className="ds-card__head">
            <h3 className="ds-card__title">Updated visit</h3>
            <Badge tone="info">{doctor.specialty}</Badge>
          </div>

          <DoctorCard doctor={doctor} context="identity" disableNavigate />

          <div className="ds-card__section ds-stack is-tight">
            <div className="ds-kv">
              <span className="ds-kv__key">Previous</span>
              <span className="ds-kv__value is-struck">{oldDate} · {oldTime}</span>
            </div>
            <div className="ds-kv">
              <span className="ds-kv__key">New</span>
              <span className="ds-kv__value">{newWhen}</span>
            </div>
          </div>

          <InfoGrid className="ds-card__section">
            <InfoCell label="Type" value={visitType || 'In-Person'} />
            <InfoCell label="Duration" value={duration || '30 min'} />
          </InfoGrid>
        </Card>

        {amount != null ? (
          <Callout tone="success">Reschedule fee paid · {formatMoney(amount)}</Callout>
        ) : null}
      </div>

      <StickyFooterCta
        primaryLabel="Back to Home"
        onPrimary={handleDone}
        secondaryLabel="View Appointment"
        onSecondary={handleViewAppointment}
      />
    </div>
  )
}
