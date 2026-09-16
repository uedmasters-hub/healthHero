import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DuplicateBookingModal from '../components/DuplicateBookingModal'
import { useBooking } from '../components/BookingContext'
import { findDuplicateSelfBooking } from '../lib/duplicateBooking'
import { resolveAppointmentPath } from '../lib/appointmentJourney'

export default function useDuplicateBookingGuard() {
  const { bookings } = useBooking()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)

  const guard = (doctor, start, extras = {}) => {
    if (extras.forSomeoneElse) {
      start({ forSomeoneElse: true })
      return true
    }
    const duplicate = findDuplicateSelfBooking(doctor?.id, bookings)
    if (duplicate) {
      setPending({ start, booking: duplicate })
      return false
    }
    start({ forSomeoneElse: false })
    return true
  }

  const modal = (
    <DuplicateBookingModal
      booking={pending?.booking || null}
      onClose={() => setPending(null)}
      onView={() => {
        const booking = pending?.booking
        setPending(null)
        if (booking) navigate(resolveAppointmentPath(booking))
      }}
      onBookSomeoneElse={() => {
        const start = pending?.start
        setPending(null)
        start?.({ forSomeoneElse: true })
      }}
    />
  )

  return { guard, modal, currentBooking: pending?.booking || null }
}
