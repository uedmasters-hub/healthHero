import { AUTH_ERROR } from './constants'
import { indianMobile, normalizeEmail } from './models'

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}

export function isValidIndianMobile(value) {
  return indianMobile(value).length === 10
}

export function isStrongPassword(value) {
  return String(value).length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}

export function passwordStrength(value) {
  const password = String(value || '')
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  const levels = ['empty', 'weak', 'fair', 'good', 'strong']
  if (!password) return { score: 0, label: levels[0], percent: 0 }
  const label = score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong'
  return { score, label, percent: Math.min(100, (score / 4) * 100) }
}

export function validateLogin({ identifier, password }) {
  const errors = validateLoginFields({ identifier, password })
  return errors.identifier || errors.password || null
}

export function validateLoginFields({ identifier, password }) {
  const errors = {}
  if (!String(identifier || '').trim()) errors.identifier = AUTH_ERROR.IDENTIFIER
  else if (!isValidEmail(identifier)) errors.identifier = AUTH_ERROR.EMAIL
  if (!password) errors.password = AUTH_ERROR.PASSWORD
  return errors
}

export function validateRegister({ name, email, phone, password, confirm }) {
  const errors = validateRegisterFields({ name, email, phone, password, confirm })
  return errors.name || errors.email || errors.phone || errors.password || errors.confirm || null
}

export function validatePasswordFields({ password, confirm }) {
  const errors = {}
  if (!isStrongPassword(password)) errors.password = AUTH_ERROR.WEAK
  if (!confirm) errors.confirm = AUTH_ERROR.CONFIRM
  else if (password !== confirm) errors.confirm = AUTH_ERROR.MISMATCH
  return errors
}

export function validateRegisterFields({ name, email, phone, password, confirm }) {
  const errors = {}
  if (!String(name || '').trim() || name.trim().length < 2) errors.name = AUTH_ERROR.NAME
  if (!isValidEmail(email)) errors.email = AUTH_ERROR.EMAIL
  if (!isValidIndianMobile(phone)) errors.phone = AUTH_ERROR.PHONE
  Object.assign(errors, validatePasswordFields({ password, confirm }))
  return errors
}

export function firstInvalidField(order, errors) {
  return order.find((key) => Boolean(errors?.[key])) || null
}
