/**
 * React binding for VoiceSearchService — one code path for every SearchBar.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { detectVoiceCapabilities } from './capabilities'
import { VoiceSearchService, VOICE_STATE } from './VoiceSearchService'
import { voiceErrorMessage, voiceStatusMessage } from './messages'

export { VOICE_STATE }
export { voiceErrorMessage, voiceStatusMessage }
export { detectVoiceCapabilities } from './capabilities'
export { VoiceSearchService } from './VoiceSearchService'
export { queueVoiceStart, takeVoiceStart, peekVoiceStart, clearVoiceStart } from './pendingStart'

function initialSnap() {
  const caps = detectVoiceCapabilities()
  return {
    state: VOICE_STATE.idle,
    transcript: '',
    interimTranscript: '',
    finalTranscript: '',
    error: caps.supported ? null : caps.reason,
    supported: caps.supported,
    unavailable: !caps.supported,
    listening: false,
    processing: false,
    engine: null,
    modelProgress: 0,
  }
}

export function useVoiceSearch(lang = 'en-US') {
  const serviceRef = useRef(null)
  const langRef = useRef(lang)
  langRef.current = lang
  const [snap, setSnap] = useState(initialSnap)

  useEffect(() => {
    const service = new VoiceSearchService({ lang: langRef.current })
    serviceRef.current = service
    setSnap(service.snapshot)
    service.subscribe(setSnap)

    const onClaim = (event) => {
      service.yieldToPeer(event?.detail?.id)
    }
    window.addEventListener('em:voice-search-claim', onClaim)

    return () => {
      window.removeEventListener('em:voice-search-claim', onClaim)
      service.destroy()
      if (serviceRef.current === service) serviceRef.current = null
    }
  }, [])

  useEffect(() => {
    serviceRef.current?.setLang(lang)
  }, [lang])

  const start = useCallback(() => {
    void serviceRef.current?.start()
  }, [])

  const stop = useCallback(() => {
    serviceRef.current?.stop()
  }, [])

  const clearError = useCallback(() => {
    serviceRef.current?.clearError()
  }, [])

  const toggle = useCallback(() => {
    const s = serviceRef.current
    if (!s) return
    const { state, listening } = s.snapshot
    if (
      listening
      || state === VOICE_STATE.permission
      || state === VOICE_STATE.processing
      || state === VOICE_STATE.loadingModel
    ) {
      s.stop()
      return
    }
    if (state === VOICE_STATE.error) {
      s.clearError()
    }
    void s.start()
  }, [])

  return {
    state: snap.state,
    supported: snap.supported,
    unavailable: snap.unavailable,
    listening: snap.listening || snap.state === VOICE_STATE.listening,
    processing: snap.processing || snap.state === VOICE_STATE.processing,
    requesting: snap.state === VOICE_STATE.permission || snap.state === VOICE_STATE.loadingModel,
    transcript: snap.transcript,
    interimTranscript: snap.interimTranscript,
    finalTranscript: snap.finalTranscript,
    error: snap.error,
    modelProgress: snap.modelProgress || 0,
    engine: snap.engine,
    start,
    stop,
    toggle,
    clearError,
  }
}
