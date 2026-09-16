import { AUTH_ERROR, DEMO_USER_ID } from './constants'
import { bindBookingEngine } from '../booking/engine'
import { setPaymentSessionScope } from '../lib/paymentSession'
import { createSalt, hashSecret, secretsMatch } from './crypto'
import {
  createHealthItem,
  createEmergencyContact,
  createInsurancePolicy,
  emptyHealth,
  normalizeHealthState,
  recordsFromHealth,
} from './health'
import { ageFromDob, createAddress, createId, createMember, createSession, createUserRecord, emptyRecords, indianMobile, normalizeEmail, publicUser, selfMember } from './models'
import { loadDatabase, loadSession, saveDatabase, saveSession } from './persistence'
import { buildDemoUser } from './seed'

function applyHealthNormalize(user) {
  if (!user) return user
  const extra = normalizeHealthState(user)
  const primaryAddress = extra.addresses.find((item) => item.isDefault) || extra.addresses[0]
  return {
    ...user,
    ...extra,
    profile: {
      ...user.profile,
      address: primaryAddress?.line || user.profile?.address || '',
      city: primaryAddress?.city || user.profile?.city || '',
      emergencyContact: extra.emergencyContacts[0] || user.profile?.emergencyContact || { name: '', relation: '', phone: '' },
      insurance: extra.insurancePolicies[0] || user.profile?.insurance || { provider: '', policyNo: '', validTill: '' },
    },
  }
}

let db = loadDatabase()
Object.keys(db.users || {}).forEach((id) => {
  db.users[id] = applyHealthNormalize(db.users[id])
})
saveDatabase(db)
let session = loadSession()
if (session?.userId && !db.users[session.userId]) {
  session = null
  saveSession(null)
}
const listeners = new Set()
let snapshot = { db, session, user: null }

function currentUser() {
  if (!session?.userId) return null
  return db.users[session.userId] || null
}

function refreshSnapshot() {
  snapshot = { db, session, user: currentUser() }
}

refreshSnapshot()

function notify() {
  refreshSnapshot()
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      /* ignore */
    }
  })
}

function persist() {
  saveDatabase(db)
  saveSession(session)
}

function syncScopedServices() {
  const userId = session?.userId || null
  setPaymentSessionScope(userId)
  bindBookingEngine(userId)
}

syncScopedServices()

export { currentUser }

export function subscribeUserStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getUserSnapshot() {
  return snapshot
}

export async function ensureDemoUser() {
  if (db.users[DEMO_USER_ID]) return db.users[DEMO_USER_ID]
  const demo = applyHealthNormalize(await buildDemoUser())
  db.users[demo.id] = demo
  db.emailIndex[demo.credentials.email] = demo.id
  db.phoneIndex[demo.credentials.phone] = demo.id
  persist()
  notify()
  return demo
}

function findUserId(identifier) {
  const email = normalizeEmail(identifier)
  if (email.includes('@') && db.emailIndex[email]) return db.emailIndex[email]
  const phone = indianMobile(identifier)
  if (phone.length === 10 && db.phoneIndex[phone]) return db.phoneIndex[phone]
  return null
}

export async function loginWithPassword(identifier, password) {
  const userId = findUserId(identifier)
  const user = userId ? db.users[userId] : null
  if (!user) return { ok: false, error: AUTH_ERROR.INVALID }
  const matches = await secretsMatch(password, user.credentials.salt, user.credentials.passwordHash)
  if (!matches) return { ok: false, error: AUTH_ERROR.INVALID }
  const next = {
    ...user,
    meta: { ...user.meta, lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  }
  db.users[user.id] = next
  session = createSession(user.id)
  persist()
  syncScopedServices()
  notify()
  return { ok: true, user: publicUser(next) }
}

export async function registerAccount({ name, email, phone, password }) {
  const normalizedEmail = normalizeEmail(email)
  const mobile = indianMobile(phone)
  if (db.emailIndex[normalizedEmail] || db.phoneIndex[mobile]) {
    return { ok: false, error: AUTH_ERROR.EXISTS }
  }
  const salt = createSalt()
  const passwordHash = await hashSecret(password, salt)
  const user = createUserRecord({
    email: normalizedEmail,
    phone: mobile,
    passwordHash,
    salt,
    profile: {
      name: name.trim(),
      address: '',
      city: '',
    },
    members: [],
    records: emptyRecords(),
    prescriptions: [],
    notifications: [],
    addresses: [],
    paymentMethods: [],
    paymentHistory: [],
    pharmacyOrders: [],
    savedInsightIds: [],
    reviews: {},
  })
  db.users[user.id] = applyHealthNormalize(user)
  db.emailIndex[normalizedEmail] = user.id
  db.phoneIndex[mobile] = user.id
  session = createSession(user.id)
  persist()
  syncScopedServices()
  notify()
  return { ok: true, user: publicUser(user) }
}

export function logout() {
  session = null
  persist()
  syncScopedServices()
  notify()
}

export function patchCurrentUser(updater) {
  const user = currentUser()
  if (!user) return null
  const partial = typeof updater === 'function' ? updater(user) : updater
  const next = {
    ...user,
    ...partial,
    credentials: {
      ...user.credentials,
      ...(partial.credentials || {}),
    },
    profile: { ...user.profile, ...(partial.profile || {}) },
    meta: {
      ...user.meta,
      ...(partial.meta || {}),
      updatedAt: new Date().toISOString(),
    },
  }
  db.users[user.id] = next
  persist()
  notify()
  return next
}

export function completeSelfProfile(input = {}) {
  const user = currentUser()
  if (!user) return { ok: false, error: AUTH_ERROR.REQUIRED }
  const name = String(input.name || user.profile.name || '').trim()
  const dob = input.dob || user.profile.dob || ''
  const gender = String(input.gender || '').trim()
  const address = String(input.address ?? user.profile.address ?? '').trim()
  const mobile = indianMobile(input.phone || user.credentials.phone)
  const age = Number(input.age) || ageFromDob(dob) || null

  if (name.length < 2 || !gender || (!age && !dob) || mobile.length !== 10) {
    return { ok: false, error: AUTH_ERROR.REQUIRED }
  }

  if (mobile !== user.credentials.phone) {
    const taken = db.phoneIndex[mobile]
    if (taken && taken !== user.id) return { ok: false, error: AUTH_ERROR.EXISTS }
    if (user.credentials.phone) delete db.phoneIndex[user.credentials.phone]
    db.phoneIndex[mobile] = user.id
  }

  const next = patchCurrentUser((current) => {
    let addresses = [...(current.addresses || [])]
    if (address) {
      const defaultIdx = addresses.findIndex((entry) => entry.isDefault)
      if (defaultIdx >= 0) {
        addresses[defaultIdx] = { ...addresses[defaultIdx], line: address }
      } else if (addresses.length) {
        addresses[0] = { ...addresses[0], line: address, isDefault: true }
      } else {
        addresses = [createAddress({ label: 'Home', line: address, city: current.profile.city || '', isDefault: true })]
      }
    }
    return {
      credentials: { phone: mobile },
      addresses,
      profile: { name, dob, gender, address, age },
    }
  })
  return { ok: true, member: selfMember(next) }
}

export function updatePersonalProfile(input = {}) {
  const user = currentUser()
  if (!user) return { ok: false, error: AUTH_ERROR.REQUIRED }
  const name = String(input.name || '').trim()
  const dob = input.dob || ''
  const gender = String(input.gender || '').trim()
  const address = String(input.address ?? user.profile.address ?? '').trim()
  const mobile = indianMobile(input.phone || user.credentials.phone)
  const age = Number(input.age) || ageFromDob(dob) || null
  if (name.length < 2) return { ok: false, error: AUTH_ERROR.NAME }
  if (mobile.length && mobile.length !== 10) return { ok: false, error: AUTH_ERROR.PHONE }

  if (mobile.length === 10 && mobile !== user.credentials.phone) {
    const taken = db.phoneIndex[mobile]
    if (taken && taken !== user.id) return { ok: false, error: AUTH_ERROR.EXISTS }
    if (user.credentials.phone) delete db.phoneIndex[user.credentials.phone]
    db.phoneIndex[mobile] = user.id
  }

  patchCurrentUser((current) => {
    let addresses = [...(current.addresses || [])]
    if (address) {
      const defaultIdx = addresses.findIndex((entry) => entry.isDefault)
      if (defaultIdx >= 0) {
        addresses[defaultIdx] = { ...addresses[defaultIdx], line: address }
      } else if (addresses.length) {
        addresses[0] = { ...addresses[0], line: address, isDefault: true }
      } else {
        addresses = [createAddress({ label: 'Home', line: address, city: current.profile.city || '', isDefault: true })]
      }
    }
    return {
      credentials: { phone: mobile.length === 10 ? mobile : current.credentials.phone },
      addresses,
      profile: {
        name,
        dob,
        age,
        gender,
        bloodGroup: input.bloodGroup ?? current.profile.bloodGroup,
        height: input.height ?? current.profile.height,
        weight: input.weight ?? current.profile.weight,
        address,
      },
    }
  })
  return { ok: true }
}

function withHealth(health) {
  return {
    health,
    records: recordsFromHealth(health),
  }
}

export function upsertHealthItem(kind, input) {
  const item = createHealthItem(kind, input)
  patchCurrentUser((user) => {
    const health = { ...emptyHealth(), ...(user.health || {}) }
    const list = health[kind] || []
    const index = list.findIndex((entry) => entry.id === item.id)
    health[kind] = index >= 0
      ? list.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...list]
    return withHealth(health)
  })
  return item
}

export function removeHealthItem(kind, id) {
  return patchCurrentUser((user) => {
    const health = { ...emptyHealth(), ...(user.health || {}) }
    health[kind] = (health[kind] || []).filter((entry) => entry.id !== id)
    return withHealth(health)
  })
}

export function upsertEmergencyContact(input) {
  const item = createEmergencyContact(input)
  patchCurrentUser((user) => {
    const list = user.emergencyContacts || []
    const index = list.findIndex((entry) => entry.id === item.id)
    const emergencyContacts = index >= 0
      ? list.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...list]
    return {
      emergencyContacts,
      profile: { emergencyContact: emergencyContacts[0] || { name: '', relation: '', phone: '' } },
    }
  })
  return item
}

export function removeEmergencyContact(id) {
  return patchCurrentUser((user) => {
    const emergencyContacts = (user.emergencyContacts || []).filter((entry) => entry.id !== id)
    return {
      emergencyContacts,
      profile: { emergencyContact: emergencyContacts[0] || { name: '', relation: '', phone: '' } },
    }
  })
}

export function upsertInsurancePolicy(input) {
  const item = createInsurancePolicy(input)
  patchCurrentUser((user) => {
    const list = user.insurancePolicies || []
    const index = list.findIndex((entry) => entry.id === item.id)
    const insurancePolicies = index >= 0
      ? list.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...list]
    return {
      insurancePolicies,
      profile: { insurance: insurancePolicies[0] || { provider: '', policyNo: '', validTill: '' } },
    }
  })
  return item
}

export function removeInsurancePolicy(id) {
  return patchCurrentUser((user) => {
    const insurancePolicies = (user.insurancePolicies || []).filter((entry) => entry.id !== id)
    return {
      insurancePolicies,
      profile: { insurance: insurancePolicies[0] || { provider: '', policyNo: '', validTill: '' } },
    }
  })
}

export function upsertSavedAddress(input) {
  const item = createAddress(input)
  patchCurrentUser((user) => {
    let addresses = [...(user.addresses || [])]
    if (item.isDefault) addresses = addresses.map((entry) => ({ ...entry, isDefault: false }))
    const index = addresses.findIndex((entry) => entry.id === item.id)
    const nextItem = { ...item, isDefault: item.isDefault || addresses.length === 0 }
    addresses = index >= 0
      ? addresses.map((entry) => (entry.id === item.id ? nextItem : entry))
      : [nextItem, ...addresses]
    const primary = addresses.find((entry) => entry.isDefault) || addresses[0]
    return {
      addresses,
      profile: { address: primary?.line || '', city: primary?.city || user.profile.city || '' },
    }
  })
  return item
}

export function removeSavedAddress(id) {
  return patchCurrentUser((user) => {
    const addresses = (user.addresses || []).filter((entry) => entry.id !== id)
    if (addresses.length && !addresses.some((entry) => entry.isDefault)) {
      addresses[0] = { ...addresses[0], isDefault: true }
    }
    const primary = addresses.find((entry) => entry.isDefault) || addresses[0]
    return {
      addresses,
      profile: { address: primary?.line || '', city: primary?.city || '' },
    }
  })
}

export function addFamilyMember(input) {
  const member = createMember(input)
  patchCurrentUser((user) => ({
    members: [member, ...(user.members || [])],
  }))
  return member
}

export function appendPaymentHistory(entry) {
  if (!entry) return null
  return patchCurrentUser((user) => ({
    paymentHistory: [entry, ...(user.paymentHistory || [])],
  }))
}

export function pushNotification(item) {
  const notification = {
    id: item.id || createId('n'),
    title: item.title || 'Notification',
    body: item.body || '',
    time: item.time || 'Just now',
    unread: item.unread !== false,
    type: item.type || 'booking',
    to: item.to || '',
  }
  return patchCurrentUser((user) => ({
    notifications: [notification, ...(user.notifications || [])],
  }))
}

export function markNotificationRead(id) {
  return patchCurrentUser((user) => ({
    notifications: (user.notifications || []).map((item) => (
      item.id === id ? { ...item, unread: false } : item
    )),
  }))
}

export function markAllNotificationsRead() {
  return patchCurrentUser((user) => ({
    notifications: (user.notifications || []).map((item) => ({ ...item, unread: false })),
  }))
}

export function isInsightSaved(id) {
  return (currentUser()?.savedInsightIds || []).includes(id)
}

export function toggleSavedInsight(id) {
  const user = currentUser()
  if (!user || !id) return false
  const saved = (user.savedInsightIds || []).includes(id)
  patchCurrentUser({
    savedInsightIds: saved
      ? user.savedInsightIds.filter((item) => item !== id)
      : [...(user.savedInsightIds || []), id],
  })
  return !saved
}

export function getUserReviews(doctorId) {
  return currentUser()?.reviews?.[String(doctorId)] || []
}

export function upsertUserReview(doctorId, review) {
  const key = String(doctorId)
  return patchCurrentUser((user) => {
    const list = user.reviews?.[key] || []
    const exists = list.some((item) => item.id === review.id)
    return {
      reviews: {
        ...(user.reviews || {}),
        [key]: exists
          ? list.map((item) => (item.id === review.id ? { ...item, ...review } : item))
          : [review, ...list],
      },
    }
  })
}

export function removeUserReview(doctorId, reviewId) {
  const key = String(doctorId)
  return patchCurrentUser((user) => ({
    reviews: {
      ...(user.reviews || {}),
      [key]: (user.reviews?.[key] || []).filter((item) => item.id !== reviewId),
    },
  }))
}
