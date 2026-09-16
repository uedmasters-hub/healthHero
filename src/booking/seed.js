/** Demo + catalog seeds for multi-service upcoming bookings */

import { BOOKING_EVENT, BOOKING_STATUS } from './constants'
import { createBookingRecord } from './models'
import { SERVICE_TYPE } from './serviceTypes'
import { DEMO_USER_ID } from '../user/constants'

function daysFromNow(days, hour = 10, minute = 0) {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMilliseconds(0)
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function dateSnapshot(date) {
  return {
    day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
    num: date.getDate(),
    month: date.toLocaleDateString('en-IN', { month: 'short' }),
    monthLong: date.toLocaleDateString('en-IN', { month: 'long' }),
    year: date.getFullYear(),
    full: date.toISOString(),
  }
}

function clockLabel(date) {
  let h = date.getHours()
  const m = date.getMinutes()
  const mer = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${mer}`
}

const SEED_CATALOG = [
  {
    id: 'seed_pharmacy_delivery_in',
    serviceType: SERVICE_TYPE.PHARMACY_DELIVERY,
    status: BOOKING_STATUS.UPCOMING,
    providerName: 'HealthHero Pharmacy',
    providerSubtitle: 'Prescription delivery',
    providerIcon: 'pharmacy',
    days: 0,
    hour: 16,
    minute: 30,
    duration: '45 min',
    visitType: 'Delivery',
  },
  {
    id: 'seed_home_care_in',
    serviceType: SERVICE_TYPE.HOME_CARE_NURSING,
    status: BOOKING_STATUS.CONFIRMED,
    providerName: 'Nurse Priya Kapoor',
    providerSubtitle: 'Home nursing · Wound care',
    providerIcon: 'nurse',
    providerPhoto: '/img/doctors/doctor-w2.png',
    days: 1,
    hour: 11,
    minute: 0,
    duration: '60 min',
    visitType: 'Home Visit',
  },
  {
    id: 'seed_lab_test_in',
    serviceType: SERVICE_TYPE.LAB_TEST,
    status: BOOKING_STATUS.CONFIRMED,
    providerName: 'Thyrocare Diagnostics',
    providerSubtitle: 'Fasting blood panel',
    providerIcon: 'lab',
    days: 2,
    hour: 8,
    minute: 0,
    duration: '20 min',
    visitType: 'Lab Visit',
  },
  {
    id: 'seed_virtual_in',
    serviceType: SERVICE_TYPE.VIRTUAL_CONSULTATION,
    status: BOOKING_STATUS.UPCOMING,
    doctor: {
      id: 3,
      name: 'Dr. Ananya Reddy',
      specialty: 'Pediatrician',
      rating: 4.9,
      photo: '/img/doctors/doctor-w3.png',
      fee: 900,
    },
    days: 3,
    hour: 18,
    minute: 0,
    duration: '20 min',
    visitType: 'Video Consultation',
  },
]

export function buildSeedRecords(now = Date.now()) {
  return SEED_CATALOG.map((item, index) => {
    const start = daysFromNow(item.days, item.hour, item.minute)
    const createdAt = new Date(now - (index + 1) * 60_000).toISOString()
    return createBookingRecord({
      id: item.id,
      userId: DEMO_USER_ID,
      status: item.status,
      serviceType: item.serviceType,
      providerName: item.providerName,
      providerSubtitle: item.providerSubtitle,
      providerIcon: item.providerIcon,
      doctor: item.doctor || {
        id: item.id,
        name: item.providerName,
        specialty: item.providerSubtitle,
        photo: item.providerPhoto || '',
        rating: null,
      },
      date: dateSnapshot(start),
      time: clockLabel(start),
      visitType: item.visitType,
      duration: item.duration,
      preparationCompleted: true,
      patient: { name: 'Ananya Sharma', relationship: 'Self' },
      meta: {
        createdAt,
        updatedAt: createdAt,
        confirmedAt: createdAt,
        seeded: true,
      },
    })
  })
}

/**
 * Ensure demo multi-service bookings exist without clobbering real user bookings.
 * Seeds are upserted by stable id only when missing.
 */
export function ensureCarouselSeeds(repo) {
  const existingIds = new Set(repo.getAll().map((b) => b.id))
  const seeds = buildSeedRecords()
  let added = 0
  seeds.forEach((seed) => {
    if (existingIds.has(seed.id)) return
    repo.upsert(seed, {
      event: BOOKING_EVENT.CREATED,
      payload: { source: 'carousel_seed' },
      silent: true,
    })
    added += 1
  })
  if (added > 0) {
    // Force one notify after batch
    const active = repo.getActive()
    repo.setActive(active?.id || repo.getAll()[0]?.id || null)
  }
  return added
}
