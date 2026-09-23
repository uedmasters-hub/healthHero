/**
 * Human-readable voice helpers (English source → i18n via tx()).
 */

export function voiceErrorMessage(code, tx = (s) => s) {
  if (!code) return null
  switch (code) {
    case 'unsupported':
    case 'insecure':
      return tx('Voice search isn’t available here — type to search instead.')
    case 'no-device':
    case 'audio-capture':
      return tx('No microphone found. Check your input device.')
    case 'not-allowed':
      return tx('Allow microphone access for this site, then tap the mic again.')
    case 'network':
      return tx('Couldn’t reach speech service — try again, or type your search.')
    case 'network-brave':
      return tx('On-device voice is starting — Brave blocks cloud speech by design.')
    case 'speech-unavailable':
      return tx('Voice search is unavailable right now — type to search instead.')
    case 'service-not-allowed':
      return tx('Voice search is blocked for this site. You can still type to search.')
    case 'busy':
      return tx('Mic is busy. Wait a moment, then try again.')
    case 'no-speech':
      return tx('Didn’t catch that — tap the mic and try again.')
    case 'language-not-supported':
      return tx('That voice language isn’t supported here. Try EN.')
    case 'model-load-failed':
      return tx('Couldn’t load the voice model. Check your connection and try again.')
    case 'transcribe-failed':
      return tx('Couldn’t transcribe that. Try again.')
    case 'cancelled':
      return null
    case 'start-failed':
    default:
      return tx('Couldn’t start listening. Tap the mic again.')
  }
}

export function voiceStatusMessage(state, {
  voiceLang,
  listeningEn,
  listeningNe,
  modelProgress = 0,
  tx = (s) => s,
} = {}) {
  if (state === 'permission') {
    return tx('Preparing microphone…')
  }
  if (state === 'listening') {
    return tx(voiceLang === 'ne-NP' ? listeningNe : listeningEn)
  }
  if (state === 'processing') {
    return tx('Transcribing…')
  }
  if (state === 'loading-model') {
    const pct = modelProgress > 0 ? ` ${modelProgress}%` : ''
    return `${tx('Loading voice model…')}${pct}`
  }
  return null
}
