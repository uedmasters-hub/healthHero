/**
 * Browser video engine adapted from Tabcom.
 * Signal kinds and RTC defaults follow
 * packages/shared/src/wire.ts and apps/extension/entrypoints/call/main.tsx.
 * Media stays on the device. This module never names a vendor in thrown errors.
 */

export const CALL_SIGNAL_KINDS = Object.freeze([
  'offer',
  'answer',
  'ice',
  'end',
  'reject',
  'busy',
  'ringing',
  'cancel',
  'timeout',
  'hold',
  'resume',
  'renegotiate',
])

export const RTC_CONFIG = Object.freeze({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 4,
  bundlePolicy: 'max-bundle',
})

function wait(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

export function canUsePeerConnection() {
  return typeof RTCPeerConnection === 'function'
    && typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
}

export async function openCameraPreview({ facingMode = 'user' } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
  })
  return stream
}

function recordingMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return types.find((type) => MediaRecorder.isTypeSupported?.(type)) || ''
}

/** In-memory preview only. The blob is never uploaded. */
export function startPreviewRecording(stream) {
  const mimeType = recordingMime()
  if (!mimeType || !stream) return null
  const chunks = []
  const recorder = new MediaRecorder(stream, { mimeType })
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data)
  }
  recorder.start(250)
  return {
    stop() {
      return new Promise((resolve) => {
        const finish = () => {
          const blob = new Blob(chunks, { type: mimeType })
          chunks.length = 0
          resolve(blob.size ? blob : null)
        }
        recorder.onstop = finish
        if (recorder.state === 'inactive') finish()
        else recorder.stop()
      })
    },
    discard() {
      chunks.length = 0
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
    },
  }
}

export function releasePreviewUrl(url) {
  if (url) URL.revokeObjectURL(url)
}

export async function probeSpeaker() {
  const AudioCtx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  if (!AudioCtx) return false
  const ctx = new AudioCtx()
  try {
    const tone = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.03
    tone.frequency.value = 523
    tone.connect(gain)
    gain.connect(ctx.destination)
    tone.start()
    await wait(160)
    tone.stop()
    return true
  } catch {
    return false
  } finally {
    ctx.close?.().catch(() => {})
  }
}

export async function readDevicePower() {
  const saveData = Boolean(typeof navigator !== 'undefined' && navigator.connection?.saveData)
  let batteryLevel = null
  let charging = null
  try {
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      const battery = await navigator.getBattery()
      batteryLevel = Number.isFinite(battery.level) ? battery.level : null
      charging = Boolean(battery.charging)
    }
  } catch {
    /* battery status is hidden */
  }
  const lowPower = saveData || (batteryLevel != null && batteryLevel < 0.2 && charging === false)
  return {
    batteryLevel,
    charging,
    lowPower,
    batteryChecked: true,
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0,
    deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory || null : null,
  }
}

export function attachPreview(video, stream) {
  if (!video) return
  video.srcObject = stream
  video.muted = true
  const play = video.play?.()
  if (play?.catch) play.catch(() => {})
}

export function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

function readConnectionHints() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection || navigator.mozConnection : null
  return {
    networkType: connection?.type || connection?.effectiveType || 'unknown',
    downlinkMbps: Number.isFinite(connection?.downlink) ? connection.downlink : null,
    hintLatencyMs: Number.isFinite(connection?.rtt) ? connection.rtt : null,
  }
}

function deviceHints() {
  return {
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0,
    deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory || null : null,
  }
}

/**
 * Temporary readiness probe. Uses a local peer connection, the same
 * RTCPeerConnection lifecycle as a Tabcom call, and never opens a
 * consultation room.
 */
export async function measureReadiness(stream, { durationMs = 12000, onProgress, onSample } = {}) {
  const hints = readConnectionHints()
  const device = deviceHints()
  const camera = stream?.getVideoTracks?.().some((track) => track.readyState === 'live' && track.enabled) || false
  const microphone = stream?.getAudioTracks?.().some((track) => track.readyState === 'live') || false
  if (!camera || !microphone || typeof RTCPeerConnection !== 'function') {
    return {
      camera,
      microphone,
      stable: false,
      latencyMs: hints.hintLatencyMs,
      jitterMs: null,
      packetLoss: null,
      uplinkMbps: null,
      downlinkMbps: hints.downlinkMbps,
      networkType: hints.networkType,
      ...device,
      online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    }
  }

  const caller = new RTCPeerConnection(RTC_CONFIG)
  const callee = new RTCPeerConnection(RTC_CONFIG)
  caller.onicecandidate = (event) => {
    if (event.candidate) callee.addIceCandidate(event.candidate).catch(() => {})
  }
  callee.onicecandidate = (event) => {
    if (event.candidate) caller.addIceCandidate(event.candidate).catch(() => {})
  }
  stream.getTracks().forEach((track) => caller.addTrack(track, stream))

  let latencyMs = null
  let jitterMs = null
  let packetLoss = null
  let stable = false
  let uplinkMbps = null
  let lastBytes = 0
  let lastAt = performance.now()

  try {
    const offer = await caller.createOffer()
    await caller.setLocalDescription(offer)
    await callee.setRemoteDescription(offer)
    const answer = await callee.createAnswer()
    await callee.setLocalDescription(answer)
    await caller.setRemoteDescription(answer)

    const started = performance.now()
    while (performance.now() - started < durationMs) {
      const slice = Math.min(400, durationMs - (performance.now() - started))
      if (slice > 0) await wait(slice)
      const progress = Math.min(1, (performance.now() - started) / durationMs)
      onProgress?.(progress)
      onSample?.({
        camera,
        microphone,
        stable,
        latencyMs,
        jitterMs,
        packetLoss,
        uplinkMbps,
        downlinkMbps: hints.downlinkMbps,
        progress,
      })
      const stats = await caller.getStats()
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && (report.nominated || report.selected || report.state === 'succeeded')) {
          stable = report.state === 'succeeded' || Boolean(report.nominated || report.selected)
          if (typeof report.currentRoundTripTime === 'number') {
            latencyMs = Math.round(report.currentRoundTripTime * 1000)
          }
        }
        if (report.type === 'inbound-rtp') {
          if (typeof report.jitter === 'number') jitterMs = Math.round(report.jitter * 1000)
          const lost = report.packetsLost || 0
          const received = report.packetsReceived || 0
          if (lost + received > 0) packetLoss = lost / (lost + received)
        }
        if (report.type === 'outbound-rtp' && typeof report.bytesSent === 'number') {
          const now = performance.now()
          const seconds = (now - lastAt) / 1000
          if (seconds > 0.2 && lastBytes > 0) {
            uplinkMbps = ((report.bytesSent - lastBytes) * 8) / seconds / 1_000_000
          }
          lastBytes = report.bytesSent
          lastAt = now
        }
      })
    }
  } finally {
    caller.close()
    callee.close()
  }

  const networkLatency = hints.hintLatencyMs
  const mergedLatency = latencyMs == null
    ? networkLatency
    : (networkLatency == null ? latencyMs : Math.max(latencyMs, networkLatency))

  return {
    camera,
    microphone,
    stable,
    latencyMs: mergedLatency,
    jitterMs,
    packetLoss: stable ? packetLoss : (packetLoss ?? 0.12),
    uplinkMbps,
    downlinkMbps: hints.downlinkMbps,
    networkType: hints.networkType,
    ...device,
    online: navigator.onLine !== false,
    webrtc: true,
  }
}

export function createLocalCall({
  localStream,
  onRemoteStream,
  onSignal,
}) {
  let pc = null
  const pending = []

  function ensure() {
    if (pc) return pc
    pc = new RTCPeerConnection(RTC_CONFIG)
    localStream?.getTracks?.().forEach((track) => pc.addTrack(track, localStream))
    pc.onicecandidate = (event) => {
      if (event.candidate) onSignal?.({ kind: 'ice', candidate: event.candidate.toJSON() })
    }
    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) onRemoteStream?.(stream)
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') onSignal?.({ kind: 'renegotiate' })
    }
    return pc
  }

  return {
    async start() {
      const conn = ensure()
      const offer = await conn.createOffer()
      await conn.setLocalDescription(offer)
      onSignal?.({ kind: 'offer', video: true, sdp: offer.sdp })
    },
    async receive(signal) {
      if (!signal?.kind || !CALL_SIGNAL_KINDS.includes(signal.kind)) return
      if (signal.kind === 'end' || signal.kind === 'cancel') {
        pc?.close()
        pc = null
        return
      }
      const conn = ensure()
      if (signal.kind === 'offer' && signal.sdp) {
        await conn.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        const answer = await conn.createAnswer()
        await conn.setLocalDescription(answer)
        onSignal?.({ kind: 'answer', video: true, sdp: answer.sdp })
        return
      }
      if (signal.kind === 'answer' && signal.sdp) {
        await conn.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        while (pending.length) {
          await conn.addIceCandidate(pending.shift()).catch(() => {})
        }
        return
      }
      if (signal.kind === 'ice' && signal.candidate) {
        if (!conn.remoteDescription) pending.push(signal.candidate)
        else await conn.addIceCandidate(signal.candidate).catch(() => {})
      }
    },
    end() {
      onSignal?.({ kind: 'end' })
      pc?.close()
      pc = null
    },
  }
}
