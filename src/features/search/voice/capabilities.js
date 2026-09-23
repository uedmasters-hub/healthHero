/**
 * Voice capability detection — what this browser can actually run.
 * No brand hard-blocks in the gate; Brave is a soft engine preference.
 */

export function isSecureVoiceContext() {
  if (typeof window === 'undefined') return false
  try {
    if (window.isSecureContext) return true
  } catch {
    /* ignore */
  }
  const { protocol, hostname } = window.location || {}
  return protocol === 'https:'
    || hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
}

export function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function hasMediaDevices() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function hasMediaRecorder() {
  return typeof MediaRecorder !== 'undefined'
}

export function hasAudioContext() {
  if (typeof window === 'undefined') return false
  return Boolean(window.AudioContext || window.webkitAudioContext)
}

export function hasWorkers() {
  return typeof Worker !== 'undefined'
}

/** Brave self-id — Shields blocks Google speech cloud; prefer on-device. */
export async function isBraveBrowser() {
  try {
    const brave = navigator?.brave
    if (typeof brave?.isBrave !== 'function') return false
    return await brave.isBrave()
  } catch {
    return false
  }
}

/**
 * Snapshot of voice engines available in this environment.
 * `supported` if either native SpeechRecognition OR local recorder+Whisper can run.
 */
export function detectVoiceCapabilities() {
  const secure = isSecureVoiceContext()
  const Ctor = getSpeechRecognitionCtor()
  const media = hasMediaDevices()
  const recorder = hasMediaRecorder()
  const audioCtx = hasAudioContext()
  const workers = hasWorkers()

  const native = Boolean(secure && Ctor)
  const local = Boolean(secure && media && recorder && audioCtx && workers)

  return {
    secure,
    media,
    native,
    local,
    supported: native || local,
    Ctor,
    reason: !secure
      ? 'insecure'
      : !(native || local)
        ? 'unsupported'
        : null,
  }
}
