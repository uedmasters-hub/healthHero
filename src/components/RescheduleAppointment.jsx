import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { VISIT_TYPES, generateDates } from './DatePicker'
import WeeklySchedule from './WeeklySchedule'
import useNow from '../hooks/useNow'
import { getSlotWindow } from '../lib/bookingPolicy'
import { getAppointmentActions, resolveAppointmentPath } from '../lib/appointmentJourney'
import { formatMoney } from '../lib/paymentSession'
import './RescheduleAppointment.css'

export default function RescheduleAppointment() {
  const navigate = useNavigate()
  const now = useNow(15000)
  const { currentBooking, setCurrentBooking } = useBooking()
  const [selectedDate, setSelectedDate] = useState(() => generateDates({ count: 7, offset: 0 })[0])
  const [visitType, setVisitType] = useState('In-Person')
  const [duration] = useState('30')
  const [selectedTime, setSelectedTime] = useState(null)

  if (!currentBooking) {
    navigate('/')
    return null
  }

  const { doctor, date, time, visitType: origVisitType } = currentBooking
  const actions = getAppointmentActions(currentBooking, now, { surface: 'details' })

  if (!actions.canReschedule) {
    navigate(resolveAppointmentPath(currentBooking), { replace: true })
    return null
  }

  const oldDateStr = date.full.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return
    const newDateStr = selectedDate.full.toLocaleDateString('en-IN', {
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
        paymentMethod: 'UPI · ananya@okhdfcbank',
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
    <div className="rsch-page">
      <div className="rsch-header-bar">
        <button className="rsch-back-btn" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="rsch-header-title">Reschedule Appointment</h1>
        <button className="rsch-menu-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      <div className="rsch-body">
        <div className="rsch-card">
          <div className="rsch-card-header">
            <h3 className="rsch-card-title">Your appointment</h3>
            <span className="rsch-specialty-badge">{doctor.specialty}</span>
          </div>
          <div className="rsch-doctor-row">
            <div className="rsch-doctor-avatar" style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}dd)` }}>
              {doctor.initial}
            </div>
            <div className="rsch-doctor-info">
              <div className="rsch-doctor-name">Dr. {doctor.name}</div>
              <div className="rsch-doctor-specialty">{doctor.specialty}</div>
            </div>
            <div className="rsch-doctor-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--rating)">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {doctor.rating}
            </div>
          </div>
          <div className="rsch-info-grid">
            <div className="rsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div><div className="rsch-info-label">DATE</div><div className="rsch-info-value">{oldDateStr}</div></div>
            </div>
            <div className="rsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <div><div className="rsch-info-label">TIME</div><div className="rsch-info-value">{time}</div></div>
            </div>
            <div className="rsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <div><div className="rsch-info-label">TYPE</div><div className="rsch-info-value">{origVisitType || 'In-Person'} Visit</div></div>
            </div>
            <div className="rsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <div><div className="rsch-info-label">LOCATION</div><div className="rsch-info-value">{doctor.address}</div></div>
            </div>
          </div>
        </div>

        <p className="rsch-reserve-text">Your current appointment is reserved until you confirm a new time.</p>

        <div className="rsch-card">
          <div className="rsch-policy-header">
            <div className="rsch-policy-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Reschedule Policy
            </div>
            <button className="rsch-view-policy">View Policy</button>
          </div>
          <div className="rsch-policy-divider" />
          <div className="rsch-policy-row">
            <span className="rsch-policy-label">Reschedule Fee</span>
            <span className="rsch-policy-value">{formatMoney(150)}</span>
          </div>
          <div className="rsch-policy-row">
            <span className="rsch-policy-label">Payment Method</span>
            <span className="rsch-policy-value">UPI · ananya@okhdfcbank</span>
          </div>
          <p className="rsch-policy-note">You'll only be charged after confirming the new time.</p>
        </div>

        <h3 className="rsch-section-title">Select new date & time</h3>
        <WeeklySchedule
          doctorId={doctor.id}
          visitType={visitType}
          onVisitTypeChange={setVisitType}
          visitTypeItems={visitTypeItems}
          selectedDate={selectedDate}
          onDateChange={(next) => { setSelectedDate(next); setSelectedTime(null) }}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          getMeta={slotMeta}
        />

        <div className="rsch-links">
          <div className="rsch-link-row">
            <span>Contact Clinic</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
          <div className="rsch-link-row">
            <span>Join Waitlist</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
          <button
            type="button"
            className="rsch-link-row danger"
            onClick={() => {
              if (!actions.canCancelAppointment) return
              setCurrentBooking(null)
              navigate('/treat', { replace: true })
            }}
          >
            <span>Cancel Appointment</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      <div className="rsch-bottom-bar">
        <button className="rsch-confirm-btn" disabled={!selectedDate || !selectedTime} onClick={handleConfirm}>Confirm New Time</button>
      </div>
    </div>
  )
}
