/**
 * Whisper in a Web Worker — PocketPills localWhisper/whisperWorker port.
 * Model download is cached after first use; keeps main thread free.
 */

import { pipeline } from '@huggingface/transformers'

const ctx = self

const MODEL_ID = 'Xenova/whisper-tiny'
const DTYPE = 'q8'

let transcriberPromise = null

function loadModel() {
  if (transcriberPromise) return transcriberPromise

  transcriberPromise = pipeline('automatic-speech-recognition', MODEL_ID, {
    device: 'auto',
    dtype: DTYPE,
    progress_callback: (info) => {
      if (info.status === 'progress' || info.status === 'progress_total') {
        ctx.postMessage({
          type: 'progress',
          progress: info.progress ?? 0,
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
        })
      }
    },
  })

  return transcriberPromise
}

function describeError(err) {
  if (err instanceof Error) return err.message
  return String(err)
}

ctx.onmessage = async (event) => {
  const data = event.data

  if (data.type === 'load') {
    try {
      await loadModel()
      ctx.postMessage({ type: 'ready' })
    } catch (err) {
      transcriberPromise = null
      ctx.postMessage({ type: 'error', message: describeError(err) })
    }
    return
  }

  if (data.type === 'transcribe') {
    try {
      const transcriber = await loadModel()
      const output = await transcriber(data.audio, {
        language: data.language,
        task: 'transcribe',
      })
      const text = Array.isArray(output) ? (output[0]?.text ?? '') : (output.text ?? '')
      ctx.postMessage({ type: 'result', text: String(text || '').trim() })
    } catch (err) {
      ctx.postMessage({ type: 'error', message: describeError(err) })
    }
  }
}
