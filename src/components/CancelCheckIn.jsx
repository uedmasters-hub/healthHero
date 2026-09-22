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
import './CancelCheckIn.css'

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

  if (!currentBooking) return null

  const actions = getAppointmentActions(currentBooking, now, { surface: 'ready' })
  if (!actions.canCancelCheckIn && !confirmed) return null

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
      <div className="ccancel-page">
        <div className="ccancel-header-bar">
          <button className="ccancel-back-btn" onClick={() => navigate(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="ccancel-header-title">Cancel Check-In</h1>
          <button className="ccancel-menu-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>

        <div className="ccancel-body">
          <div className="ccancel-confirmed-banner">
            <div className="ccancel-confirmed-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="ccancel-confirmed-title">Check-In Canceled</h2>
            <div className="ccancel-confirmed-sub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Your appointment is still confirmed
            </div>
          </div>

          <div className="ccancel-card">
            <div className="ccancel-card-header">
              <h3 className="ccancel-card-title">Your appointment</h3>
              <span className="ccancel-specialty-badge">{doctor.specialty}</span>
            </div>
            <div className="ccancel-doctor-row">
              <div className="ccancel-doctor-avatar" style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}dd)` }}>
                {doctor.initial}
              </div>
              <div className="ccancel-doctor-info">
                <div className="ccancel-doctor-name">Dr. {doctor.name}</div>
                <div className="ccancel-doctor-specialty">{doctor.specialty}</div>
              </div>
              <div className="ccancel-doctor-rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--rating)">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {doctor.rating}
              </div>
            </div>
            <div className="ccancel-info-grid">
              <div className="ccancel-info-cell">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div>
                  <div className="ccancel-info-label">DATE</div>
                  <div className="ccancel-info-value">{dateStr}</div>
                </div>
              </div>
              <div className="ccancel-info-cell">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <div className="ccancel-info-label">TIME</div>
                  <div className="ccancel-info-value">{formatTimeRange()}</div>
                </div>
              </div>
              <div className="ccancel-info-cell">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <div>
                  <div className="ccancel-info-label">TYPE</div>
                  <div className="ccancel-info-value">{visitType || 'In-Person'} Visit</div>
                </div>
              </div>
              <div className="ccancel-info-cell">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <div className="ccancel-info-label">LOCATION</div>
                  <div className="ccancel-info-value">{doctor.address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ccancel-card">
            <h3 className="ccancel-card-title">What's next</h3>
            <div className="ccancel-next-steps">
              <div className="ccancel-next-step">
                <div className="ccancel-next-step-left">
                  <div className="ccancel-next-icon active">1</div>
                  <div className="ccancel-next-line" />
                </div>
                <div className="ccancel-next-info">
                  <div className="ccancel-next-label">Check in again anytime</div>
                  <div className="ccancel-next-detail">You can easily restart pre-visit check-in through this app.</div>
                </div>
              </div>
              <div className="ccancel-next-step">
                <div className="ccancel-next-step-left">
                  <div className="ccancel-next-icon">2</div>
                  <div className="ccancel-next-line" />
                </div>
                <div className="ccancel-next-info">
                  <div className="ccancel-next-label">Arrive 15 minutes early</div>
                  <div className="ccancel-next-detail">Since you'll register in person, please allow extra time.</div>
                </div>
              </div>
              <div className="ccancel-next-step last">
                <div className="ccancel-next-step-left">
                  <div className="ccancel-next-icon">3</div>
                </div>
                <div className="ccancel-next-info">
                  <div className="ccancel-next-label">Front desk check-in</div>
                  <div className="ccancel-next-detail">Present citizenship ID or photo ID and your health insurance card upon arrival.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ccancel-card">
            <h3 className="ccancel-card-title">Need help?</h3>
            <div className="ccancel-help-list">
              <button className="ccancel-help-item" onClick={() => navigate('/reschedule')}>
                <span>Reschedule Appointment</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="ccancel-help-item">
                <span>Contact Clinic</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="ccancel-bottom-bar">
              <button className="ccancel-keep-btn" onClick={() => navigate(resumePath, { replace: true })}>Back to Appointment</button>
          <button className="ccancel-recheckin-link" onClick={() => navigate(resumePath, { replace: true })}>Check In Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ccancel-page">
      <div className="ccancel-header-bar">
        <button className="ccancel-back-btn" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="ccancel-header-title">Cancel Check-In</h1>
        <button className="ccancel-menu-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      <div className="ccancel-body">
        <div className="ccancel-info-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div>
            <h3 className="ccancel-info-banner-title">Your Appointment is Secure</h3>
            <p className="ccancel-info-banner-text">Canceling this pre-visit check-in does not cancel your scheduled appointment. It only clears your current pre-registration details.</p>
          </div>
        </div>

        <div className="ccancel-card">
          <div className="ccancel-card-header">
            <h3 className="ccancel-card-title">Your appointment</h3>
            <span className="ccancel-specialty-badge">{doctor.specialty}</span>
          </div>
          <div className="ccancel-doctor-row">
            <div className="ccancel-doctor-avatar" style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}dd)` }}>
              {doctor.initial}
            </div>
            <div className="ccancel-doctor-info">
              <div className="ccancel-doctor-name">Dr. {doctor.name}</div>
              <div className="ccancel-doctor-specialty">{doctor.specialty}</div>
            </div>
            <div className="ccancel-doctor-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--rating)">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {doctor.rating}
            </div>
          </div>
          <div className="ccancel-info-grid">
            <div className="ccancel-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div>
                <div className="ccancel-info-label">DATE</div>
                <div className="ccancel-info-value">{dateStr}</div>
              </div>
            </div>
            <div className="ccancel-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="ccancel-info-label">TIME</div>
                <div className="ccancel-info-value">{formatTimeRange()}</div>
              </div>
            </div>
            <div className="ccancel-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div>
                <div className="ccancel-info-label">TYPE</div>
                <div className="ccancel-info-value">{visitType || 'In-Person'} Visit</div>
              </div>
            </div>
            <div className="ccancel-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <div className="ccancel-info-label">LOCATION</div>
                <div className="ccancel-info-value">{doctor.address}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ccancel-card">
          <h3 className="ccancel-card-title">Why are you canceling?</h3>
          <div className="ccancel-reasons">
            {reasons.map((reason, i) => (
              <div key={i}>
                <div className="ccancel-reason-item" onClick={() => setSelectedReason(reason)}>
                  <span className="ccancel-reason-text">{reason}</span>
                  <div className={`ccancel-radio ${selectedReason === reason ? 'selected' : ''}`}>
                    {selectedReason === reason && <div className="ccancel-radio-inner" />}
                  </div>
                </div>
                {i < reasons.length - 1 && <div className="ccancel-divider" />}
              </div>
            ))}
          </div>
          {selectedReason === 'Other' && (
            <div className="ccancel-note-wrap">
              <textarea
                className="ccancel-note-input"
                placeholder="Add a note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="ccancel-hint">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="ccancel-hint-text">Good to know: You can easily check in again anytime before the visit starts.</p>
        </div>
      </div>

      <div className="ccancel-bottom-bar">
        <button className="ccancel-cancel-btn" onClick={handleCancel}>Cancel Pre-Visit Check-In</button>
        <button className="ccancel-keep-btn" onClick={() => navigate(-1)}>Keep My Check-In</button>
      </div>
    </div>
  )
}
