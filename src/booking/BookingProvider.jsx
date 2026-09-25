/**
 * React binding for the Booking Engine.
 * Preserves the legacy useBooking() API while making the engine the SSOT.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  clearPaymentSession,
  readPaymentSession,
  writePaymentSession,
} from '../lib/paymentSession'
import { appendPaymentHistory } from '../user/store'
import { notificationService } from '../features/notifications'
import { getBookingEngine } from './engine'
import { toLegacyBooking } from './models'
import { selectActive, selectHomeBooking } from './selectors'
import { hydrateAppointmentsFromRemote } from './appointmentSync'
import { rpcAdvanceMyAppointments } from './lifecycleRpc'

const BookingContext = createContext(null)

function subscribeEngine(callback) {
  const engine = getBookingEngine()
  return engine.subscribe(callback)
}

function getEngineSnapshot() {
  return getBookingEngine().getState()
}

export function BookingProvider({ children }) {
  const engine = useMemo(() => getBookingEngine(), [])
  const state = useSyncExternalStore(subscribeEngine, getEngineSnapshot, getEngineSnapshot)

  const [paymentSession, setPaymentSessionState] = useState(() => readPaymentSession())
  const [hydrated, setHydrated] = useState(false)
  const writingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      let session = readPaymentSession()
      if (!session) {
        const active = engine.getActive()
        if (active?.checkout) {
          session = {
            ...active.checkout,
            draftBooking: active.checkout.draftBooking || toLegacyBooking(active),
            bookingEngineId: active.id,
          }
        }
      }
      if (session) {
        setPaymentSessionState(session)
        engine.syncPaymentSession(session)
      }
      engine.purgeDuplicates?.()

      const uid = engine.getUserId?.() || null
      if (uid) {
        await rpcAdvanceMyAppointments().catch(() => {})
        await hydrateAppointmentsFromRemote(engine, uid)
        engine.tickLifecycle?.()
      } else {
        engine.tickLifecycle?.()
      }
      if (!cancelled) setHydrated(true)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [engine])

  useEffect(() => {
    if (!hydrated) return undefined
    const tick = () => {
      try {
        engine.tickLifecycle?.()
      } catch {
        /* ignore */
      }
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
    }
  }, [engine, hydrated])

  // Active booking is the focused record for management screens.
  // Homepage carousel uses selectHomeCarousel separately (newest four).
  const currentBooking = useMemo(() => {
    const active = selectActive(state)
    if (active) return toLegacyBooking(active)
    return toLegacyBooking(selectHomeBooking(state))
  }, [state])

  const setPaymentSession = useCallback((next) => {
    setPaymentSessionState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      writingRef.current = true
      try {
        if (!value) clearPaymentSession()
        else writePaymentSession(value)
        if (value) engine.syncPaymentSession(value)
        else {
          const active = engine.getActive()
          if (active?.checkout) {
            engine.updateBooking(active.id, { checkout: null })
          }
        }
      } finally {
        writingRef.current = false
      }
      return value
    })
  }, [engine])

  const setCurrentBooking = useCallback((next) => {
    if (typeof next === 'function') {
      const prev = engine.getCurrentLegacy()
      const value = next(prev)
      engine.replaceCurrentFromLegacy(value)
      return
    }
    engine.replaceCurrentFromLegacy(next)
  }, [engine])

  const focusBooking = useCallback((id) => {
    if (!id) return null
    engine.setActive(id)
    return toLegacyBooking(engine.getById(id))
  }, [engine])

  const value = useMemo(() => ({
    currentBooking,
    setCurrentBooking,
    paymentSession,
    setPaymentSession,
    hydrated,
    engine,
    bookings: state.bookings,
    activeBookingId: state.activeBookingId,
    focusBooking,
    saveDraft: (...args) => engine.saveDraft(...args),
    startPayment: (...args) => engine.startPayment(...args),
    confirmPaid: (...args) => {
      const record = engine.confirmPaid(...args)
      if (record?.payment?.status === 'paid' || record?.payment?.amount) {
        appendPaymentHistory({
          id: record.payment?.orderId || record.id,
          amount: record.payment?.amount,
          currency: record.payment?.currency || 'NPR',
          method: record.payment?.method || 'eSewa',
          label: `Consultation · ${record.doctor?.name || record.providerName || 'Doctor'}`,
          paidAt: record.payment?.paidAt || new Date().toISOString(),
        })
        notificationService.pushNotification({
          title: 'Booking confirmed',
          body: record.doctor?.name
            ? `Your visit with ${record.doctor.name} is confirmed.`
            : 'Your appointment is confirmed.',
          type: 'booking',
          to: '/appointment',
        })
      }
      return record
    },
    completeReschedule: (...args) => engine.completeReschedule(...args),
    refreshCheckout: (...args) => engine.refreshCheckout(...args),
    cancelAppointment: (...args) => engine.cancelAppointment(...args),
    cancelAppointmentWithReason: (...args) => engine.cancelAppointmentWithReason(...args),
    checkIn: (...args) => engine.checkIn(...args),
    cancelCheckIn: (...args) => engine.cancelCheckIn(...args),
    confirmVisitCompleted: (...args) => engine.confirmVisitCompleted(...args),
    confirmVisitYes: (...args) => engine.confirmVisitYes(...args),
    submitPatientVisitReport: (...args) => engine.submitPatientVisitReport(...args),
    applyProviderCompletion: (...args) => engine.applyProviderCompletion(...args),
    keepVisitActive: (...args) => engine.keepVisitActive(...args),
    snoozeVisitConfirmation: (...args) => engine.snoozeVisitConfirmation(...args),
    setVisitException: (...args) => engine.setVisitException(...args),
    markNoShow: (...args) => engine.markNoShow(...args),
    tickLifecycle: (...args) => engine.tickLifecycle(...args),
    adoptBooking: (...args) => engine.adoptLegacyBooking(...args),
    getResumePath: (...args) => engine.getResumePath(...args),
    getBooking: (id) => toLegacyBooking(engine.getById(id)),
  }), [
    currentBooking,
    setCurrentBooking,
    paymentSession,
    setPaymentSession,
    hydrated,
    engine,
    state.bookings,
    state.activeBookingId,
    focusBooking,
  ])

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) {
    throw new Error('useBooking must be used within BookingProvider')
  }
  return ctx
}

export function useBookingEngine() {
  const { engine, bookings, activeBookingId, hydrated } = useBooking()
  return { engine, bookings, activeBookingId, hydrated }
}
