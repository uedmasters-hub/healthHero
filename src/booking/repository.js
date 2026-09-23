/**
 * AppointmentRepository — in-memory store with optimistic write + rollback.
 * Booking UUIDs (client ids) are immutable after creation; callers must transition
 * status rather than deleting confirmed / checked-in / completed rows.
 */

import { appendHistory, createBookingRecord } from './models'
import { BOOKING_EVENT, BOOKING_STATUS } from './constants'

/** Statuses that must never be hard-deleted from the repository. */
export const IMMUTABLE_APPOINTMENT_STATUSES = Object.freeze([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.AWAITING_COMPLETION,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.RESCHEDULED,
  BOOKING_STATUS.NO_SHOW,
  BOOKING_STATUS.REFUNDED,
  'consultation_active',
])

export function createRepository(initial = { bookings: [], activeBookingId: null }) {
  let bookings = [...(initial.bookings || [])]
  let activeBookingId = initial.activeBookingId || null
  let cachedSnapshot = null
  const listeners = new Set()

  const snapshot = () => {
    if (!cachedSnapshot) {
      cachedSnapshot = {
        bookings,
        activeBookingId,
      }
    }
    return cachedSnapshot
  }

  const notify = () => {
    cachedSnapshot = {
      bookings: bookings.slice(),
      activeBookingId,
    }
    const state = cachedSnapshot
    listeners.forEach((fn) => {
      try {
        fn(state)
      } catch {
        /* ignore subscriber errors */
      }
    })
  }

  return {
    getState: snapshot,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getAll() {
      return bookings.slice()
    },

    getById(id) {
      return bookings.find((b) => b.id === id) || null
    },

    getActive() {
      if (!activeBookingId) return null
      return bookings.find((b) => b.id === activeBookingId) || null
    },

    setActive(id) {
      activeBookingId = id || null
      notify()
      return activeBookingId
    },

    /**
     * Optimistic upsert. Returns { record, rollback } for edge-case recovery.
     */
    upsert(partial, { event = BOOKING_EVENT.UPDATED, payload = {}, silent = false } = {}) {
      const existing = partial.id ? bookings.find((b) => b.id === partial.id) : null
      const prev = existing ? { ...existing } : null
      let record = existing
        ? {
          ...existing,
          ...partial,
          schedule: { ...existing.schedule, ...(partial.schedule || {}) },
          payment: { ...existing.payment, ...(partial.payment || {}) },
          doctor: partial.doctor || existing.doctor,
          patient: partial.patient || existing.patient,
          meta: { ...existing.meta, ...(partial.meta || {}), updatedAt: new Date().toISOString() },
        }
        : createBookingRecord(partial)

      if (event) record = appendHistory(record, event, payload)

      const idx = bookings.findIndex((b) => b.id === record.id)
      if (idx >= 0) bookings = [...bookings.slice(0, idx), record, ...bookings.slice(idx + 1)]
      else bookings = [...bookings, record]

      if (!activeBookingId) activeBookingId = record.id
      if (!silent) notify()

      return {
        record,
        rollback: () => {
          if (prev) {
            const i = bookings.findIndex((b) => b.id === prev.id)
            if (i >= 0) bookings = [...bookings.slice(0, i), prev, ...bookings.slice(i + 1)]
          } else {
            bookings = bookings.filter((b) => b.id !== record.id)
          }
          notify()
        },
      }
    },

    replaceAll(nextBookings, nextActiveId = activeBookingId) {
      bookings = nextBookings.slice()
      activeBookingId = nextActiveId
      notify()
    },

    /**
     * Hard-delete only for disposable drafts / expired checkout shells.
     * Confirmed care rows refuse removal so Treat / Chat / history keep the same UUID.
     */
    remove(id) {
      const prev = bookings.find((b) => b.id === id)
      if (!prev) return null
      if (IMMUTABLE_APPOINTMENT_STATUSES.includes(prev.status)) {
        return null
      }
      bookings = bookings.filter((b) => b.id !== id)
      if (activeBookingId === id) {
        activeBookingId = bookings.find((b) => b.status === 'confirmed' || b.status === 'upcoming' || b.status === 'pending_payment')?.id
          || bookings[0]?.id
          || null
      }
      notify()
      return {
        rollback: () => {
          bookings = [...bookings, prev]
          activeBookingId = id
          notify()
        },
      }
    },
  }
}

/** Canonical name used by Treat, Chat, Notifications, and care history. */
export const createAppointmentRepository = createRepository

