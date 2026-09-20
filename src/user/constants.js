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
  INVALID: 'Check your email and password, then try again.',
  EXISTS: 'An account with this email already exists.',
  WEAK: 'Use at least 8 characters with a letter and a number.',
  MISMATCH: 'Passwords do not match.',
  REQUIRED: 'Please fill in every required field.',
  IDENTIFIER: 'Enter your email address.',
  PASSWORD: 'Enter your password.',
  CONFIRM: 'Confirm your password.',
  PHONE: 'Enter a valid phone number with country code.',
  PHONE_DUPLICATE: 'This mobile number is already associated with another account. Please use a different number.',
  EMAIL: 'Enter a valid email address.',
  NAME: 'Enter your full name.',
  UNVERIFIED: 'Verify your email before signing in. Check your inbox for a confirmation link.',
  EXPIRED: 'This link or session has expired. Request a new one and try again.',
  NETWORK: 'We could not reach Health Hero. Check your connection and try again.',
  GENERIC: 'Something went wrong. Please try again.',
  OAUTH_CANCELLED: 'Sign-in was cancelled. You can try again when you are ready.',
  OAUTH_FAILED: 'We could not complete social sign-in. Try email or try again later.',
  APPLE_PENDING: 'Apple Sign-In will be available once Health Hero credentials are configured.',
  RESET_SENT: 'If an account matches that email, you will receive a reset link shortly.',
  OTP_INVALID: 'Enter the 6-digit code from your email and try again.',
  OTP_SENT: 'Check your email for a one-time code.',
})
