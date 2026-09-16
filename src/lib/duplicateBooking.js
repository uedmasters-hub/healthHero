import { toLegacyBooking } from '../booking/models'
import { displayDoctorName } from './geometry'

const CONFIRMED_VIEW_STATUSES = new Set([
  'confirmed',
  'upcoming',
  'checked_in',
  'booked',
])

const UNCONFIRMED_STATUSES = new Set([
  'draft',
  'pending_payment',
  'payment_processing',
  'payment_pending',
  'cancelled',
  'expired',
  'completed',
  'refunded',
  'no_show',
])

export function isConfirmedAppointment(booking) {
  if (!booking) return false
  if (booking.paymentPending) return false
  const paymentStatus = booking.payment?.status
  if (paymentStatus === 'pending' || paymentStatus === 'processing' || paymentStatus === 'failed') {
    return false
  }
  const status = booking.status
  if (UNCONFIRMED_STATUSES.has(status)) return false
  if (CONFIRMED_VIEW_STATUSES.has(status)) return true
  return paymentStatus === 'paid'
}

function bookingView(record) {
  if (!record) return null
  return record.schedule ? toLegacyBooking(record) : record
}

export function isDuplicateSelfBooking(doctorId, booking) {
  const view = bookingView(booking)
  if (!view?.doctor || doctorId == null) return false
  if (!isConfirmedAppointment(view)) return false
  if (Number(view.doctor.id) !== Number(doctorId)) return false
  const relationship = view.patient?.relationship || 'Self'
  return relationship === 'Self'
}

export function findDuplicateSelfBooking(doctorId, bookings = []) {
  if (doctorId == null) return null
  for (const record of bookings) {
    const view = bookingView(record)
    if (isDuplicateSelfBooking(doctorId, view)) return view
  }
  return null
}

export function formatBookingWhen(date, time) {
  const day = date?.full
    ? date.full.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : ''
  const clock = String(time || '').replace(/\b(am|pm)\b/gi, (part) => part.toUpperCase())
  if (day && clock) return `${day} at ${clock}`
  return day || clock
}

export function duplicateBookingCopy(booking) {
  const name = displayDoctorName(booking?.doctor?.name)
  const when = formatBookingWhen(booking?.date, booking?.time)
  return `You already have an upcoming appointment with ${name} on ${when}.`
}
