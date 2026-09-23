/**
 * On-device voice engine — Tabcom getUserMedia/cleanup + PocketPills Whisper.
 *
 * Flow: permission → MediaRecorder listen → stop → decode → transcribe.
 * No live interim transcript (Whisper is batch); listening indicator covers that.
 */

import { Recorder, decodeToMono16k } from './localWhisper/audio'
import { requestMicrophoneStream, releaseMediaStream, isMicExplicitlyDenied } from './permission'

const LANG_MAP = {
  'en-US': 'english',
  'ne-NP': 'nepali',
}

const MAX_RECORDING_MS = 6_000

export function createLocalEngine() {
  let worker = null
  let readyPromise = null
  let recorder = null
  let maxTimer = null
  let session = false
  let starting = false
  let cancelled = false

  const ensureModelReady = (onProgress) => {
    if (readyPromise) return readyPromise

    worker = new Worker(new URL('./localWhisper/whisperWorker.js', import.meta.url), {
      type: 'module',
    })

    readyPromise = new Promise((resolve, reject) => {
      const onLoadMessage = (event) => {
        const msg = event.data
        if (msg.type === 'progress') {
          onProgress?.(Math.round(msg.progress || 0))
        } else if (msg.type === 'ready') {
          resolve()
        } else if (msg.type === 'error') {
          readyPromise = null
          reject(new Error(msg.message || 'model-load-failed'))
        }
      }
      worker.addEventListener('message', onLoadMessage)
      worker.onerror = (event) => {
        readyPromise = null
        reject(new Error(event.message || 'worker-failed'))
      }
      worker.postMessage({ type: 'load' })
    })

    return readyPromise
  }

  const transcribeClip = async (audio, language) => {
    await ensureModelReady()
    if (!worker) throw new Error('worker-unavailable')

    return new Promise((resolve, reject) => {
      const onMessage = (event) => {
        const msg = event.data
        if (msg.type === 'result') {
          worker.removeEventListener('message', onMessage)
          resolve(msg.text || '')
        } else if (msg.type === 'error') {
          worker.removeEventListener('message', onMessage)
          reject(new Error(msg.message || 'transcribe-failed'))
        }
      }
      worker.addEventListener('message', onMessage)
      worker.postMessage(
        { type: 'transcribe', audio, language },
        [audio.buffer],
      )
    })
  }

  const clearMaxTimer = () => {
    if (maxTimer) {
      window.clearTimeout(maxTimer)
      maxTimer = null
    }
  }

  return {
    id: 'local',

    async start({ lang, onPermission, onStart, onProgress, onError, onEnd, onResult, stopAndProcess }) {
      if (starting || session) return
      starting = true
      cancelled = false
      onPermission?.()

      if (await isMicExplicitlyDenied()) {
        starting = false
        onError?.('not-allowed')
        return
      }

      void ensureModelReady(onProgress).catch(() => {
        /* Surfaced on stop — don't abort mid-sentence. */
      })

      const access = await requestMicrophoneStream({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      })

      if (!access.ok) {
        starting = false
        onError?.(access.reason || 'not-allowed')
        return
      }

      session = true
      starting = false
      onStart?.()
      recorder = new Recorder(access.stream)
      maxTimer = window.setTimeout(() => {
        void stopAndProcess?.()
      }, MAX_RECORDING_MS)
    },

    async stopAndTranscribe({ lang, onProcessing, onResult, onError, onEnd }) {
      clearMaxTimer()
      session = false
      starting = false

      const current = recorder
      recorder = null
      if (!current) {
        onEnd?.()
        return
      }

      if (cancelled || current.cancelled) {
        try {
          await current.cancel()
        } catch {
          releaseMediaStream(current.stream)
        }
        onEnd?.()
        return
      }

      onProcessing?.()
      try {
        const blob = await current.stop()
        if (!blob || blob.size < 64) {
          onError?.('no-speech')
          onEnd?.()
          return
        }
        const audio = await decodeToMono16k(blob)
        const text = await transcribeClip(audio, LANG_MAP[lang] || 'english')
        if (!text) {
          onError?.('no-speech')
        } else {
          onResult?.({ interim: '', final: text, complete: true })
        }
      } catch (err) {
        const msg = String(err?.message || '')
        if (msg.includes('worker') || msg.includes('model')) {
          onError?.('model-load-failed')
        } else {
          onError?.('transcribe-failed')
        }
      } finally {
        onEnd?.()
      }
    },

    cancel() {
      cancelled = true
      clearMaxTimer()
      session = false
      starting = false
      const current = recorder
      recorder = null
      if (current) {
        void current.cancel().catch(() => releaseMediaStream(current.stream))
      }
    },

    stop() {
      // Alias — service calls stopAndTranscribe via stopAndProcess callback.
      this.cancel()
    },

    abort() {
      this.cancel()
    },

    destroy() {
      this.cancel()
      if (worker) {
        try {
          worker.terminate()
        } catch {
          /* ignore */
        }
        worker = null
      }
      readyPromise = null
    },
  }
}
