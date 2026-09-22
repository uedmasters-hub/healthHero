import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { VISIT_TYPES, makeDateValue } from './DatePicker'
import WeeklySchedule from './WeeklySchedule'
import DoctorCard from './DoctorCard'
import { BookingReveal, DoctorHeroSkeleton, useBookingReveal } from './BookingReveal'
import useNow from '../hooks/useNow'
import { getSlotWindow } from '../lib/bookingPolicy'
import { resolveVisitType } from '../lib/serviceActions'
import { flowState } from '../lib/careFlow'
import './SelectSlot.css'

export default function SelectSlot() {
  const navigate = useNavigate()
  const location = useLocation()
  // Freeze entry state so this layer stays correct while mounted as a push underlay.
  const [entry] = useState(() => location.state || {})
  const doctor = entry.doctor
  const origin = entry.origin
  const returnTo = entry.returnTo
  const now = useNow(15000)

  const [selectedDate, setSelectedDate] = useState(() => entry.date || makeDateValue())
  const [visitType, setVisitType] = useState(() => resolveVisitType(
    entry.visitType || entry.preferredVisitType,
    entry.doctor?.visitTypes,
  ))
  const [duration] = useState(entry.duration || '30 min')
  const [selectedTime, setSelectedTime] = useState(entry.time || null)

  const slotMeta = (slot) => {
    const window = getSlotWindow(selectedDate, slot, now)
    return {
      disabled: window.isPast,
      quick: window.isQuickBook,
    }
  }

  const selectedWindow = selectedTime ? getSlotWindow(selectedDate, selectedTime, now) : null
  const ready = useBookingReveal(`slot:${doctor?.id || 'none'}`, Boolean(doctor))

  const visitTypeItems = VISIT_TYPES.filter(
    (item) => !doctor?.visitTypes?.length || doctor.visitTypes.includes(item.id),
  )

  const handleContinue = () => {
    if (!selectedTime || selectedWindow?.isPast) return
    navigate('/booking/patient', {
      state: flowState(entry, {
        doctor,
        date: selectedDate,
        time: selectedTime,
        visitType,
        duration,
        origin,
        returnTo,
        bookingMode: selectedWindow?.mode || 'standard',
        preferredVisitType: entry.preferredVisitType || visitType,
        forSomeoneElse: entry.forSomeoneElse,
      }),
    })
  }

  if (!doctor) {
    return null
  }

  return (
    <div className="select-slot">
      <div className="select-slot-scroll">
        <BookingReveal
          ready={ready}
          skeleton={(
            <>
              <div className="booking-hero">
                <DoctorHeroSkeleton />
              </div>
              <div className="booking-skel-strip shimmer" />
              <div className="slot-section">
                <div className="booking-skel-label shimmer" />
                <div className="booking-skel-chips">
                  <span className="booking-skel-chip shimmer" />
                  <span className="booking-skel-chip shimmer" />
                </div>
              </div>
              {[0, 1, 2].map((group) => (
                <div className="slot-section" key={group}>
                  <div className="booking-skel-label shimmer" />
                  <div className="booking-skel-grid is-slots">
                    <span className="booking-skel-slot shimmer" />
                    <span className="booking-skel-slot shimmer" />
                    <span className="booking-skel-slot shimmer" />
                  </div>
                </div>
              ))}
            </>
          )}
        >
          <div className="booking-hero">
            <DoctorCard doctor={doctor} variant="profile" disableNavigate />
          </div>

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
        </BookingReveal>
      </div>

      <div className="app-flow-footer">
        <button className="app-flow-cta" disabled={!ready || !selectedTime} onClick={handleContinue}>
          Continue
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
