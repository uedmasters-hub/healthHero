import { supabase } from '../../lib/supabase'
import {
  appointmentRoomName,
  confirmAndProvision,
  isReadinessRoom,
  outcomeForScore,
  readinessRoomName,
  scoreReadiness,
  selectTransport,
} from '../../../supabase/functions/_shared/videoEngine.mjs'
import { canUsePeerConnection } from './tabcomEngine'
import { isVideoVisit, readVideoLock, writeVideoLock } from './lock'

const LOCAL_KEY = 'emedicalls:video-sessions.v1'

function readLocal() {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocal(rows) {
  try {
    sessionStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(-40)))
  } catch {
    /* ignore quota */
  }
}

function remember(row) {
  const rows = readLocal().filter((item) => item.sessionId !== row.sessionId)
  rows.push(row)
  writeLocal(rows)
  return row
}

export function publicSession(row) {
  if (!row) return null
  return {
    sessionId: row.sessionId,
    roomName: row.roomName,
    sessionType: row.sessionType,
    outcome: row.outcome || null,
    status: row.status || null,
  }
}

async function invoke(action, body) {
  if (!supabase) return null
  const { data, error } = await supabase.functions.invoke('video-session', {
    body: { action, ...body },
  })
  if (error || data?.error) return { error: data?.error || error.message || 'failed', data }
  return { data }
}

async function googleAccessToken() {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.provider_token || null
  } catch {
    return null
  }
}

export async function startReadiness({ networkType } = {}) {
  const id = crypto.randomUUID()
  const roomName = readinessRoomName(id)
  const remote = await invoke('start_readiness', { networkType })
  const sessionId = remote?.data?.sessionId || id
  const session = remember({
    sessionId,
    roomName: remote?.data?.roomName || roomName,
    sessionType: 'readiness',
    status: 'started',
    events: ['readiness_started'],
  })
  if (!isReadinessRoom(session.roomName)) {
    throw new Error('readiness_room')
  }
  return publicSession(session)
}

export async function completeReadiness(sessionId, metrics) {
  const qualityScore = scoreReadiness(metrics)
  const outcome = outcomeForScore(qualityScore)
  await invoke('complete_readiness', { sessionId, metrics })
  const session = remember({
    sessionId,
    roomName: readinessRoomName(sessionId),
    sessionType: 'readiness',
    outcome,
    status: outcome === 'poor' ? 'failed' : 'passed',
    qualityScore,
    events: [outcome === 'poor' ? 'quality_failed' : 'quality_passed'],
  })
  return { ...publicSession(session), qualityScore, metrics }
}

export async function closeReadiness(sessionId) {
  if (!sessionId) return null
  await invoke('end', { sessionId })
  return remember({
    sessionId,
    roomName: readinessRoomName(sessionId),
    sessionType: 'readiness',
    status: 'ended',
    events: ['ended'],
  })
}

export function capabilityInput(metrics = {}, extras = {}) {
  return {
    ...metrics,
    webrtc: canUsePeerConnection(),
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    qualityScore: metrics.qualityScore,
    outcome: metrics.outcome,
    ...extras,
  }
}

export async function provisionAfterReserve({ appointmentId, capabilities, googleAccessToken: token }) {
  const access = token === undefined ? await googleAccessToken() : token
  const remote = await invoke('provision', {
    appointmentId,
    capabilities,
    googleAccessToken: access,
  })
  if (remote?.error === 'needs_consent') {
    return { needsConsent: true }
  }
  if (remote?.data?.sessionId && !remote.error) {
    const transport = {
      kind: remote.data.provider,
      token: remote.data.token || null,
      serverUrl: remote.data.serverUrl || null,
      url: remote.data.url || null,
    }
    const view = remember({
      sessionId: remote.data.sessionId,
      roomName: remote.data.roomName,
      sessionType: 'consultation',
      status: 'provisioned',
      events: ['session_provisioned'],
    })
    return { ...publicSession(view), transport }
  }

  const decision = selectTransport({
    ...capabilities,
    livekitConfigured: false,
    meetAvailable: false,
  })
  if (!decision.ok) {
    const error = new Error(decision.reason || 'unavailable')
    error.code = decision.reason || 'unavailable'
    throw error
  }
  const view = remember({
    sessionId: crypto.randomUUID(),
    roomName: appointmentRoomName(appointmentId),
    sessionType: 'consultation',
    status: 'provisioned',
    events: ['session_provisioned'],
  })
  return {
    ...publicSession(view),
    transport: { kind: decision.provider, token: null, serverUrl: null, url: null },
  }
}

export async function reopenConsultation(sessionId) {
  const remote = await invoke('join', { sessionId })
  if (remote?.data && !remote.error) {
    return {
      transport: {
        kind: remote.data.provider,
        token: remote.data.token || null,
        serverUrl: remote.data.serverUrl || null,
        url: remote.data.url || null,
      },
    }
  }
  return { transport: { kind: 'tabcom', token: null, serverUrl: null, url: null } }
}

export function reserveThenProvision({ reserve, slot, capabilities }) {
  return confirmAndProvision({
    reserve,
    slot,
    capabilities,
    provision: ({ appointmentId }) => provisionAfterReserve({ appointmentId, capabilities }),
  })
}

export async function provisionConfirmedVisit(booking) {
  const visit = booking?.visitType || booking?.schedule?.visitType || ''
  if (!isVideoVisit(visit)) return null
  const appointmentId = booking?.engineId || booking?.id
  if (!appointmentId) return null
  const lock = readVideoLock()
  const result = await provisionAfterReserve({
    appointmentId,
    capabilities: {
      outcome: lock?.outcome || 'usable',
      qualityScore: lock?.qualityScore,
      camera: true,
      microphone: true,
      webrtc: canUsePeerConnection(),
      online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
      ...(lock?.metrics || {}),
    },
  })
  if (result?.needsConsent) {
    const { confirmConsultationAccess } = await import('../auth/services/oauth.js')
    await confirmConsultationAccess()
    return result
  }
  if (result?.sessionId && isReadinessRoom(result.roomName)) {
    throw new Error('readiness_room')
  }
  if (result?.sessionId) {
    writeVideoLock({ consultationSessionId: result.sessionId, appointmentId })
  }
  return result
}

export async function markJoined(sessionId) {
  await invoke('join', { sessionId })
  return remember({ sessionId, sessionType: 'consultation', status: 'joined', events: ['joined'] })
}

export async function markEnded(sessionId) {
  await invoke('end', { sessionId })
  return remember({ sessionId, sessionType: 'consultation', status: 'ended', events: ['ended'] })
}
