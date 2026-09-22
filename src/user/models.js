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

/**
 * Derive a Date of Birth string (YYYY-MM-DD) from an age in years.
 * If an existing DOB is provided, its month and day are preserved so the
 * result stays as close as possible to the original date.  When no DOB is
 * available, January 1st of the calculated birth year is used.
 * Returns null for invalid / missing input.
 */
export function ageToDob(age, existingDob) {
  const n = Number(age)
  if (!Number.isFinite(n) || n < 0 || n > 150) return null
  const now = new Date()
  const birthYear = now.getFullYear() - Math.round(n)
  let month = 0
  let day = 1
  if (existingDob) {
    const match = String(existingDob).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      month = Number(match[2]) - 1
      day = Number(match[3])
    }
  }
  const birthDate = new Date(birthYear, month, day)
  const mm = String(birthDate.getMonth() + 1).padStart(2, '0')
  const dd = String(birthDate.getDate()).padStart(2, '0')
  return `${birthDate.getFullYear()}-${mm}-${dd}`
}

// ── Height / Weight helpers ────────────────────────────────────────────────

const HEIGHT_UNIT = 'cm'
const WEIGHT_UNIT = 'kg'

/**
 * Extract the leading numeric value from a height/weight string.
 * Returns the raw number (no unit) or null when no digit sequence is found.
 *   parseMeasurement('168 cm')  → 168
 *   parseMeasurement('65.5')    → 65.5
 *   parseMeasurement('')        → null
 */
export function parseMeasurement(value) {
  if (value == null) return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

/**
 * Strip any unit suffix and return just the numeric portion as a string.
 * Used when loading stored values into the edit form so the user sees only
 * the number (e.g. "163 cm" → "163", "76" → "76").
 *   numericValue('163 cm')  → '163'
 *   numericValue('76')      → '76'
 *   numericValue('')        → ''
 */
export function numericValue(value) {
  const n = parseMeasurement(value)
  return n != null ? String(n) : ''
}

/**
 * Normalize a stored or raw value for height.
 * Extracts the number and appends "cm". Strips duplicate unit tokens.
 * Intended for use on save only, NOT on each keystroke.
 *   normalizeHeight('163')      → '163 cm'
 *   normalizeHeight('163 cm')   → '163 cm'
 *   normalizeHeight('163 cm cm')→ '163 cm'
 *   normalizeHeight('abc')      → ''
 */
export function normalizeHeight(value) {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const num = raw.match(/(\d+(?:\.\d+)?)/)
  if (!num) return ''
  return `${num[1]} ${HEIGHT_UNIT}`
}

/**
 * Normalize a stored or raw value for weight.
 * Same rules as normalizeHeight but with "kg".
 */
export function normalizeWeight(value) {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const num = raw.match(/(\d+(?:\.\d+)?)/)
  if (!num) return ''
  return `${num[1]} ${WEIGHT_UNIT}`
}

/**
 * Format a stored height for display.
 * Backward-compatible: plain numbers ("168") are shown as "168 cm".
 *   formatHeight('168')    → '168 cm'
 *   formatHeight('168 cm') → '168 cm'
 *   formatHeight('')       → ''
 */
export function formatHeight(value) {
  if (!value) return ''
  const n = parseMeasurement(value)
  return n != null ? `${n} ${HEIGHT_UNIT}` : ''
}

/**
 * Format a stored weight for display.
 *   formatWeight('65')    → '65 kg'
 *   formatWeight('65 kg') → '65 kg'
 */
export function formatWeight(value) {
  if (!value) return ''
  const n = parseMeasurement(value)
  return n != null ? `${n} ${WEIGHT_UNIT}` : ''
}

export function createId(prefix = 'usr') {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function digitsOnly(value = '') {
  return String(value).replace(/\D/g, '')
}

/** Normalize to a 10-digit Nepal mobile (strips +977 / legacy +91 / leading 0). */
export function nepalMobile(value = '') {
  const digits = digitsOnly(value)
  if (digits.length >= 13 && digits.startsWith('977')) return digits.slice(3, 13)
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits.slice(-10)
}

/** @deprecated Use nepalMobile — kept for existing imports */
export const indianMobile = nepalMobile

export function formatNepalPhone(value = '') {
  const mobile = nepalMobile(value)
  if (mobile.length !== 10) return value || ''
  return `+977 ${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`
}

/** @deprecated Use formatNepalPhone */
export const formatIndianPhone = formatNepalPhone

// ── Flexible phone helpers (international) ──────────────────────────────────

/**
 * Strip everything except digits. Returns the raw digit string.
 *   phoneDigits('+1 (415) 555-2671') → '14155552671'
 *   phoneDigits('91 98765 43210')     → '919876543210'
 */
export function phoneDigits(value = '') {
  return digitsOnly(value)
}

/**
 * Format a phone string for the edit form: keep only digits, cap at 10.
 * Country code is handled separately by PhoneInput.
 */
export function phoneInput(value = '') {
  return phoneDigits(value).slice(0, 10)
}

/**
 * Normalize a phone number for storage.
 * If it already starts with a country code (len >= 11), keep the full digits.
 * If exactly 10 digits (no country code), prefix with "977" (Nepal default).
 * Returns the full digit string or empty.
 *   normalizePhone('9841234567')   → '9779841234567'
 *   normalizePhone('9779841234567')→ '9779841234567'
 *   normalizePhone('919876543210') → '919876543210' (legacy kept)
 */
export function normalizePhone(value = '') {
  const digits = phoneDigits(value)
  if (!digits) return ''
  if (digits.length >= 11) return digits
  if (digits.length === 10) return `977${digits}`
  return digits
}

/**
 * Format a stored phone for display.
 *   formatPhone('9779841234567') → '+977 984 123 4567'
 *   formatPhone('9841234567')    → '+977 984 123 4567' (legacy 10-digit)
 */
export function formatPhone(value = '') {
  const digits = phoneDigits(value)
  if (!digits) return ''
  if (digits.length === 10) return formatNepalPhone(digits)
  if (digits.startsWith('977') && digits.length === 13) return formatNepalPhone(digits)
  if (digits.startsWith('91') && digits.length === 12) return formatNepalPhone(digits)
  return `+${digits}`
}

/**
 * Phone validity: exactly 10 digits (local number, country code separate).
 */
export function isValidPhone(value = '') {
  const digits = phoneDigits(value)
  return digits.length === 10
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
    phone: formatNepalPhone(partial.phone || ''),
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
      phone: nepalMobile(phone),
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
      phoneVerified: profile.phoneVerified || false,
      emailVerified: profile.emailVerified || false,
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
    phone: formatNepalPhone(credentials.phone),
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
    phone: formatPhone(credentials.phone),
    phoneRaw: credentials.phone || '',
    phoneVerified: profile.phoneVerified || false,
    emailVerified: profile.emailVerified || false,
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
  const phoneOk = nepalMobile(patient.phone).length === 10
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
