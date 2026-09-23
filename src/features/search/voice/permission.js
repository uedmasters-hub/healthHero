/**
 * Microphone permission — Tabcom patterns + PocketPills read-only check.
 *
 * Tabcom lessons applied here:
 * - Map DOMException names to clear, retryable reasons (NotAllowed / NotFound / NotReadable)
 * - Always stop tracks after a permission probe or cancelled recording
 * - Don't trust Permissions API alone (Brave/Chromium can report "denied" incorrectly);
 *   when querying fails or is unknown, fall through to the real prompt path
 *
 * PocketPills lesson for native SpeechRecognition:
 * - Never open getUserMedia before SpeechRecognition — the open-then-close
 *   race empties the first audio window and fires instant `no-speech`.
 * - Use isMicExplicitlyDenied() as a fail-fast only when state is clearly denied.
 */

/** Read-only — never opens the microphone. */
export async function isMicExplicitlyDenied() {
  try {
    if (!navigator.permissions?.query) return false
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status.state === 'denied'
  } catch {
    // Unsupported query name (Firefox etc.) → treat as unknown, not denied.
    return false
  }
}

export async function queryMicrophonePermission() {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status?.state || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Tabcom-style getUserMedia request with explicit error mapping.
 * Caller owns track cleanup via releaseMediaStream().
 */
export async function requestMicrophoneStream(constraints = { audio: true, video: false }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'no-device', stream: null }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return { ok: true, reason: null, stream }
  } catch (error) {
    const name = error instanceof DOMException
      ? error.name
      : String(error?.name || error?.message || '')
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { ok: false, reason: 'not-allowed', stream: null }
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return { ok: false, reason: 'no-device', stream: null }
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
      return { ok: false, reason: 'busy', stream: null }
    }
    return { ok: false, reason: 'audio-capture', stream: null }
  }
}

/** Always release capture tracks — Tabcom cleanup invariant. */
export function releaseMediaStream(stream) {
  if (!stream) return
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop()
      } catch {
        /* ignore */
      }
    })
  } catch {
    /* ignore */
  }
}
