/** BookingEngine — orchestration service over repository + persistence */

import {
  BOOKING_EVENT,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  STORAGE_KEYS,
  PATIENT_STATUS,
  PROVIDER_STATUS,
  RECONCILIATION_STATUS,
  carePathToRoute,
} from './constants'
import {
  createBookingRecord,
  fromLegacyBooking,
  toLegacyBooking,
} from './models'
import { createLocalPersistence } from './persistence'
import { createRepository, IMMUTABLE_APPOINTMENT_STATUSES } from './repository'
import { mirrorAppointment } from '../features/sync/mirrors'
import { notificationService } from '../features/notifications'
import {
  applyPaymentExpired,
  applyPaymentProcessing,
  applyPaymentSuccess,
  applyPendingPayment,
  transitionBooking,
} from './lifecycle'
import {
  bookingFingerprint,
  selectHomeBooking,
  selectLegacyCurrent,
  selectResumePath,
} from './selectors'
import { ensureCarouselSeeds } from './seed'
import { DEMO_USER_ID } from '../user/constants'
import {
  buildPaidBooking,
  createPaymentSession,
  paymentLabelFromSession,
  readPaymentSession,
  refreshPaymentSession,
  writePaymentSession,
  clearPaymentSession,
} from '../lib/paymentSession'
import { amountFromDoctor } from '../lib/paymentSession'
import {
  desiredStatusForTime,
  snoozeUntil,
} from './visitLifecycle'
import {
  rpcAdvanceAppointment,
  rpcConfirmVisitCompleted,
  rpcConfirmVisitYes,
  rpcSubmitPatientVisitReport,
  rpcProviderCompleteVisit,
  rpcKeepVisitActive,
  rpcSetVisitException,
  rpcCancelAppointmentWithReason,
} from './lifecycleRpc'

function migrateFromPaymentSession(repo, userId = null) {
  const session = readPaymentSession()
  if (!session?.draftBooking || session.status === 'paid') return null

  const existing = repo.getAll().find((b) => b.payment?.orderId === session.orderId)
  if (existing) {
    repo.setActive(existing.id)
    return existing
  }

  const status =
    session.status === 'expired'
      ? BOOKING_STATUS.EXPIRED
      : session.step === 'verify'
        ? BOOKING_STATUS.PAYMENT_PROCESSING
        : BOOKING_STATUS.PENDING_PAYMENT

  const { record } = repo.upsert(
    createBookingRecord({
      ...session.draftBooking,
      userId,
      status,
      flow: session.flow || 'booking',
      resumeStep: session.step === 'verify' ? 'verify' : 'checkout',
      payment: {
        status:
          session.status === 'expired'
            ? PAYMENT_STATUS.EXPIRED
            : session.step === 'verify'
              ? PAYMENT_STATUS.PROCESSING
              : PAYMENT_STATUS.PENDING,
        amount: session.amount,
        currency: session.currency,
        orderId: session.orderId,
        methodId: session.selectedMethodId,
        method: paymentLabelFromSession(session),
        upiAppId: session.upiAppId,
        upiMode: session.upiMode,
        upiId: session.upiId,
        bankId: session.bankId,
      },
      paymentSessionRef: session.orderId,
    }),
    { event: BOOKING_EVENT.CREATED, payload: { source: 'payment_session_migrate' } },
  )
  repo.setActive(record.id)
  return record
}

const STATUS_KEEP_RANK = {
  [BOOKING_STATUS.AWAITING_COMPLETION]: 8,
  [BOOKING_STATUS.IN_PROGRESS]: 7,
  [BOOKING_STATUS.CHECKED_IN]: 6,
  [BOOKING_STATUS.PAYMENT_PROCESSING]: 5,
  [BOOKING_STATUS.PENDING_PAYMENT]: 4,
  [BOOKING_STATUS.CONFIRMED]: 3,
  [BOOKING_STATUS.UPCOMING]: 3,
  [BOOKING_STATUS.RESCHEDULED]: 2,
  [BOOKING_STATUS.COMPLETED]: 1,
  [BOOKING_STATUS.CANCELLED]: 0,
  [BOOKING_STATUS.NO_SHOW]: 0,
  [BOOKING_STATUS.EXPIRED]: 0,
  [BOOKING_STATUS.DRAFT]: -1,
}

/**
 * Collapse duplicate visit fingerprints left by older adopt/setCurrent paths.
 * Never hard-deletes immutable care rows (confirmed → cancelled) — those UUIDs
 * must stay stable for Treat, Chat booking_ref, and care history.
 */
function purgeDuplicateBookings(repo) {
  const groups = new Map()
  repo.getAll().forEach((record) => {
    const key = bookingFingerprint(record)
    if (!key || key.startsWith('|')) return
    const list = groups.get(key) || []
    list.push(record)
    groups.set(key, list)
  })

  let removed = 0
  groups.forEach((list) => {
    if (list.length < 2) return
    list.sort((a, b) => {
      const rank = (STATUS_KEEP_RANK[b.status] || 0) - (STATUS_KEEP_RANK[a.status] || 0)
      if (rank !== 0) return rank
      return new Date(b.meta?.updatedAt || 0).getTime() - new Date(a.meta?.updatedAt || 0).getTime()
    })
    list.slice(1).forEach((dup) => {
      // Never remove stable demo seeds if the keeper is a transient draft.
      if (String(dup.id).startsWith('seed_') && !String(list[0].id).startsWith('seed_')) return
      if (IMMUTABLE_APPOINTMENT_STATUSES.includes(dup.status)) return
      const result = repo.remove(dup.id)
      if (result) removed += 1
    })
  })
  return removed
}

function queueAppointment(record, ownerId) {
  if (!record?.id || !ownerId) return
  mirrorAppointment(record, ownerId).catch(() => {})
}

export function createBookingEngine({
  persistence = createLocalPersistence(),
  userId = null,
  seedCarousel = false,
} = {}) {
  const loaded = persistence.load()
  const repo = createRepository(loaded)
  if (seedCarousel) ensureCarouselSeeds(repo)
  purgeDuplicateBookings(repo)

  const withOwner = (input) => ({ ...input, userId: userId || input.userId || null })
  const ownerId = () => userId || null

  const pendingCheckout = readPaymentSession()
  if (pendingCheckout && (seedCarousel || loaded.bookings.length > 0 || pendingCheckout.draftBooking)) {
    if (!selectHomeBooking(repo.getState()) || !repo.getAll().some((b) =>
      [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.PAYMENT_PROCESSING, BOOKING_STATUS.EXPIRED].includes(b.status),
    )) {
      migrateFromPaymentSession(repo, userId)
    }
  }

  const persist = () => persistence.save(repo.getState())
  repo.subscribe(() => persist())

  const api = {
    subscribe: (fn) => repo.subscribe(fn),
    getState: () => repo.getState(),
    getBookings: () => repo.getAll(),
    getById: (id) => repo.getById(id),
    getActive: () => repo.getActive(),
    getUserId: () => ownerId(),
    getHomeBooking: () => selectHomeBooking(repo.getState()),
    getCurrentLegacy: () => selectLegacyCurrent(repo.getState()),
    getResumePath: (id) => selectResumePath(id ? repo.getById(id) : repo.getActive()),

    /** Re-insert a booking by stable id without changing UUID (hydrate / recover). */
    restoreRecord(record) {
      if (!record?.id) return null
      const existing = repo.getById(record.id)
      const merged = createBookingRecord(withOwner({
        ...(existing || {}),
        ...record,
        id: record.id,
        meta: {
          ...(existing?.meta || {}),
          ...(record.meta || {}),
          updatedAt: new Date().toISOString(),
        },
      }))
      const { record: saved } = repo.upsert(merged, {
        event: BOOKING_EVENT.RESUMED,
        payload: { source: 'restore' },
        silent: false,
      })
      return saved
    },

    setActive(id) {
      repo.setActive(id)
      return repo.getById(id)
    },

    /** Persist wizard fields without treating the visit as booked. */
    saveDraft(legacyPartial, { makeActive = false } = {}) {
      const active = repo.getActive()
      const base = active && [BOOKING_STATUS.DRAFT, BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.EXPIRED].includes(active.status)
        ? active
        : null
      const record = createBookingRecord(withOwner({
        ...(base || {}),
        ...fromLegacyBooking(legacyPartial, {
          id: base?.id || legacyPartial.engineId || legacyPartial.id,
          status: BOOKING_STATUS.DRAFT,
          resumeStep: 'review',
        }),
        status: BOOKING_STATUS.DRAFT,
        resumeStep: 'review',
      }))
      const { record: saved } = repo.upsert(record, {
        event: BOOKING_EVENT.DRAFT_SAVED,
        payload: { doctorId: record.doctor?.id },
      })
      if (makeActive) repo.setActive(saved.id)
      return toLegacyBooking(saved)
    },

    /** Start checkout — marks pending payment + creates/links payment session */
    startPayment(legacyPartial, { flow = 'booking', amount, appointmentData = null } = {}) {
      const fee = amount != null ? Number(amount) : amountFromDoctor(legacyPartial?.doctor)
      const session = createPaymentSession({
        flow,
        draftBooking: legacyPartial,
        appointmentData,
        amount: fee,
      })
      writePaymentSession(session)

      const existing = repo.getActive()

      // Reschedule fee checkout keeps the confirmed appointment; payment session is the SSOT for the fee.
      if (flow === 'reschedule' && existing) {
        const linked = {
          ...session,
          bookingEngineId: existing.id,
          draftBooking: { ...toLegacyBooking(existing), ...legacyPartial },
        }
        const { record } = repo.upsert(
          {
            ...existing,
            paymentSessionRef: linked.orderId,
            checkout: linked,
            meta: {
              ...existing.meta,
              rescheduleCheckout: true,
              rescheduleOrderId: linked.orderId,
              updatedAt: new Date().toISOString(),
            },
          },
          { event: BOOKING_EVENT.RESCHEDULE_STARTED, payload: { orderId: linked.orderId } },
        )
        repo.setActive(record.id)
        writePaymentSession(linked)
        return { booking: toLegacyBooking(record), session: linked }
      }

      const source = existing && existing.doctor?.id === legacyPartial?.doctor?.id
        && [BOOKING_STATUS.DRAFT, BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.EXPIRED, BOOKING_STATUS.PAYMENT_PROCESSING].includes(existing.status)
        ? existing
        : fromLegacyBooking(legacyPartial)

      let record = createBookingRecord(withOwner({
        ...source,
        ...fromLegacyBooking(legacyPartial, { id: source.id }),
        flow,
        status: BOOKING_STATUS.DRAFT,
        serviceType:
          legacyPartial.serviceType
          || (/video|virtual/i.test(legacyPartial.visitType || '')
            ? 'virtual_consultation'
            : 'doctor_consultation'),
      }))
      record = applyPendingPayment(record, {
        amount: fee,
        currency: session.currency,
        orderId: session.orderId,
        methodId: session.selectedMethodId,
        method: paymentLabelFromSession(session),
      })
      record.paymentSessionRef = session.orderId
      record.resumeStep = 'checkout'

      const { record: saved } = repo.upsert(record, {
        event: BOOKING_EVENT.PAYMENT_STARTED,
        payload: { orderId: session.orderId },
      })
      repo.setActive(saved.id)
      const linked = {
        ...session,
        bookingEngineId: saved.id,
        draftBooking: toLegacyBooking(saved),
      }
      writePaymentSession(linked)
      api.syncPaymentSession(linked)
      return { booking: toLegacyBooking(saved), session: linked }
    },

    syncPaymentSession(session) {
      if (!session) return null
      const active = repo.getActive()
      const match =
        repo.getAll().find((b) => b.payment?.orderId === session.orderId || b.paymentSessionRef === session.orderId)
        || (session.bookingEngineId ? repo.getById(session.bookingEngineId) : null)
        || (session.flow === 'booking' ? active : null)
        || active
      if (!match) return null

      const checkoutSnapshot = {
        ...session,
        bookingEngineId: match.id,
        draftBooking: session.draftBooking || toLegacyBooking(match),
      }

      // Reschedule checkout must not mutate confirmed appointment lifecycle via payment status.
      if (session.flow === 'reschedule' || match.meta?.rescheduleCheckout) {
        const { record } = repo.upsert(
          {
            ...match,
            paymentSessionRef: session.orderId,
            checkout: checkoutSnapshot,
            meta: {
              ...match.meta,
              rescheduleCheckout: true,
              rescheduleOrderId: session.orderId,
              rescheduleStep: session.step,
              updatedAt: new Date().toISOString(),
            },
          },
          { event: BOOKING_EVENT.PAYMENT_METHOD_SET, payload: { methodId: session.selectedMethodId, flow: 'reschedule' } },
        )
        return toLegacyBooking(record)
      }

      const paymentPatch = {
        amount: session.amount,
        currency: session.currency,
        orderId: session.orderId,
        methodId: session.selectedMethodId,
        method: paymentLabelFromSession(session),
        upiAppId: session.upiAppId,
        upiMode: session.upiMode,
        upiId: session.upiId,
        bankId: session.bankId,
        status:
          session.status === 'expired'
            ? PAYMENT_STATUS.EXPIRED
            : session.step === 'verify'
              ? PAYMENT_STATUS.PROCESSING
              : PAYMENT_STATUS.PENDING,
      }

      let next = {
        ...match,
        payment: { ...match.payment, ...paymentPatch },
        paymentSessionRef: session.orderId,
        checkout: checkoutSnapshot,
        resumeStep: session.step === 'verify' ? 'verify' : 'checkout',
      }

      try {
        if (session.status === 'expired' && match.status !== BOOKING_STATUS.EXPIRED) {
          next = applyPaymentExpired(next)
        } else if (session.step === 'verify' && match.status === BOOKING_STATUS.PENDING_PAYMENT) {
          next = applyPaymentProcessing(next)
        } else if (
          session.status === 'pending'
          && match.status === BOOKING_STATUS.EXPIRED
          && session.expiresAt > Date.now()
        ) {
          next = applyPendingPayment(next, paymentPatch)
        }
      } catch {
        /* keep patched payment fields even if transition is blocked */
      }

      const { record } = repo.upsert(next, {
        event: BOOKING_EVENT.PAYMENT_METHOD_SET,
        payload: { methodId: session.selectedMethodId },
      })
      repo.setActive(record.id)
      return toLegacyBooking(record)
    },

    markPaymentProcessing(session) {
      writePaymentSession(session)
      return api.syncPaymentSession({ ...session, step: 'verify', status: 'pending' })
    },

    refreshCheckout(session) {
      const nextSession = refreshPaymentSession(session)
      if (!nextSession) return null
      writePaymentSession(nextSession)
      const booking = api.syncPaymentSession(nextSession)
      return { session: nextSession, booking }
    },

    /**
     * Confirm paid booking after OTP success. Optimistic + rollback on failure.
     */
    confirmPaid(session) {
      const paidLegacy = buildPaidBooking(session)
      if (!paidLegacy) {
        const err = new Error('Unable to build paid booking')
        err.code = 'CONFIRM_FAILED'
        throw err
      }

      const match =
        repo.getAll().find((b) => b.payment?.orderId === session.orderId)
        || repo.getActive()

      const base = match || fromLegacyBooking(paidLegacy)
      let next = createBookingRecord(withOwner({
        ...base,
        ...fromLegacyBooking(paidLegacy, { id: base.id }),
      }))
      next = applyPaymentSuccess(next, paidLegacy.payment)

      const { record, rollback } = repo.upsert(next, {
        event: BOOKING_EVENT.CONFIRMED,
        payload: { orderId: session.orderId },
      })
      repo.setActive(record.id)

      try {
        clearPaymentSession()
      } catch (e) {
        rollback()
        throw e
      }

      queueAppointment(record, ownerId())
      return toLegacyBooking(record)
    },

    updateBooking(id, patch, event = BOOKING_EVENT.UPDATED) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const { record } = repo.upsert(
        {
          ...current,
          ...patch,
          id: current.id,
          schedule: { ...current.schedule, ...(patch.schedule || {}) },
          payment: { ...current.payment, ...(patch.payment || {}) },
        },
        { event, payload: patch },
      )
      return toLegacyBooking(record)
    },

    setPreparation(id, { completed, stepIndex }) {
      return api.updateBooking(
        id,
        {
          preparationCompleted: completed,
          prepStepIndex: stepIndex,
        },
        BOOKING_EVENT.PREP_UPDATED,
      )
    },

    checkIn(id) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const next = transitionBooking(current, BOOKING_STATUS.CHECKED_IN, {
        event: BOOKING_EVENT.CHECKED_IN,
      })
      next.meta = {
        ...(next.meta || {}),
        checkedInAt: new Date().toISOString(),
      }
      const { record } = repo.upsert(next, { event: BOOKING_EVENT.CHECKED_IN })
      repo.setActive(record.id)
      queueAppointment(record, ownerId())
      return toLegacyBooking(record)
    },

    cancelCheckIn(id) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const next = transitionBooking(current, BOOKING_STATUS.CONFIRMED, {
        event: BOOKING_EVENT.CHECKIN_CANCELLED,
      })
      const { record } = repo.upsert(next, { event: BOOKING_EVENT.CHECKIN_CANCELLED })
      queueAppointment(record, ownerId())
      return toLegacyBooking(record)
    },

    cancelAppointment(id, { reason } = {}) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const next = transitionBooking(current, BOOKING_STATUS.CANCELLED, {
        event: BOOKING_EVENT.CANCELLED,
        payload: { reason },
      })
      const { record } = repo.upsert(next, { event: BOOKING_EVENT.CANCELLED, payload: { reason } })
      if (repo.getActive()?.id === record.id) {
        const home = selectHomeBooking({
          ...repo.getState(),
          bookings: repo.getAll().filter((b) => b.id !== record.id),
        })
        repo.setActive(home?.id || null)
      }
      clearPaymentSession()
      queueAppointment(record, ownerId())
      return toLegacyBooking(record)
    },

    /**
     * Time-based lifecycle tick — advances local status then mirrors / RPCs.
     * Idempotent: no-op when desired status matches current.
     */
    tickLifecycle(now = new Date()) {
      const t = now instanceof Date ? now : new Date(now)
      const changed = []
      repo.getAll().forEach((record) => {
        const desired = desiredStatusForTime(record, t)
        if (!desired || desired === record.status) return
        try {
          const event =
            desired === BOOKING_STATUS.IN_PROGRESS
              ? BOOKING_EVENT.VISIT_STARTED
              : desired === BOOKING_STATUS.VISIT_ACTIVE
                ? BOOKING_EVENT.VISIT_KEPT_ACTIVE
              : desired === BOOKING_STATUS.AWAITING_COMPLETION
                ? BOOKING_EVENT.VISIT_AWAITING_CONFIRMATION
                : desired === BOOKING_STATUS.NO_SHOW
                  ? BOOKING_EVENT.NO_SHOW
                  : BOOKING_EVENT.UPDATED
          const next = transitionBooking(record, desired, { event })
          if (desired === BOOKING_STATUS.IN_PROGRESS || desired === BOOKING_STATUS.VISIT_ACTIVE) {
            next.meta = {
              ...(next.meta || {}),
              startedAt: next.meta?.startedAt || t.toISOString(),
            }
          }
          if (desired === BOOKING_STATUS.NO_SHOW) {
            next.meta = {
              ...(next.meta || {}),
              completedAt: next.meta?.completedAt || t.toISOString(),
            }
          }
          const { record: saved } = repo.upsert(next, { event })
          changed.push(saved)
          queueAppointment(saved, ownerId())
          if (ownerId()) {
            rpcAdvanceAppointment(saved.id).catch(() => {})
          }
        } catch {
          /* invalid transition — skip */
        }
      })
      return changed.map((r) => toLegacyBooking(r))
    },

    /**
     * Patient taps Yes — verify provider status via RPC when online.
     * Returns { booking, waitingForProvider, route, careFocus, navigation }.
     */
    async confirmVisitYes(id) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null

      let remote = null
      if (ownerId()) {
        remote = await rpcConfirmVisitYes(current.id).catch(() => null)
      }

      const waiting = Boolean(
        remote?.waiting_for_provider
        || remote?.status === BOOKING_STATUS.COMPLETED_PENDING_PROVIDER
        || (!remote?.ok && current.meta?.providerStatus !== PROVIDER_STATUS.COMPLETED),
      )

      // Provider already completed (remote said so, or local meta).
      const providerDone = remote?.provider_status === PROVIDER_STATUS.COMPLETED
        || remote?.waiting_for_provider === false
        || current.meta?.providerStatus === PROVIDER_STATUS.COMPLETED

      if (providerDone && !waiting && remote?.status === BOOKING_STATUS.COMPLETED) {
        const careFocus = remote.care_focus || remote.next_care_path || 'post_visit_summary'
        const completedAt = new Date().toISOString()
        const postVisitUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        let next
        try {
          next = transitionBooking(current, BOOKING_STATUS.COMPLETED, {
            event: BOOKING_EVENT.VISIT_RECONCILED,
          })
        } catch {
          next = { ...current, status: BOOKING_STATUS.COMPLETED }
        }
        next.meta = {
          ...(next.meta || {}),
          completedAt,
          postVisitUntil,
          confirmationSnoozeUntil: null,
          visitReminderAt: null,
          lifecycle: BOOKING_STATUS.COMPLETED,
          patientStatus: PATIENT_STATUS.COMPLETED,
          providerStatus: PROVIDER_STATUS.COMPLETED,
          reconciliationStatus: RECONCILIATION_STATUS.RECONCILED,
          nextCarePath: careFocus,
        }
        const { record } = repo.upsert(next, { event: BOOKING_EVENT.VISIT_RECONCILED })
        queueAppointment(record, ownerId())
        const navigation = carePathToRoute(careFocus, record.id)
        notificationService.pushNotification({
          title: 'Visit confirmed',
          body: 'Your provider already completed this visit. Opening your care hub.',
          type: 'booking',
          to: navigation.pathname,
          data: { bookingId: record.id, careFocus },
        })
        return {
          booking: toLegacyBooking(record),
          waitingForProvider: false,
          careFocus,
          route: navigation.pathname,
          navigation,
        }
      }

      // Waiting for provider confirmation.
      let next
      try {
        next = transitionBooking(current, BOOKING_STATUS.COMPLETED_PENDING_PROVIDER, {
          event: BOOKING_EVENT.COMPLETED_PENDING_PROVIDER,
        })
      } catch {
        next = {
          ...current,
          status: BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
          history: [
            ...(current.history || []),
            {
              event: BOOKING_EVENT.COMPLETED_PENDING_PROVIDER,
              at: new Date().toISOString(),
              payload: { from: current.status },
            },
          ],
        }
      }
      const nowIso = new Date().toISOString()
      next.meta = {
        ...(next.meta || {}),
        updatedAt: nowIso,
        patientCompletedAt: nowIso,
        patientStatus: PATIENT_STATUS.COMPLETED,
        providerStatus: current.meta?.providerStatus || PROVIDER_STATUS.NOT_STARTED,
        reconciliationStatus: RECONCILIATION_STATUS.AWAITING_PROVIDER,
        lifecycle: BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
        confirmationSnoozeUntil: null,
        visitReminderAt: null,
      }
      const { record } = repo.upsert(next, { event: BOOKING_EVENT.COMPLETED_PENDING_PROVIDER })
      queueAppointment(record, ownerId())
      if (ownerId() && !remote?.ok) {
        rpcConfirmVisitYes(record.id).catch(() => {})
      }
      notificationService.pushNotification({
        title: 'Waiting for provider confirmation',
        body: 'You can report what happened while we wait for your clinic to update.',
        type: 'booking',
        to: '/',
        data: { bookingId: record.id },
      })
      return {
        booking: toLegacyBooking(record),
        waitingForProvider: true,
        careFocus: null,
        route: null,
        navigation: null,
      }
    },

    confirmVisitCompleted(id) {
      // Sync wrapper for older callers — fire-and-forget async Yes path locally.
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      if (current.status === BOOKING_STATUS.COMPLETED
        && current.meta?.reconciliationStatus === RECONCILIATION_STATUS.RECONCILED) {
        return toLegacyBooking(current)
      }
      // Optimistic pending-provider unless provider already marked complete locally.
      if (current.meta?.providerStatus === PROVIDER_STATUS.COMPLETED) {
        const now = new Date()
        const completedAt = now.toISOString()
        const postVisitUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        const next = transitionBooking(current, BOOKING_STATUS.COMPLETED, {
          event: BOOKING_EVENT.VISIT_COMPLETED,
        })
        next.meta = {
          ...(next.meta || {}),
          completedAt,
          postVisitUntil,
          confirmationSnoozeUntil: null,
          visitReminderAt: null,
          lifecycle: BOOKING_STATUS.COMPLETED,
          patientStatus: PATIENT_STATUS.COMPLETED,
          providerStatus: PROVIDER_STATUS.COMPLETED,
          reconciliationStatus: RECONCILIATION_STATUS.RECONCILED,
        }
        const { record } = repo.upsert(next, { event: BOOKING_EVENT.VISIT_COMPLETED })
        queueAppointment(record, ownerId())
        if (ownerId()) rpcConfirmVisitYes(record.id).catch(() => {})
        return toLegacyBooking(record)
      }

      let next
      try {
        next = transitionBooking(current, BOOKING_STATUS.COMPLETED_PENDING_PROVIDER, {
          event: BOOKING_EVENT.COMPLETED_PENDING_PROVIDER,
        })
      } catch {
        next = { ...current, status: BOOKING_STATUS.COMPLETED_PENDING_PROVIDER }
      }
      const nowIso = new Date().toISOString()
      next.meta = {
        ...(next.meta || {}),
        updatedAt: nowIso,
        patientCompletedAt: nowIso,
        patientStatus: PATIENT_STATUS.COMPLETED,
        reconciliationStatus: RECONCILIATION_STATUS.AWAITING_PROVIDER,
        lifecycle: BOOKING_STATUS.COMPLETED_PENDING_PROVIDER,
      }
      const { record } = repo.upsert(next, { event: BOOKING_EVENT.COMPLETED_PENDING_PROVIDER })
      queueAppointment(record, ownerId())
      if (ownerId()) {
        rpcConfirmVisitYes(record.id).catch(() => {})
        rpcConfirmVisitCompleted(record.id).catch(() => {})
      }
      return toLegacyBooking(record)
    },

    submitPatientVisitReport(id, report = {}) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const merged = {
        ...(current.meta?.patientReport || {}),
        ...report,
        reportedAt: new Date().toISOString(),
      }
      const next = {
        ...current,
        meta: {
          ...(current.meta || {}),
          updatedAt: new Date().toISOString(),
          patientStatus: PATIENT_STATUS.REPORTED,
          patientReport: merged,
        },
        history: [
          ...(current.history || []),
          {
            event: BOOKING_EVENT.PATIENT_VISIT_REPORTED,
            at: new Date().toISOString(),
            payload: { report },
          },
        ],
      }
      const { record } = repo.upsert(next, {
        event: BOOKING_EVENT.PATIENT_VISIT_REPORTED,
        payload: { report },
      })
      queueAppointment(record, ownerId())
      if (ownerId()) {
        rpcSubmitPatientVisitReport(record.id, report).catch(() => {})
      }
      return toLegacyBooking(record)
    },

    /** Apply official provider completion (hydrate / provider app / admin). */
    applyProviderCompletion(id, outcomes = {}) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const careFocus = outcomes.nextCarePath
        || current.meta?.nextCarePath
        || 'post_visit_summary'
      const patientDone = [PATIENT_STATUS.COMPLETED, PATIENT_STATUS.REPORTED]
        .includes(current.meta?.patientStatus)
      const target = patientDone
        ? BOOKING_STATUS.COMPLETED
        : current.status
      let next = current
      if (patientDone && current.status !== BOOKING_STATUS.COMPLETED) {
        try {
          next = transitionBooking(current, BOOKING_STATUS.COMPLETED, {
            event: BOOKING_EVENT.VISIT_RECONCILED,
            payload: { outcomes },
          })
        } catch {
          next = { ...current, status: BOOKING_STATUS.COMPLETED }
        }
      }
      const nowIso = new Date().toISOString()
      next.meta = {
        ...(next.meta || {}),
        updatedAt: nowIso,
        providerStatus: PROVIDER_STATUS.COMPLETED,
        providerCompletedAt: nowIso,
        providerOutcomes: { ...(current.meta?.providerOutcomes || {}), ...outcomes },
        nextCarePath: careFocus,
        reconciliationStatus: patientDone
          ? RECONCILIATION_STATUS.RECONCILED
          : RECONCILIATION_STATUS.AWAITING_PATIENT,
        lifecycle: patientDone ? BOOKING_STATUS.COMPLETED : next.status,
        ...(patientDone ? {
          completedAt: current.meta?.completedAt || nowIso,
          postVisitUntil: current.meta?.postVisitUntil
            || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } : {}),
      }
      if (patientDone) next.status = BOOKING_STATUS.COMPLETED
      const { record } = repo.upsert(next, {
        event: patientDone ? BOOKING_EVENT.VISIT_RECONCILED : BOOKING_EVENT.PROVIDER_COMPLETED,
        payload: { outcomes },
      })
      queueAppointment(record, ownerId())
      if (ownerId()) {
        rpcProviderCompleteVisit(record.id, outcomes).catch(() => {})
      }
      if (patientDone) {
        notificationService.pushNotification({
          title: 'Provider confirmed your visit',
          body: 'Your care hub is ready with official updates.',
          type: 'booking',
          to: '/post-visit-summary',
          data: { bookingId: record.id, careFocus },
        })
      }
      return toLegacyBooking(record)
    },

    /**
     * "Not yet" on Visit Check-in — keep visit_active, stamp updated_at,
     * schedule a 30-minute reminder. Idempotent if already active with future reminder.
     */
    keepVisitActive(id, untilIso) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const until = untilIso || snoozeUntil()
      const existingReminder = current.meta?.visitReminderAt || current.meta?.confirmationSnoozeUntil
      if (
        current.status === BOOKING_STATUS.VISIT_ACTIVE
        && existingReminder
        && new Date(existingReminder).getTime() > Date.now()
      ) {
        return toLegacyBooking(current)
      }

      let base = current
      if (current.status !== BOOKING_STATUS.VISIT_ACTIVE) {
        try {
          base = transitionBooking(current, BOOKING_STATUS.VISIT_ACTIVE, {
            event: BOOKING_EVENT.VISIT_KEPT_ACTIVE,
            payload: { reminderAt: until },
          })
        } catch {
          // Fall back through in_progress when awaiting → visit_active is blocked.
          try {
            if (current.status === BOOKING_STATUS.AWAITING_COMPLETION) {
              base = {
                ...current,
                status: BOOKING_STATUS.VISIT_ACTIVE,
                meta: {
                  ...(current.meta || {}),
                  updatedAt: new Date().toISOString(),
                },
                history: [
                  ...(current.history || []),
                  {
                    event: BOOKING_EVENT.VISIT_KEPT_ACTIVE,
                    at: new Date().toISOString(),
                    payload: { from: current.status, to: BOOKING_STATUS.VISIT_ACTIVE },
                  },
                ],
              }
            } else {
              return toLegacyBooking(current)
            }
          } catch {
            return toLegacyBooking(current)
          }
        }
      }

      const nowIso = new Date().toISOString()
      const next = {
        ...base,
        status: BOOKING_STATUS.VISIT_ACTIVE,
        meta: {
          ...(base.meta || {}),
          updatedAt: nowIso,
          lifecycle: BOOKING_STATUS.VISIT_ACTIVE,
          confirmationSnoozeUntil: until,
          visitReminderAt: until,
          startedAt: base.meta?.startedAt || nowIso,
        },
      }
      const { record } = repo.upsert(next, {
        event: BOOKING_EVENT.VISIT_KEPT_ACTIVE,
        payload: { reminderAt: until },
      })
      queueAppointment(record, ownerId())
      if (ownerId()) {
        rpcKeepVisitActive(record.id, until).catch(() => {})
      }
      notificationService.pushNotification({
        title: 'Visit in progress',
        body: 'We will check back in 30 minutes. Tap Complete Visit when you are done.',
        type: 'booking',
        to: '/',
        data: { bookingId: record.id },
      })
      return toLegacyBooking(record)
    },

    /** @deprecated Prefer keepVisitActive — retained for callers / outbox. */
    snoozeVisitConfirmation(id, untilIso) {
      return api.keepVisitActive(id, untilIso || snoozeUntil())
    },

    setVisitException(id, toStatus, { reason, payload } = {}) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      const target = String(toStatus || '')
      if (current.status === target) return toLegacyBooking(current)
      const event =
        target === BOOKING_STATUS.TESTS_IN_PROGRESS
          ? BOOKING_EVENT.TESTS_IN_PROGRESS
          : target === BOOKING_STATUS.PAUSED
            ? BOOKING_EVENT.VISIT_PAUSED
            : target === BOOKING_STATUS.RESCHEDULE_REQUESTED
              ? BOOKING_EVENT.RESCHEDULE_REQUESTED
              : BOOKING_EVENT.VISIT_EXCEPTION
      try {
        const next = transitionBooking(current, target, {
          event,
          payload: { reason, ...(payload || {}) },
        })
        next.meta = {
          ...(next.meta || {}),
          exceptionReason: reason || next.meta?.exceptionReason || null,
          lifecycle: target,
        }
        const { record } = repo.upsert(next, { event, payload: { reason } })
        queueAppointment(record, ownerId())
        if (ownerId()) {
          rpcSetVisitException(record.id, target, reason, payload).catch(() => {})
        }
        return toLegacyBooking(record)
      } catch {
        return toLegacyBooking(current)
      }
    },

    cancelAppointmentWithReason(id, { reason, branch = 'cancel', note, payload } = {}) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      if (current.status === BOOKING_STATUS.CANCELLED) return toLegacyBooking(current)

      const target = branch === 'reschedule'
        ? BOOKING_STATUS.RESCHEDULE_REQUESTED
        : BOOKING_STATUS.CANCELLED
      const event = branch === 'reschedule'
        ? BOOKING_EVENT.RESCHEDULE_REQUESTED
        : BOOKING_EVENT.CANCELLED

      let next
      try {
        next = transitionBooking(current, target, {
          event,
          payload: { reason, branch, note, ...(payload || {}) },
        })
      } catch {
        next = {
          ...current,
          status: target,
          meta: {
            ...(current.meta || {}),
            updatedAt: new Date().toISOString(),
            cancelReason: reason || null,
            cancelBranch: branch,
            cancelNote: note || null,
            cancelledAt: branch === 'reschedule' ? current.meta?.cancelledAt : new Date().toISOString(),
            lifecycle: target,
          },
          history: [
            ...(current.history || []),
            {
              event,
              at: new Date().toISOString(),
              payload: { from: current.status, to: target, reason, branch },
            },
          ],
        }
      }
      next.meta = {
        ...(next.meta || {}),
        cancelReason: reason || null,
        cancelBranch: branch,
        cancelNote: note || null,
        slotReleased: true,
      }
      const { record } = repo.upsert(next, { event, payload: { reason, branch, note } })
      if (repo.getActive()?.id === record.id && target === BOOKING_STATUS.CANCELLED) {
        const home = selectHomeBooking({
          ...repo.getState(),
          bookings: repo.getAll().filter((b) => b.id !== record.id),
        })
        repo.setActive(home?.id || null)
      }
      clearPaymentSession()
      queueAppointment(record, ownerId())
      if (ownerId()) {
        rpcCancelAppointmentWithReason(record.id, {
          reason,
          branch,
          note,
          payload,
        }).catch(() => {})
      }
      notificationService.pushNotification({
        title: branch === 'reschedule' ? 'Reschedule requested' : 'Appointment cancelled',
        body: reason || (branch === 'reschedule'
          ? 'Your clinic has been notified of the reschedule request.'
          : 'Your appointment was cancelled and the slot was released.'),
        type: 'booking',
        to: branch === 'reschedule' ? '/reschedule' : '/treat',
        data: { bookingId: record.id, branch },
      })
      return toLegacyBooking(record)
    },

    markNoShow(id) {
      const current = repo.getById(id) || repo.getActive()
      if (!current) return null
      if (current.status === BOOKING_STATUS.NO_SHOW) return toLegacyBooking(current)
      const next = transitionBooking(current, BOOKING_STATUS.NO_SHOW, {
        event: BOOKING_EVENT.NO_SHOW,
      })
      next.meta = {
        ...(next.meta || {}),
        completedAt: next.meta?.completedAt || new Date().toISOString(),
      }
      const { record } = repo.upsert(next, { event: BOOKING_EVENT.NO_SHOW })
      queueAppointment(record, ownerId())
      if (ownerId()) {
        rpcAdvanceAppointment(record.id).catch(() => {})
      }
      return toLegacyBooking(record)
    },

    completeReschedule(session, appointmentData = {}) {
      const current = repo.getActive()
      if (!current) return null

      const newDateRaw = appointmentData.newDate || appointmentData.date
      const newTime = appointmentData.newTime || appointmentData.time || current.schedule?.time
      let nextDate = current.schedule?.date
      if (newDateRaw) {
        if (typeof newDateRaw === 'string' || newDateRaw instanceof Date) {
          const d = new Date(newDateRaw)
          if (!Number.isNaN(d.getTime())) {
            nextDate = {
              day: d.toLocaleDateString('en-NP', { weekday: 'short' }),
              num: d.getDate(),
              month: d.toLocaleDateString('en-NP', { month: 'short' }),
              monthLong: d.toLocaleDateString('en-NP', { month: 'long' }),
              year: d.getFullYear(),
              full: d.toISOString(),
            }
          }
        } else {
          nextDate = newDateRaw
        }
      }

      const historyEntry = {
        oldDate: appointmentData.oldDate,
        oldTime: appointmentData.oldTime,
        newDate: appointmentData.newDate || newDateRaw,
        newTime,
        rescheduledAt: new Date().toISOString(),
        amount: session?.amount,
      }

      const patched = {
        ...current,
        status: BOOKING_STATUS.CONFIRMED,
        attachedRecordIds: Array.isArray(appointmentData.selectedRecords)
          ? appointmentData.selectedRecords
          : current.attachedRecordIds || [],
        schedule: {
          ...current.schedule,
          date: nextDate,
          time: newTime,
          visitType: appointmentData.visitType || current.schedule?.visitType,
          duration: appointmentData.duration || current.schedule?.duration,
        },
        meta: {
          ...current.meta,
          rescheduleCheckout: false,
          rescheduleOrderId: null,
          updatedAt: new Date().toISOString(),
          rescheduleHistory: [
            ...(current.meta?.rescheduleHistory || current.rescheduleHistory || []),
            historyEntry,
          ],
        },
        rescheduleHistory: [
          ...(current.rescheduleHistory || current.meta?.rescheduleHistory || []),
          historyEntry,
        ],
      }

      const { record } = repo.upsert(patched, {
        event: BOOKING_EVENT.RESCHEDULED,
        payload: historyEntry,
      })
      repo.setActive(record.id)
      clearPaymentSession()
      queueAppointment(record, ownerId())
      return toLegacyBooking(record)
    },

    adoptLegacyBooking(legacy, { makeActive = true } = {}) {
      if (!legacy) return null
      const active = repo.getActive()
      const protectActive = active && [
        BOOKING_STATUS.PENDING_PAYMENT,
        BOOKING_STATUS.PAYMENT_PROCESSING,
      ].includes(active.status)

      const explicitId = legacy.engineId || legacy.id
      const existing = (explicitId && repo.getById(explicitId))
        || repo.getAll().find((b) => {
          const doctorMatch = String(b.doctor?.id || '') === String(legacy.doctor?.id || '')
            && Boolean(legacy.doctor?.id)
          if (!doctorMatch && !(legacy.providerName && b.providerName === legacy.providerName)) {
            return false
          }
          const sameTime = String(b.schedule?.time || '').toLowerCase() === String(legacy.time || '').toLowerCase()
          const a = b.schedule?.date?.full ? new Date(b.schedule.date.full) : null
          const bDate = legacy.date?.full ? new Date(legacy.date.full) : (legacy.date ? new Date(legacy.date) : null)
          const sameDay = a && bDate
            && a.getFullYear() === bDate.getFullYear()
            && a.getMonth() === bDate.getMonth()
            && a.getDate() === bDate.getDate()
          return sameTime && sameDay
        })

      const record = fromLegacyBooking(legacy, {
        id: existing?.id || explicitId,
        status: legacy.paymentPending ? BOOKING_STATUS.PENDING_PAYMENT : legacy.status,
      })
      if (record.status === 'booked' || legacy.status === 'booked') {
        record.status = BOOKING_STATUS.CONFIRMED
      }
      // Keep the stronger lifecycle status when re-adopting a duplicate fingerprint.
      if (existing && [
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.CANCELLED,
      ].includes(existing.status)
        && [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.UPCOMING, BOOKING_STATUS.DRAFT].includes(record.status)
      ) {
        record.status = existing.status
      }

      const { record: saved } = repo.upsert(createBookingRecord(withOwner({
        ...existing,
        ...record,
        id: existing?.id || record.id,
        meta: {
          ...(existing?.meta || {}),
          ...(record.meta || {}),
          updatedAt: new Date().toISOString(),
        },
      })), {
        event: BOOKING_EVENT.RESUMED,
        payload: { source: 'ui_adopt' },
      })
      if (makeActive && !protectActive) repo.setActive(saved.id)
      return toLegacyBooking(saved)
    },

    clearActive() {
      repo.setActive(null)
    },

    purgeDuplicates() {
      return purgeDuplicateBookings(repo)
    },

    /** Imperative replace used by setCurrentBooking compatibility layer */
    replaceCurrentFromLegacy(legacy) {
      if (!legacy) {
        const active = repo.getActive()
        if (active && [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.PAYMENT_PROCESSING].includes(active.status)) {
          return null
        }
        repo.setActive(null)
        return null
      }
      return api.adoptLegacyBooking(legacy, { makeActive: true })
    },
  }

  // Persist initial migrated state
  persist()
  return api
}

let singleton = null
let boundUserId = null

function persistenceForUser(userId) {
  const scope = userId || 'anon'
  return createLocalPersistence({
    dbKey: `${STORAGE_KEYS.DB}:${scope}`,
    activeKey: `${STORAGE_KEYS.ACTIVE_ID}:${scope}`,
  })
}

export function bindBookingEngine(userId = null) {
  const scope = userId || 'anon'
  if (singleton && boundUserId === scope) return singleton
  boundUserId = scope
  singleton = createBookingEngine({
    persistence: persistenceForUser(userId),
    userId: userId || null,
    seedCarousel: userId === DEMO_USER_ID,
  })
  return singleton
}

export function getBookingEngine() {
  if (!singleton) bindBookingEngine(null)
  return singleton
}

export function getBoundBookingUserId() {
  return boundUserId && boundUserId !== 'anon' ? boundUserId : null
}

export function __resetBookingEngineForTests() {
  singleton = null
  boundUserId = null
}
