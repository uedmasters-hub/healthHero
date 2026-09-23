/**
 * Native Web Speech engine — continuous + interim for live dictation.
 * Never opens getUserMedia (avoids racing SpeechRecognition's capture).
 */

import { getSpeechRecognitionCtor } from './capabilities'
import { isMicExplicitlyDenied } from './permission'

export function createNativeEngine() {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) return null

  let rec = null
  let session = false
  let starting = false

  const hardStop = ({ abort = false } = {}) => {
    session = false
    starting = false
    const current = rec
    if (!current) return
    current.onresult = null
    current.onerror = null
    current.onstart = null
    // Keep onend so the service can settle; null it only on abort.
    if (abort) {
      current.onend = null
      rec = null
      try { current.abort() } catch { /* ignore */ }
      return
    }
    current.onend = () => {
      if (rec === current) rec = null
    }
    try {
      current.stop()
    } catch {
      try { current.abort() } catch { /* ignore */ }
      if (rec === current) rec = null
    }
  }

  return {
    id: 'native',

    async start({ lang, continuous = true, onStart, onResult, onError, onEnd }) {
      if (starting) return
      starting = true

      if (await isMicExplicitlyDenied()) {
        starting = false
        onError?.('not-allowed')
        return
      }

      if (rec) hardStop({ abort: true })

      const next = new Ctor()
      next.lang = lang || 'en-US'
      next.continuous = Boolean(continuous)
      next.interimResults = true
      next.maxAlternatives = 1

      next.onstart = () => {
        if (!session) return
        starting = false
        onStart?.()
      }

      next.onresult = (event) => {
        if (!session) return
        let interim = ''
        let finalText = ''
        let finalChunk = false
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i]
          const piece = result?.[0]?.transcript || ''
          if (result.isFinal) {
            finalText += piece
            if (i >= event.resultIndex) finalChunk = true
          } else {
            interim += piece
          }
        }
        onResult?.({
          interim: interim.trim(),
          final: finalText.trim(),
          isFinalChunk: finalChunk,
        })
      }

      next.onerror = (event) => {
        const code = event?.error || 'error'
        session = false
        starting = false
        if (code === 'aborted') return
        onError?.(code)
      }

      next.onend = () => {
        session = false
        starting = false
        if (rec === next) rec = null
        onEnd?.()
      }

      rec = next
      session = true
      try {
        next.start()
      } catch (err) {
        session = false
        starting = false
        rec = null
        const msg = String(err?.message || '').toLowerCase()
        onError?.(msg.includes('already started') ? 'busy' : 'start-failed')
      }
    },

    stop() {
      hardStop({ abort: false })
    },

    abort() {
      hardStop({ abort: true })
    },

    destroy() {
      this.abort()
    },
  }
}
