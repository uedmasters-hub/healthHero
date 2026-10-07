/**
 * @file src/components/system/systemStates.js
 * Single catalog for every error, connection and system state. Copy, art,
 * tone and recovery actions live here so every surface (full page, inline
 * card, compact row) speaks the same language.
 *
 * Actions: retry · refresh · back · home · signIn · checkConnection · contact
 * Tones map to icon surfaces: brand · info · warning · danger · muted · success
 */

export const SYSTEM_STATES = Object.freeze({
  'bad-request': {
    code: '400',
    eyebrow: 'Error 400 · Bad request',
    title: 'Let’s try that again',
    message: 'Part of that request needs another look. Go back and try once more.',
    art: 'document',
    tone: 'warning',
    actions: ['back', 'home'],
  },
  unauthorized: {
    code: '401',
    eyebrow: 'Error 401 · Sign-in required',
    title: 'Sign in to continue',
    message: 'This page is for signed-in members. Sign in and we’ll bring you right back here.',
    art: 'lock',
    tone: 'brand',
    actions: ['signIn', 'home'],
  },
  forbidden: {
    code: '403',
    eyebrow: 'Error 403 · Forbidden',
    title: 'This area is private',
    message: 'Your account opens other parts of eMedicalls. Contact support if you need access here.',
    art: 'shield',
    tone: 'danger',
    actions: ['back', 'home', 'contact'],
  },
  'not-found': {
    code: '404',
    eyebrow: 'Error 404 · Page not found',
    title: 'This page has moved',
    message: 'The link may be old or mistyped. Head Home and pick up from there.',
    art: 'compass',
    tone: 'brand',
    actions: ['home', 'back'],
  },
  timeout: {
    code: '408',
    eyebrow: 'Error 408 · Request timeout',
    title: 'That took longer than expected',
    message: 'Your request paused before it finished. Retry and it should go through.',
    art: 'hourglass',
    tone: 'warning',
    actions: ['retry', 'home'],
  },
  'rate-limited': {
    code: '429',
    eyebrow: 'Error 429 · Too many requests',
    title: 'Let’s take a short pause',
    message: 'Several requests arrived in quick succession. Retry opens again in a moment.',
    art: 'gauge',
    tone: 'warning',
    actions: ['retry', 'home'],
    cooldownSeconds: 30,
  },
  'server-error': {
    code: '500',
    eyebrow: 'Error 500 · Server error',
    title: 'We’re fixing a hiccup',
    message: 'Our servers ran into an unexpected issue. Your data is safe — retry in a moment.',
    art: 'server',
    tone: 'danger',
    actions: ['retry', 'home', 'contact'],
  },
  'bad-gateway': {
    code: '502',
    eyebrow: 'Error 502 · Bad gateway',
    title: 'Reconnecting to our services',
    message: 'A service we rely on answered unexpectedly. Retry in a moment to continue.',
    art: 'server',
    tone: 'danger',
    actions: ['retry', 'home'],
  },
  unavailable: {
    code: '503',
    eyebrow: 'Error 503 · Service unavailable',
    title: 'We’ll be right back',
    message: 'Our service is busy or briefly paused. Retry in a few minutes.',
    art: 'server',
    tone: 'info',
    actions: ['retry', 'home'],
  },
  'gateway-timeout': {
    code: '504',
    eyebrow: 'Error 504 · Gateway timeout',
    title: 'Our services are responding slowly',
    message: 'The server took longer than usual to answer. Retry to pick up where you left off.',
    art: 'hourglass',
    tone: 'info',
    actions: ['retry', 'home'],
  },
  offline: {
    eyebrow: 'No connection',
    title: 'You’re offline',
    message: 'Check your Wi-Fi or mobile data. We’ll reconnect automatically as soon as you’re back online.',
    art: 'wifi-off',
    tone: 'muted',
    actions: ['checkConnection', 'home'],
  },
  slow: {
    eyebrow: 'Slow connection',
    title: 'Your connection is slow',
    message: 'Pages may take longer to load. Stay here while we keep trying, or retry now.',
    art: 'signal',
    tone: 'warning',
    actions: ['retry', 'home'],
  },
  maintenance: {
    eyebrow: 'Scheduled maintenance',
    title: 'We’re upgrading eMedicalls',
    message: 'Improvements are on the way and we’ll be back shortly. Thank you for your patience.',
    art: 'tools',
    tone: 'brand',
    actions: ['refresh', 'contact'],
  },
  generic: {
    eyebrow: 'Unexpected error',
    title: 'Something went wrong',
    message: 'Let’s get you back on track. Retry, or head Home and continue from there.',
    art: 'alert',
    tone: 'danger',
    actions: ['retry', 'home'],
  },
  empty: {
    eyebrow: null,
    title: 'Nothing here yet',
    message: 'As soon as there’s something to show, it will appear here.',
    art: 'inbox',
    tone: 'muted',
    actions: [],
  },
  'session-expired': {
    eyebrow: 'Session expired',
    title: 'Your session has ended',
    message: 'For your security we signed you out. Sign in to pick up right where you left off.',
    art: 'clock',
    tone: 'brand',
    actions: ['signIn'],
  },
  restricted: {
    eyebrow: 'Permission required',
    title: 'Permission needed',
    message: 'Allow access in your browser or device settings to use this feature, then retry.',
    art: 'key',
    tone: 'warning',
    actions: ['retry', 'back'],
  },
  missing: {
    eyebrow: null,
    title: 'This is no longer available',
    message: 'It may have been completed, cancelled or moved. Taking you Home to continue.',
    art: 'document',
    tone: 'muted',
    actions: ['home'],
  },
  loading: {
    eyebrow: null,
    title: 'Getting things ready',
    message: 'This only takes a moment.',
    art: 'spinner',
    tone: 'brand',
    actions: [],
  },
})

export const SYSTEM_STATE_GROUPS = Object.freeze([
  { label: 'Request errors (4xx)', keys: ['bad-request', 'unauthorized', 'forbidden', 'not-found', 'timeout', 'rate-limited'] },
  { label: 'Server errors (5xx)', keys: ['server-error', 'bad-gateway', 'unavailable', 'gateway-timeout'] },
  { label: 'Connection', keys: ['offline', 'slow'] },
  { label: 'System & account', keys: ['maintenance', 'generic', 'session-expired', 'restricted'] },
  { label: 'Content', keys: ['empty', 'missing', 'loading'] },
])

const STATUS_TO_STATE = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  408: 'timeout',
  429: 'rate-limited',
  500: 'server-error',
  502: 'bad-gateway',
  503: 'unavailable',
  504: 'gateway-timeout',
}

export function resolveSystemState(key) {
  if (key && SYSTEM_STATES[key]) return key
  const byCode = STATUS_TO_STATE[Number(key)]
  return byCode || 'generic'
}

/**
 * Map any thrown / returned error (fetch, Supabase PostgREST, auth) to a
 * catalog key. Unknown shapes resolve to `generic`.
 */
export function stateFromError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (!error) return 'generic'
  const message = String(error.message || error.error_description || error || '')
  const name = String(error.name || '')
  const status = Number(error.status || error.statusCode || error.code) || 0
  const pgCode = String(error.code || '')

  if (/jwt expired|refresh token|session.*(expired|missing)/i.test(message)) return 'session-expired'
  if (name === 'TimeoutError' || /timed? ?out|timeout/i.test(message)) return status === 504 ? 'gateway-timeout' : 'timeout'
  if (name === 'AbortError') return 'timeout'
  if (pgCode === '42501' || /permission denied|row-level security/i.test(message)) return 'forbidden'
  if (pgCode === 'PGRST116') return 'not-found'
  if (STATUS_TO_STATE[status]) return STATUS_TO_STATE[status]
  if (status >= 500) return 'server-error'
  if (name === 'TypeError' || /failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'unavailable'
  }
  return 'generic'
}
