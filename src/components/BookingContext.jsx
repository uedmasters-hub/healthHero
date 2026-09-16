/**
 * Compatibility shim — all booking state ownership lives in src/booking.
 * Existing imports from './BookingContext' continue to work.
 */
export { BookingProvider, useBooking, useBookingEngine } from '../booking/BookingProvider'
