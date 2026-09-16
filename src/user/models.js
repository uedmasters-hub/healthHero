import { formatAppDate } from '../lib/locale'

export function ageFromDob(dob) {
  if (!dob) return null
  const match = String(dob).match(/^(\d{4})-(\d{2})-(\d{2})/)
  const born = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dob)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const month = now.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1
  return age
}

export function createId(prefix = 'usr') {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function digitsOnly(value = '') {
  return String(value).replace(/\D/g, '')
}

export function indianMobile(value = '') {
  const digits = digitsOnly(value)
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits.slice(-10)
}

export function formatIndianPhone(value = '') {
  const mobile = indianMobile(value)
  if (mobile.length !== 10) return value || ''
  return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
}

export function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase()
}

export function initialsFromName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function emptyRecords() {
  return { consultations: [], reports: [], medications: [] }
}

export function createMember(partial = {}) {
  const relationship = partial.relationship || 'Family Member'
  const dob = partial.dob || ''
  return {
    id: partial.id || createId('mem'),
    name: (partial.name || '').trim(),
    dob,
    age: Number(partial.age) || ageFromDob(dob) || null,
    gender: partial.gender || '',
    phone: formatIndianPhone(partial.phone || ''),
    address: (partial.address || '').trim(),
    relationship,
    category: relationship === 'Self' ? 'self' : relationship === 'Child' ? 'children' : 'family',
  }
}

export function createAddress(partial = {}) {
  return {
    id: partial.id || createId('addr'),
    label: partial.label || 'Home',
    line: partial.line || '',
    city: partial.city || '',
    isDefault: Boolean(partial.isDefault),
  }
}

export function createUserRecord({
  id,
  email,
  phone,
  passwordHash,
  salt,
  profile = {},
  members = [],
  records,
  health,
  emergencyContacts,
  insurancePolicies,
  prescriptions = [],
  notifications = [],
  addresses = [],
  paymentMethods = [],
  paymentHistory = [],
  pharmacyOrders = [],
  savedInsightIds = [],
  reviews = {},
} = {}) {
  const now = new Date().toISOString()
  const name = profile.name || ''
  return {
    id: id || createId('user'),
    credentials: {
      email: normalizeEmail(email),
      phone: indianMobile(phone),
      passwordHash,
      salt,
    },
    profile: {
      name,
      dob: profile.dob || '',
      age: Number(profile.age) || ageFromDob(profile.dob) || null,
      gender: profile.gender || '',
      bloodGroup: profile.bloodGroup || '',
      height: profile.height || '',
      weight: profile.weight || '',
      address: profile.address || '',
      city: profile.city || '',
      avatar: profile.avatar || '',
      emergencyContact: profile.emergencyContact || { name: '', relation: '', phone: '' },
      insurance: profile.insurance || { provider: '', policyNo: '', validTill: '' },
    },
    members: members.map(createMember),
    records: records || emptyRecords(),
    health: {
      reports: [],
      prescriptions: [],
      diagnoses: [],
      medications: [],
      allergies: [],
      conditions: [],
      surgeries: [],
      vaccinations: [],
      consultations: [],
      ...(health || {}),
    },
    emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
    insurancePolicies: Array.isArray(insurancePolicies) ? insurancePolicies : [],
    prescriptions,
    notifications,
    addresses: addresses.length
      ? addresses.map(createAddress)
      : profile.address
        ? [createAddress({ id: 'addr-home', label: 'Home', line: profile.address, city: profile.city, isDefault: true })]
        : [],
    paymentMethods,
    paymentHistory,
    pharmacyOrders,
    savedInsightIds,
    reviews,
    meta: {
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
  }
}

export function publicUser(user) {
  if (!user) return null
  const { credentials, ...rest } = user
  return {
    ...rest,
    email: credentials.email,
    phone: formatIndianPhone(credentials.phone),
  }
}

export function profileView(user) {
  if (!user) return null
  const { profile, credentials } = user
  const age = ageFromDob(profile.dob) || profile.age || null
  return {
    id: user.id,
    name: profile.name,
    email: credentials.email,
    phone: formatIndianPhone(credentials.phone),
    dob: profile.dob ? formatAppDate(profile.dob) : '',
    age,
    gender: profile.gender,
    bloodGroup: profile.bloodGroup,
    height: profile.height,
    weight: profile.weight,
    address: profile.address,
    city: profile.city,
    avatar: profile.avatar,
    initials: initialsFromName(profile.name),
    emergencyContact: profile.emergencyContact,
    insurance: profile.insurance,
  }
}

export function isPatientProfileComplete(patient) {
  if (!patient) return false
  const nameOk = String(patient.name || '').trim().length >= 2
  const ageOk = Boolean(Number(patient.age)) || Boolean(patient.dob)
  const genderOk = Boolean(patient.gender)
  const phoneOk = indianMobile(patient.phone).length === 10
  return nameOk && ageOk && genderOk && phoneOk
}

export function selfMember(user) {
  if (!user) return null
  return createMember({
    id: 'self',
    name: user.profile.name,
    dob: user.profile.dob,
    age: user.profile.age,
    gender: user.profile.gender,
    phone: user.credentials.phone,
    address: user.profile.address,
    relationship: 'Self',
    category: 'self',
  })
}

export function membersForBooking(user) {
  if (!user) return []
  return [selfMember(user), ...(user.members || [])]
}

export function createSession(userId) {
  return {
    userId,
    issuedAt: new Date().toISOString(),
  }
}
