export const USER_DB_VERSION = 1

export const STORAGE_KEYS = Object.freeze({
  DB: 'healthhero:users.v1',
  SESSION: 'healthhero:session.v1',
})

export const DEMO_USER_ID = 'user_raemsh'
export const DEMO_EMAIL = 'ramesh@email.com'
export const DEMO_PHONE = '9845271970'
export const DEMO_PASSWORD = 'HealthHero@123'

export const AUTH_ERROR = Object.freeze({
  INVALID: 'Check your email or mobile number and password, then try again.',
  EXISTS: 'An account with this email or mobile number already exists.',
  WEAK: 'Use at least 8 characters with a letter and a number.',
  MISMATCH: 'Passwords do not match.',
  REQUIRED: 'Please fill in every required field.',
  IDENTIFIER: 'Enter your email or mobile number.',
  PASSWORD: 'Enter your password.',
  CONFIRM: 'Confirm your password.',
  PHONE: 'Enter a valid 10-digit Indian mobile number.',
  EMAIL: 'Enter a valid email address.',
  NAME: 'Enter your full name.',
})
