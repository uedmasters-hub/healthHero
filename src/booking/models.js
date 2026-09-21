/** Normalized booking models + serializers */

import {
  BOOKING_STATUS,
  LEGACY_STATUS_MAP,
  PAYMENT_STATUS,
} from './constants'
import { resolveProviderPhoto } from '../lib/providerPhoto'

export function createId(prefix = 'bk') {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

function asIso(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function serializeDate(date) {
  if (!date) return null
  if (typeof date === 'string' || typeof date === 'number') {
    return { full: asIso(date), day: null, dayName: null }
  }
  return {
    ...date,
    full: asIso(date.full) || date.full || null,
  }
}

export function reviveDate(date) {
  if (!date) return null
  return {
    ...date,
    full: date.full ? new Date(date.full) : date.full,
  }
}

export function snapshotDoctor(doctor = {}) {
  return {
    id: doctor.id ?? null,
    name: doctor.name || '',
    specialty: doctor.specialty || '',
    rating: doctor.rating ?? null,
    experience: doctor.experience || '',
    address: doctor.address || '',
    photo: resolveProviderPhoto(doctor) || '',
    fee: doctor.fee ?? null,
    phone: doctor.phone || '',
  }
}

export function snapshotPatient(patient = {}) {
  return {
    id: patient.id ?? null,
    name: patient.name || 'Patient',
    relationship: patient.relationship || 'Self',
    age: patient.age ?? null,
    phone: patient.phone || '',
    gender: patient.gender || '',
  }
}

export function createPaymentContext(partial = {}) {
  return {
    status: PAYMENT_STATUS.NONE,
    amount: 0,
    currency: 'INR',
    method: null,
    methodId: null,
    orderId: null,
    paymentId: null,
    bookingId: null,
    paidAt: null,
    consultationFee: null,
    taxes: 0,
    discount: 0,
    upiAppId: null,
    upiMode: null,
    upiId: null,
    bankId: null,
    failureReason: null,
    ...partial,
  }
}

export function normalizeStatus(status) {
  if (!status) return BOOKING_STATUS.DRAFT
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status]
  if (Object.values(BOOKING_STATUS).includes(status)) return status
  return BOOKING_STATUS.DRAFT
}

/**
 * Canonical booking record stored in the engine database.
 * UI screens may still read a flattened "view model" via toLegacyBooking().
 */
export function createBookingRecord(input = {}) {
  const now = new Date().toISOString()
  const id = input.id || createId('bk')
  const status = normalizeStatus(input.status)
  const doctor = snapshotDoctor(input.doctor || input.doctorSnapshot)
  const patient = snapshotPatient(input.patient || input.patientSnapshot)
  const payment = createPaymentContext(input.payment || {})

  return {
    id,
    version: 1,
    userId: input.userId || null,
    status,
    flow: input.flow || 'booking', // booking | reschedule
    resumeStep: input.resumeStep || null, // review | checkout | verify | confirm | manage
    serviceType: input.serviceType || null,
    providerName: input.providerName || null,
    providerSubtitle: input.providerSubtitle || null,
    providerIcon: input.providerIcon || null,
    doctor,
    patient,
    schedule: {
      date: serializeDate(input.date || input.schedule?.date),
      time: input.time || input.schedule?.time || null,
      visitType: input.visitType || input.schedule?.visitType || 'In-Person',
      duration: input.duration || input.schedule?.duration || '30 min',
    },
    note: input.note || '',
    attachedRecordIds: Array.isArray(input.attachedRecordIds)
      ? input.attachedRecordIds
      : Array.isArray(input.selectedRecords)
        ? input.selectedRecords
        : [],
    origin: input.origin || null,
    returnTo: input.returnTo || null,
    preparationCompleted: Boolean(input.preparationCompleted),
    prepStepIndex: Number(input.prepStepIndex) || 0,
    payment,
    paymentSessionRef: input.paymentSessionRef || payment.orderId || null,
    checkout: input.checkout || null,
    invoice: input.invoice || null,
    parentBookingId: input.parentBookingId || null,
    rescheduleOf: input.rescheduleOf || null,
    history: Array.isArray(input.history) ? input.history : [],
    meta: {
      ...(input.meta || {}),
      createdAt: input.meta?.createdAt || input.createdAt || now,
      updatedAt: now,
      confirmedAt: input.meta?.confirmedAt || null,
      cancelledAt: input.meta?.cancelledAt || null,
      completedAt: input.meta?.completedAt || null,
    },
  }
}

export function reviveBookingRecord(raw) {
  if (!raw) return null
  return {
    ...raw,
    status: normalizeStatus(raw.status),
    schedule: {
      ...(raw.schedule || {}),
      date: reviveDate(raw.schedule?.date),
    },
    payment: createPaymentContext(raw.payment || {}),
    history: Array.isArray(raw.history) ? raw.history : [],
    meta: raw.meta || {},
  }
}

export function serializeBookingRecord(record) {
  if (!record) return null
  return {
    ...record,
    schedule: {
      ...(record.schedule || {}),
      date: serializeDate(record.schedule?.date),
    },
  }
}

/**
 * Flatten engine record into the shape existing screens expect
 * (doctor/date/time/patient/payment/status at top level).
 */
export function toLegacyBooking(record) {
  if (!record) return null
  const status = record.status
  const legacyStatus =
    status === BOOKING_STATUS.PENDING_PAYMENT || status === BOOKING_STATUS.PAYMENT_PROCESSING
      ? 'payment_pending'
      : status === BOOKING_STATUS.CHECKED_IN
        ? 'checked_in'
        : status === BOOKING_STATUS.CONFIRMED || status === BOOKING_STATUS.UPCOMING
          ? 'booked'
          : status

  return {
    id: record.id,
    engineId: record.id,
    status: legacyStatus,
    paymentPending:
      status === BOOKING_STATUS.PENDING_PAYMENT
      || status === BOOKING_STATUS.PAYMENT_PROCESSING,
    serviceType: record.serviceType,
    providerName: record.providerName,
    providerSubtitle: record.providerSubtitle,
    providerIcon: record.providerIcon,
    doctor: record.doctor,
    patient: record.patient,
    date: reviveDate(record.schedule?.date),
    time: record.schedule?.time,
    visitType: record.schedule?.visitType,
    duration: record.schedule?.duration,
    note: record.note || '',
    attachedRecordIds: Array.isArray(record.attachedRecordIds) ? record.attachedRecordIds : [],
    selectedRecords: Array.isArray(record.attachedRecordIds) ? record.attachedRecordIds : [],
    origin: record.origin,
    returnTo: record.returnTo,
    preparationCompleted: record.preparationCompleted,
    prepStepIndex: record.prepStepIndex,
    payment: record.payment,
    flow: record.flow,
    resumeStep: record.resumeStep,
    invoice: record.invoice,
    history: record.history,
    rescheduleHistory: record.rescheduleHistory || record.meta?.rescheduleHistory || [],
    meta: record.meta,
    createdAt: record.meta?.createdAt,
    updatedAt: record.meta?.updatedAt,
  }
}

export function fromLegacyBooking(legacy = {}, overrides = {}) {
  return createBookingRecord({
    id: legacy.engineId || legacy.id,
    status: legacy.status,
    serviceType: legacy.serviceType,
    providerName: legacy.providerName,
    providerSubtitle: legacy.providerSubtitle,
    providerIcon: legacy.providerIcon,
    doctor: legacy.doctor,
    patient: legacy.patient,
    date: legacy.date,
    time: legacy.time,
    visitType: legacy.visitType,
    duration: legacy.duration,
    note: legacy.note,
    attachedRecordIds: legacy.attachedRecordIds || legacy.selectedRecords || [],
    origin: legacy.origin,
    returnTo: legacy.returnTo,
    preparationCompleted: legacy.preparationCompleted,
    prepStepIndex: legacy.prepStepIndex,
    payment: legacy.payment,
    flow: legacy.flow,
    resumeStep: legacy.resumeStep,
    invoice: legacy.invoice,
    history: legacy.history,
    meta: legacy.meta,
    ...overrides,
  })
}

export function appendHistory(record, event, payload = {}) {
  const entry = {
    id: createId('evt'),
    event,
    at: new Date().toISOString(),
    payload,
  }
  return {
    ...record,
    history: [...(record.history || []), entry].slice(-80),
    meta: {
      ...(record.meta || {}),
      updatedAt: entry.at,
    },
  }
}
