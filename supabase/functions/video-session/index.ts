/**
 * Video session capability endpoint.
 * Mints realtime tokens here. The client never sees API secrets, and the
 * response is consumed by session code that does not render the provider.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  appointmentRoomName,
  isReadinessRoom,
  outcomeForScore,
  readinessRoomName,
  scoreReadiness,
  selectTransport,
} from '../_shared/videoEngine.mjs'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${bytesToBase64Url(new Uint8Array(sig))}`
}

async function liveKitToken(identity: string, room: string, ttlSec: number) {
  const apiKey = Deno.env.get('LIVEKIT_API_KEY') || ''
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET') || ''
  const url = Deno.env.get('LIVEKIT_URL') || ''
  if (!apiKey || !apiSecret || !url) return null
  const now = Math.floor(Date.now() / 1000)
  const token = await signJwt({
    iss: apiKey,
    sub: identity,
    nbf: now,
    exp: now + ttlSec,
    video: { roomJoin: true, room, canPublish: true, canSubscribe: true },
  }, apiSecret)
  return { token, url }
}

async function createMeetLink(accessToken: string, appointmentId: string) {
  if (!accessToken) return null
  const start = new Date(Date.now() + 5 * 60 * 1000)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'eMedicalls consultation',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `appt-${appointmentId}`.slice(0, 60),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    },
  )
  if (!response.ok) return null
  const event = await response.json()
  return event?.hangoutLink || event?.conferenceData?.entryPoints?.find((p: { entryPointType?: string }) => p.entryPointType === 'video')?.uri || null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const authHeader = req.headers.get('Authorization') || ''
  if (!supabaseUrl || !serviceKey || !authHeader) return json({ error: 'unauthorized' }, 401)

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)
  const user = userData.user

  const admin = createClient(supabaseUrl, serviceKey)
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  async function insertSession(row: Record<string, unknown>) {
    const { data, error } = await admin.from('video_sessions').insert(row).select('id, room_name, session_type, status, readiness_outcome, quality_score').single()
    if (error) throw error
    return data
  }

  async function addEvent(sessionId: string, event: string, payload: Record<string, unknown> = {}) {
    await admin.from('video_session_events').insert({ session_id: sessionId, event, payload })
  }

  try {
    if (action === 'start_readiness') {
      const id = crypto.randomUUID()
      const room = readinessRoomName(id)
      const session = await insertSession({
        id,
        patient_id: user.id,
        session_type: 'readiness',
        room_name: room,
        status: 'started',
        started_at: new Date().toISOString(),
        network_type: body.networkType || null,
      })
      await addEvent(session.id, 'readiness_started', { room })
      return json({
        sessionId: session.id,
        roomName: session.room_name,
        sessionType: 'readiness',
      })
    }

    if (action === 'complete_readiness') {
      const metrics = body.metrics || {}
      const qualityScore = scoreReadiness(metrics)
      const outcome = outcomeForScore(qualityScore)
      const sessionId = String(body.sessionId || '')
      const { data: existing } = await admin
        .from('video_sessions')
        .select('id, session_type, patient_id, room_name')
        .eq('id', sessionId)
        .maybeSingle()
      if (!existing || existing.patient_id !== user.id || existing.session_type !== 'readiness') {
        return json({ error: 'not_found' }, 404)
      }
      if (!isReadinessRoom(existing.room_name)) return json({ error: 'room' }, 400)
      const details = {
        camera: metrics.camera ?? null,
        microphone: metrics.microphone ?? null,
        speaker: metrics.speaker ?? null,
        stable: metrics.stable ?? null,
        uplinkMbps: metrics.uplinkMbps ?? null,
        downlinkMbps: metrics.downlinkMbps ?? null,
        hardwareConcurrency: metrics.hardwareConcurrency ?? null,
        deviceMemory: metrics.deviceMemory ?? null,
        batteryLevel: metrics.batteryLevel ?? null,
        charging: metrics.charging ?? null,
        lowPower: metrics.lowPower ?? null,
        locationGranted: metrics.locationGranted ?? null,
      }
      await admin.from('video_sessions').update({
        quality_score: qualityScore,
        readiness_outcome: outcome,
        latency_ms: metrics.latencyMs ?? null,
        jitter_ms: metrics.jitterMs ?? null,
        packet_loss: metrics.packetLoss ?? null,
        network_type: metrics.networkType ?? null,
        details,
        status: outcome === 'poor' ? 'failed' : 'passed',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId)
      await addEvent(sessionId, outcome === 'poor' ? 'quality_failed' : 'quality_passed', {
        outcome,
        qualityScore,
        details,
      })
      return json({ sessionId, outcome, sessionType: 'readiness' })
    }

    if (action === 'provision') {
      const appointmentId = String(body.appointmentId || '')
      if (!appointmentId) return json({ error: 'appointment' }, 400)
      const capabilities = body.capabilities || {}
      const livekitConfigured = Boolean(Deno.env.get('LIVEKIT_API_KEY') && Deno.env.get('LIVEKIT_API_SECRET') && Deno.env.get('LIVEKIT_URL'))
      let decision = selectTransport({
        ...capabilities,
        livekitConfigured,
        meetAvailable: Boolean(body.googleAccessToken) || Boolean(capabilities.meetAvailable),
      })
      if (!decision.ok || !decision.provider) {
        return json({ error: decision.reason || 'unavailable' }, 409)
      }

      let token: string | null = null
      let serverUrl: string | null = null
      let joinUrl: string | null = null
      if (decision.provider === 'livekit') {
        const minted = await liveKitToken(user.id, appointmentRoomName(appointmentId), 60 * 60)
        if (!minted) {
          decision = selectTransport({
            ...capabilities,
            livekitConfigured: false,
            meetAvailable: Boolean(body.googleAccessToken),
          })
          if (!decision.ok || !decision.provider) return json({ error: 'unavailable' }, 409)
        } else {
          token = minted.token
          serverUrl = minted.url
        }
      }
      if (decision.provider === 'meet') {
        joinUrl = await createMeetLink(String(body.googleAccessToken || ''), appointmentId)
        if (!joinUrl) return json({ error: 'needs_consent' }, 409)
      }

      const room = appointmentRoomName(appointmentId)
      const session = await insertSession({
        patient_id: user.id,
        session_type: 'consultation',
        room_name: room,
        appointment_ref: appointmentId,
        provider: decision.provider,
        status: 'provisioned',
        quality_score: capabilities.qualityScore ?? null,
        readiness_outcome: capabilities.outcome ?? null,
        latency_ms: capabilities.latencyMs ?? null,
        jitter_ms: capabilities.jitterMs ?? null,
        packet_loss: capabilities.packetLoss ?? null,
        network_type: capabilities.networkType ?? null,
      })
      await addEvent(session.id, 'session_provisioned', { room })
      return json({
        sessionId: session.id,
        roomName: room,
        sessionType: 'consultation',
        provider: decision.provider,
        token,
        serverUrl,
        url: joinUrl,
      })
    }

    if (action === 'join' || action === 'end') {
      const sessionId = String(body.sessionId || '')
      const { data: existing } = await admin
        .from('video_sessions')
        .select('id, patient_id, session_type, provider, room_name')
        .eq('id', sessionId)
        .maybeSingle()
      if (!existing || existing.patient_id !== user.id) return json({ error: 'not_found' }, 404)
      if (action === 'join' && existing.session_type !== 'consultation') {
        return json({ error: 'not_consultation' }, 400)
      }
      const event = action === 'join' ? 'joined' : 'ended'
      const patch: Record<string, string> = {
        status: action === 'join' ? 'joined' : 'ended',
        updated_at: new Date().toISOString(),
      }
      if (action === 'join') patch.started_at = new Date().toISOString()
      if (action === 'end') patch.ended_at = new Date().toISOString()
      await admin.from('video_sessions').update(patch).eq('id', sessionId)
      await addEvent(sessionId, event, {})
      let token: string | null = null
      let serverUrl: string | null = null
      if (action === 'join' && existing.provider === 'livekit') {
        const minted = await liveKitToken(user.id, existing.room_name, 60 * 60)
        token = minted?.token || null
        serverUrl = minted?.url || null
      }
      return json({
        sessionId,
        roomName: existing.room_name,
        sessionType: existing.session_type,
        provider: existing.provider,
        token,
        serverUrl,
      })
    }

    return json({ error: 'action' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'failed' }, 500)
  }
})
