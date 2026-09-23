/**
 * Reactive selectors over the Booking Engine store.
 * Screens should prefer these hooks over copying booking objects into route state.
 */

import { useMemo } from 'react'
import { useBooking } from './BookingProvider'
import { toLegacyBooking } from './models'
import {
  selectActive,
  selectById,
  selectCareHistory,
  selectHomeCarouselLegacy,
  selectHomeSurface,
  selectLiveAppointment,
  selectTreatGroups,
} from './selectors'
import { HOME_CAROUSEL_LIMIT } from './serviceTypes'

/** Full engine snapshot (bookings + activeBookingId) — already reactive via provider. */
export function useBookingStore() {
  const { bookings, activeBookingId, hydrated, engine } = useBooking()
  return useMemo(
    () => ({
      bookings,
      activeBookingId,
      hydrated,
      engine,
      state: { bookings, activeBookingId },
    }),
    [bookings, activeBookingId, hydrated, engine],
  )
}

/** Subscribe to one booking by stable ID (legacy view model). */
export function useBookingById(bookingId) {
  const { bookings, engine } = useBooking()
  return useMemo(() => {
    if (!bookingId) return null
    const record = selectById({ bookings }, bookingId) || engine.getById(bookingId)
    return toLegacyBooking(record)
  }, [bookings, bookingId, engine])
}

/** Focused / active booking — management screens should use this, not "newest home". */
export function useActiveBooking() {
  const { bookings, activeBookingId } = useBooking()
  return useMemo(() => {
    const record = selectActive({ bookings, activeBookingId })
    return toLegacyBooking(record)
  }, [bookings, activeBookingId])
}

/** Homepage carousel — future upcoming only (legacy view models). */
export function useHomeCarousel(limit = HOME_CAROUSEL_LIMIT) {
  const { bookings, activeBookingId } = useBooking()
  return useMemo(
    () => selectHomeCarouselLegacy({ bookings, activeBookingId }, limit),
    [bookings, activeBookingId, limit],
  )
}

/** Singular Home hero surface (phase + booking). */
export function useHomeSurface(now = Date.now()) {
  const { bookings, activeBookingId } = useBooking()
  return useMemo(() => {
    const surface = selectHomeSurface({ bookings, activeBookingId }, new Date(now))
    if (!surface) return null
    return {
      phase: surface.phase,
      booking: toLegacyBooking(surface.record),
      bounds: surface.bounds,
    }
  }, [bookings, activeBookingId, now])
}

/** Treat grouped history from the same store. */
export function useTreatGroups(now = Date.now()) {
  const { bookings, activeBookingId } = useBooking()
  return useMemo(
    () => selectTreatGroups({ bookings, activeBookingId }, new Date(now)),
    [bookings, activeBookingId, now],
  )
}

/** Live / imminent appointment for Treat hero (null when not applicable). */
export function useLiveAppointment(now = Date.now()) {
  const { bookings, activeBookingId } = useBooking()
  return useMemo(
    () => selectLiveAppointment({ bookings, activeBookingId }, new Date(now)),
    [bookings, activeBookingId, now],
  )
}

/** Care History rows from the engine, with Active/Upcoming/Completed/Cancelled tabs. */
export function useCareHistory(now = Date.now()) {
  const { bookings, activeBookingId } = useBooking()
  return useMemo(
    () => selectCareHistory({ bookings, activeBookingId }, new Date(now)),
    [bookings, activeBookingId, now],
  )
}

/** Resolve bookingId from route state, falling back to active. */
export function useRouteBookingId(locationState) {
  const { activeBookingId } = useBooking()
  return locationState?.bookingId || locationState?.booking?.engineId || locationState?.booking?.id || activeBookingId || null
}
