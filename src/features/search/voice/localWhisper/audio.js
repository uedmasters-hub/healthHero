/**
 * Mic capture + resampling for on-device Whisper (PocketPills localWhisper/audio).
 */

const TARGET_SAMPLE_RATE = 16_000

export class Recorder {
  constructor(stream) {
    this.stream = stream
    this.chunks = []
    this.resolveStop = null
    this.cancelled = false
    this.recorder = new MediaRecorder(stream)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' })
      this.resolveStop?.(blob)
      this.resolveStop = null
    }
    this.recorder.start()
  }

  /** Stop recording and release the microphone. Resolves with the clip. */
  stop() {
    const done = new Promise((resolve) => {
      this.resolveStop = resolve
    })
    if (this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop()
      } catch {
        this.resolveStop?.(new Blob([], { type: 'audio/webm' }))
        this.resolveStop = null
      }
    } else {
      this.resolveStop?.(new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' }))
      this.resolveStop = null
    }
    try {
      this.stream.getTracks().forEach((t) => t.stop())
    } catch {
      /* ignore */
    }
    return done
  }

  /** Tabcom cancel — discard silently after stop. */
  cancel() {
    this.cancelled = true
    return this.stop()
  }
}

/** Decode a recorded clip and resample to mono 16kHz for Whisper. */
export async function decodeToMono16k(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) throw new Error('audio-decode-unsupported')
  const decodeCtx = new AudioCtx()
  let decoded
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    void decodeCtx.close()
  }

  const durationS = decoded.duration
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(durationS * TARGET_SAMPLE_RATE),
    TARGET_SAMPLE_RATE,
  )
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}
