import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { useBookingById, useRouteBookingId } from '../booking'
import { resolveAppointmentPath } from '../lib/appointmentJourney'
import { formatMoney } from '../lib/paymentSession'
import './RescheduleSuccess.css'

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
    navigate('/')
    return null
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
    <div className="rsucc-page">
      <div className="rsucc-header-bar">
        <button type="button" className="rsucc-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="rsucc-header-title">Reschedule Confirmed</h1>
        <div className="rsucc-header-spacer" />
      </div>

      <div className="rsucc-body">
        <div className="rsucc-hero">
          <div className="rsucc-check-circle" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="rsucc-title">You&apos;re all set</h2>
          <p className="rsucc-subtitle">Your appointment has been updated to the new time.</p>
        </div>

        <div className="rsucc-card">
          <div className="rsucc-card-header">
            <h3 className="rsucc-card-title">Updated visit</h3>
            <span className="rsucc-specialty-badge">{doctor.specialty}</span>
          </div>

          <div className="rsucc-doctor-row">
            {doctor.photo ? (
              <img src={doctor.photo} alt="" className="rsucc-doctor-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="rsucc-doctor-avatar" style={{ background: 'var(--primary)' }}>
                {(doctor.name || 'D').charAt(0)}
              </div>
            )}
            <div className="rsucc-doctor-info">
              <div className="rsucc-doctor-name">{doctor.name}</div>
              <div className="rsucc-doctor-specialty">{doctor.specialty}</div>
            </div>
            {doctor.rating != null ? (
              <div className="rsucc-doctor-rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--rating)">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {doctor.rating}
              </div>
            ) : null}
          </div>

          <div className="rsucc-compare-row">
            <span className="rsucc-compare-label">Previous</span>
            <span className="rsucc-compare-old">{oldDate} · {oldTime}</span>
          </div>
          <div className="rsucc-compare-divider" />
          <div className="rsucc-compare-row">
            <span className="rsucc-compare-label">New</span>
            <span className="rsucc-compare-new">{newWhen}</span>
          </div>

          <div className="rsucc-info-grid">
            <div className="rsucc-info-cell">
              <div>
                <div className="rsucc-info-label">TYPE</div>
                <div className="rsucc-info-value">{visitType || 'In-Person'}</div>
              </div>
            </div>
            <div className="rsucc-info-cell">
              <div>
                <div className="rsucc-info-label">DURATION</div>
                <div className="rsucc-info-value">{duration || '30 min'}</div>
              </div>
            </div>
          </div>
        </div>

        {amount != null ? (
          <div className="rsucc-receipt">
            Reschedule fee paid · {formatMoney(amount)}
          </div>
        ) : null}
      </div>

      <div className="rsucc-bottom-bar">
        <button type="button" className="rsucc-done-btn" onClick={handleDone}>
          Back to Home
        </button>
        <button type="button" className="rsucc-appointment-link" onClick={handleViewAppointment}>
          View Appointment
        </button>
      </div>
    </div>
  )
}
