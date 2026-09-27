/**
 * Video capability engine.
 * Provider order is internal: Tabcom, then LiveKit, then Google Meet.
 * Callers that render UI must not surface the selected provider.
 *
 * Tabcom signal kinds match packages/shared/src/wire.ts CallSignal
 * and the extension call window in apps/extension/entrypoints/call.
 */

export const PROVIDER_ORDER = Object.freeze(['tabcom', 'livekit', 'meet'])

export const READINESS_MS = 12_000
export const READY_MIN = 75
export const USABLE_MIN = 50

export const SESSION_EVENTS = Object.freeze([
  'readiness_started',
  'quality_passed',
  'quality_failed',
  'session_provisioned',
  'joined',
  'ended',
])

export function readinessRoomName(id) {
  const clean = String(id || '').trim().replace(/^readiness-/, '')
  return `readiness-${clean}`
}

export function appointmentRoomName(id) {
  const clean = String(id || '').trim().replace(/^appointment-/, '')
  return `appointment-${clean}`
}

export function isReadinessRoom(name) {
  return String(name || '').startsWith('readiness-')
}

export function isAppointmentRoom(name) {
  return String(name || '').startsWith('appointment-')
}

export function outcomeForScore(score) {
  const value = Number(score)
  if (!Number.isFinite(value)) return 'poor'
  if (value >= READY_MIN) return 'ready'
  if (value >= USABLE_MIN) return 'usable'
  return 'poor'
}

/** Internal 0–100 score. The interface only shows the outcome band. */
export function scoreReadiness(input = {}) {
  if (!input.camera || !input.microphone) return 0
  let score = 18
  const latency = Number(input.latencyMs)
  if (Number.isFinite(latency)) {
    if (latency <= 80) score += 20
    else if (latency <= 150) score += 14
    else if (latency <= 280) score += 8
  }
  const jitter = Number(input.jitterMs)
  if (Number.isFinite(jitter)) {
    if (jitter <= 15) score += 15
    else if (jitter <= 40) score += 8
  }
  const loss = Number(input.packetLoss)
  if (Number.isFinite(loss)) {
    if (loss <= 0.01) score += 15
    else if (loss <= 0.03) score += 8
    else if (loss <= 0.08) score += 3
  }
  if (input.stable) score += 12
  const down = Number(input.downlinkMbps)
  if (Number.isFinite(down)) {
    if (down >= 5) score += 10
    else if (down >= 1.5) score += 6
    else if (down >= 0.4) score += 2
  }
  const up = Number(input.uplinkMbps)
  if (Number.isFinite(up)) {
    if (up >= 2) score += 5
    else if (up >= 0.5) score += 2
  }
  const cores = Number(input.hardwareConcurrency) || 0
  if (cores >= 8) score += 5
  else if (cores >= 4) score += 3
  if (input.speaker === true) score += 3
  else if (input.speaker === false) score -= 6
  if (input.lowPower === true) score -= 4
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Backend transport choice. Tabcom when a direct peer connection can succeed,
 * LiveKit when the browser can do realtime but the path is weak, Meet when
 * the device cannot host a peer connection.
 */
export function selectTransport(input = {}) {
  const outcome = input.outcome || outcomeForScore(input.qualityScore ?? 0)
  if (input.online === false) return { ok: false, reason: 'offline' }
  if (outcome === 'poor') return { ok: false, reason: 'quality' }

  const webrtc = input.webrtc !== false && input.camera !== false && input.microphone !== false
  const latency = Number(input.latencyMs)
  const loss = Number(input.packetLoss)
  const healthyPeer = webrtc
    && (!Number.isFinite(latency) || latency <= 220)
    && (!Number.isFinite(loss) || loss <= 0.04)

  if (healthyPeer) return { ok: true, provider: 'tabcom' }
  if (webrtc && input.livekitConfigured) return { ok: true, provider: 'livekit' }
  if (input.meetAvailable) return { ok: true, provider: 'meet' }
  if (webrtc) return { ok: true, provider: 'tabcom' }
  return { ok: false, reason: 'unavailable' }
}

/** Reserve first, then provision. Provision is never called if reserve fails. */
export async function confirmAndProvision({ reserve, provision, slot, capabilities }) {
  const booking = await reserve(slot)
  const appointmentId = booking?.engineId || booking?.id
  if (!appointmentId) {
    const error = new Error('reservation_failed')
    error.code = 'reservation_failed'
    throw error
  }
  const session = await provision({ appointmentId, booking, capabilities, slot })
  if (session?.needsConsent) return { booking, needsConsent: true, session: null }
  if (session && isReadinessRoom(session.roomName)) {
    const error = new Error('readiness_room')
    error.code = 'readiness_room'
    throw error
  }
  return { booking, session }
}
