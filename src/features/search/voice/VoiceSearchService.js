/**
 * VoiceSearchService — lean shared voice pipeline for every SearchBar.
 *
 * Latency model (Pixel / Apple dictation style):
 * 1. Interim transcripts stream into the search field immediately
 * 2. Short silence after speech auto-stops recognition
 * 3. Final text commits with no artificial processing / hold delay
 * 4. Mic returns to idle instantly and is reusable
 *
 * Engines: native Web Speech first; on-device Whisper only when native
 * is unavailable (Brave / missing API / cloud blocked).
 */

import { detectVoiceCapabilities, isBraveBrowser } from './capabilities'
import { createNativeEngine } from './nativeEngine'
import { createLocalEngine } from './localEngine'

export const VOICE_STATE = Object.freeze({
  idle: 'idle',
  permission: 'permission',
  listening: 'listening',
  processing: 'processing', // local Whisper only — never holds native path
  error: 'error',
  loadingModel: 'loading-model',
})

/** Auto-stop after this quiet period once we have speech. */
const SILENCE_MS = 720
/** Hard cap so a stuck session never blocks the mic. */
const MAX_LISTEN_MS = 10_000
/** Don't finalize on near-empty noise. */
const MIN_CHARS = 1

let activeServiceId = null
let nextId = 1

function emptySnapshot(overrides = {}) {
  return {
    state: VOICE_STATE.idle,
    transcript: '',
    interimTranscript: '',
    finalTranscript: '',
    error: null,
    supported: false,
    unavailable: true,
    listening: false,
    processing: false,
    engine: null,
    modelProgress: 0,
    ...overrides,
  }
}

export class VoiceSearchService {
  constructor({ lang = 'en-US', onChange } = {}) {
    this.id = nextId++
    this.lang = lang
    this.onChange = typeof onChange === 'function' ? onChange : null

    this._caps = detectVoiceCapabilities()
    this._native = this._caps.native ? createNativeEngine() : null
    this._local = this._caps.local ? createLocalEngine() : null
    this._preferLocal = false
    this._braveChecked = false
    this._destroyed = false
    this._starting = false
    this._finalText = ''
    this._interimText = ''
    this._userStop = false
    this._finalized = false
    this._activeEngine = null
    this._silenceTimer = null
    this._maxTimer = null

    this._snap = emptySnapshot({
      supported: this._caps.supported,
      unavailable: !this._caps.supported,
      error: this._caps.supported ? null : this._caps.reason,
    })

    void this._detectBravePref()
  }

  get snapshot() {
    return this._snap
  }

  setLang(lang) {
    this.lang = lang || 'en-US'
  }

  subscribe(fn) {
    this.onChange = fn
    return () => {
      if (this.onChange === fn) this.onChange = null
    }
  }

  async start() {
    if (this._destroyed) return
    if (this._starting) return
    if (this._snap.listening || this._snap.state === VOICE_STATE.permission) return
    if (this._snap.state === VOICE_STATE.processing) return

    this._caps = detectVoiceCapabilities()
    if (!this._caps.supported) {
      this._fail(this._caps.reason || 'unsupported', { unavailable: true })
      return
    }

    if (!this._braveChecked) await this._detectBravePref()

    this._starting = true
    this._userStop = false
    this._finalized = false
    this._finalText = ''
    this._interimText = ''
    this._clearTimers()

    activeServiceId = this.id
    window.dispatchEvent(new CustomEvent('em:voice-search-claim', { detail: { id: this.id } }))

    this._emit({
      state: VOICE_STATE.permission,
      error: null,
      supported: true,
      unavailable: false,
      listening: false,
      processing: false,
      transcript: '',
      interimTranscript: '',
      finalTranscript: '',
      modelProgress: 0,
    })

    const useLocal = this._preferLocal || !this._native
    const engine = (useLocal && this._local) ? this._local : (this._native || this._local)

    if (!engine) {
      this._starting = false
      this._fail('unsupported', { unavailable: true })
      return
    }

    this._activeEngine = engine
    if (engine.id === 'local') await this._startLocal(engine)
    else await this._startNative(engine)
  }

  /** User tap — finish now with whatever we have. */
  stop() {
    if (this._destroyed || this._finalized) return
    this._userStop = true
    this._finalize(this._liveText(), { allowEmpty: true })
  }

  clearError() {
    if (this._snap.state !== VOICE_STATE.error) return
    this._emitIdle()
  }

  yieldToPeer(peerId) {
    if (peerId === this.id) return
    if (this._snap.state === VOICE_STATE.idle && !this._starting) return
    this._userStop = true
    this._starting = false
    this._clearTimers()
    this._teardownEngine(true)
    this._emitIdle()
  }

  destroy() {
    this._destroyed = true
    this._starting = false
    this._clearTimers()
    this._teardownEngine(true)
    try { this._native?.destroy?.() } catch { /* ignore */ }
    try { this._local?.destroy?.() } catch { /* ignore */ }
    if (activeServiceId === this.id) activeServiceId = null
    this.onChange = null
  }

  /* ── native (fast path) ────────────────────────────────────── */

  async _startNative(engine) {
    await engine.start({
      lang: this.lang,
      continuous: true,
      onStart: () => {
        if (this._destroyed || this._finalized) return
        this._starting = false
        this._emit({
          state: VOICE_STATE.listening,
          listening: true,
          processing: false,
          error: null,
          engine: 'native',
        })
        this._armMaxTimer()
      },
      onResult: ({ interim, final: finalText, isFinalChunk }) => {
        if (this._destroyed || this._finalized) return
        // Full finals snapshot from the engine — not additive appends.
        this._finalText = finalText || ''
        this._interimText = interim || ''
        const live = this._liveText()

        // Live search input — same pipeline as typing.
        this._emit({
          transcript: live,
          interimTranscript: this._interimText,
          finalTranscript: this._finalText,
          state: VOICE_STATE.listening,
          listening: true,
          error: null,
        })

        if (live.length >= MIN_CHARS) {
          this._armSilence(isFinalChunk && this._finalText ? Math.min(SILENCE_MS, 380) : SILENCE_MS)
        }
      },
      onError: async (code) => {
        if (this._finalized) return
        this._starting = false

        if ((code === 'network' || code === 'service-not-allowed') && this._local && !this._userStop) {
          this._preferLocal = true
          this._activeEngine = null
          this._emit({
            state: VOICE_STATE.permission,
            listening: false,
            processing: false,
            error: null,
            engine: 'local',
          })
          await this._startLocal(this._local)
          return
        }

        this._activeEngine = null
        if (code === 'aborted') return
        if (code === 'network') {
          const brave = await isBraveBrowser()
          this._fail(brave ? 'network-brave' : 'network')
          return
        }
        // If we already have live text, keep it instead of hard-failing.
        const live = this._liveText()
        if (live) {
          this._finalize(live)
          return
        }
        this._fail(code)
      },
      onEnd: () => {
        if (this._destroyed || this._finalized) return
        this._starting = false
        if (this._snap.state === VOICE_STATE.error) return
        if (this._preferLocal && this._activeEngine?.id === 'local') return

        const live = this._liveText()
        if (live) this._finalize(live)
        else if (this._userStop) this._finalize('', { allowEmpty: true })
        else if (this._snap.state === VOICE_STATE.listening) this._fail('no-speech')
        else this._emitIdle()
      },
    })
  }

  /* ── local Whisper (fallback) ──────────────────────────────── */

  async _startLocal(engine) {
    this._activeEngine = engine
    await engine.start({
      lang: this.lang,
      onPermission: () => {
        this._emit({
          state: VOICE_STATE.permission,
          listening: false,
          processing: false,
          engine: 'local',
        })
      },
      onProgress: (pct) => {
        if (this._snap.listening || this._finalized) return
        this._emit({
          state: VOICE_STATE.loadingModel,
          modelProgress: pct,
          engine: 'local',
        })
      },
      onStart: () => {
        if (this._destroyed || this._finalized) return
        this._starting = false
        this._emit({
          state: VOICE_STATE.listening,
          listening: true,
          processing: false,
          error: null,
          engine: 'local',
        })
        this._armMaxTimer()
      },
      onError: (code) => {
        if (this._finalized) return
        this._starting = false
        this._activeEngine = null
        this._fail(code)
      },
      stopAndProcess: () => {
        this._finalizeLocal()
      },
    })
  }

  _finalizeLocal() {
    if (this._finalized) return
    const engine = this._activeEngine
    if (!engine || engine.id !== 'local') {
      this._finalize(this._liveText(), { allowEmpty: true })
      return
    }

    this._clearTimers()
    this._emit({
      state: VOICE_STATE.processing,
      listening: false,
      processing: true,
      error: null,
    })

    void engine.stopAndTranscribe({
      lang: this.lang,
      onProcessing: () => {},
      onResult: ({ final: text }) => {
        this._finalize(text)
      },
      onError: (code) => {
        if (code === 'no-speech' && this._userStop) {
          this._finalize('', { allowEmpty: true })
          return
        }
        this._fail(code)
      },
      onEnd: () => {
        if (this._activeEngine?.id === 'local') this._activeEngine = null
      },
    })
  }

  /* ── finalize / timers ─────────────────────────────────────── */

  _liveText() {
    return [this._finalText, this._interimText].filter(Boolean).join(' ').trim()
      || String(this._snap.transcript || '').trim()
  }

  /**
   * Immediate commit — no results-hold or processing delay on native path.
   * Tears down recognition and returns mic to idle in the same tick.
   */
  _finalize(text, { allowEmpty = false } = {}) {
    if (this._finalized) return
    this._finalized = true
    this._starting = false
    this._clearTimers()

    const clean = String(text || '').trim()
    const engine = this._activeEngine

    if (engine?.id === 'local' && this._snap.listening && !this._userStop && !clean) {
      // Max-timer / silence on local → run whisper once.
      this._finalized = false
      this._finalizeLocal()
      return
    }

    if (engine?.id === 'local' && this._snap.listening && (this._userStop || clean)) {
      // User stop during local listen — still need whisper for audio.
      this._finalized = false
      this._finalizeLocal()
      return
    }

    this._teardownEngine(false)

    if (!clean && !allowEmpty) {
      this._fail('no-speech')
      return
    }

    if (activeServiceId === this.id) activeServiceId = null

    this._emitIdle(clean ? {
      transcript: clean,
      finalTranscript: clean,
    } : {})
  }

  _armSilence(ms = SILENCE_MS) {
    if (this._silenceTimer) window.clearTimeout(this._silenceTimer)
    this._silenceTimer = window.setTimeout(() => {
      this._silenceTimer = null
      if (this._finalized || this._destroyed) return
      const live = this._liveText()
      if (live.length >= MIN_CHARS) this._finalize(live)
    }, ms)
  }

  _armMaxTimer() {
    if (this._maxTimer) window.clearTimeout(this._maxTimer)
    this._maxTimer = window.setTimeout(() => {
      this._maxTimer = null
      if (this._finalized || this._destroyed) return
      const live = this._liveText()
      if (live) this._finalize(live)
      else if (this._activeEngine?.id === 'local') this._finalizeLocal()
      else this._finalize('', { allowEmpty: true })
    }, MAX_LISTEN_MS)
  }

  _clearTimers() {
    if (this._silenceTimer) {
      window.clearTimeout(this._silenceTimer)
      this._silenceTimer = null
    }
    if (this._maxTimer) {
      window.clearTimeout(this._maxTimer)
      this._maxTimer = null
    }
  }

  _teardownEngine(abort) {
    const engine = this._activeEngine
    this._activeEngine = null
    if (!engine) return
    try {
      if (abort) engine.abort?.() || engine.cancel?.()
      else if (engine.id === 'native') engine.stop?.()
      else engine.cancel?.()
    } catch {
      /* ignore */
    }
  }

  async _detectBravePref() {
    try {
      const brave = await isBraveBrowser()
      if (brave && this._local) this._preferLocal = true
    } catch {
      /* ignore */
    } finally {
      this._braveChecked = true
    }
  }

  _emit(patch) {
    this._snap = { ...this._snap, ...patch }
    this.onChange?.(this._snap)
  }

  _emitIdle(extra = {}) {
    this._emit({
      state: VOICE_STATE.idle,
      listening: false,
      processing: false,
      error: null,
      interimTranscript: '',
      modelProgress: 0,
      supported: this._caps.supported,
      unavailable: !this._caps.supported,
      ...extra,
    })
  }

  _fail(code, extra = {}) {
    this._finalized = true
    this._starting = false
    this._clearTimers()
    this._teardownEngine(true)
    if (activeServiceId === this.id) activeServiceId = null
    this._emit({
      state: VOICE_STATE.error,
      error: code || 'error',
      listening: false,
      processing: false,
      unavailable: extra.unavailable ?? !this._caps.supported,
      supported: this._caps.supported,
      ...extra,
    })
  }
}

export const VoiceSearchSession = VoiceSearchService
