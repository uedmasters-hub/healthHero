import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { READINESS_MS } from '../../../supabase/functions/_shared/videoEngine.mjs'
import { clearVideoJourney, clearVideoLock, readVideoJourney, saveVideoJourney, VIDEO_SLOT_PATH, videoEntryState, writeVideoLock } from './lock'
import { closeReadiness, completeReadiness, startReadiness } from './sessionApi'
import {
  attachPreview,
  measureReadiness,
  openCameraPreview,
  probeSpeaker,
  readDevicePower,
  releasePreviewUrl,
  startPreviewRecording,
  stopStream,
} from './tabcomEngine'
import './VideoConsult.css'

const CHECKS = [
  { id: 'camera', label: 'Camera', at: 0.08 },
  { id: 'microphone', label: 'Microphone', at: 0.18 },
  { id: 'speaker', label: 'Speaker', at: 0.28 },
  { id: 'upload', label: 'Upload', at: 0.4 },
  { id: 'download', label: 'Download', at: 0.52 },
  { id: 'connection', label: 'Connection', at: 0.64 },
  { id: 'device', label: 'Device', at: 0.76 },
  { id: 'battery', label: 'Battery', at: 0.88 },
]

const LIVE_ROWS = [
  { id: 'camera', label: 'Camera', at: 0.08 },
  { id: 'microphone', label: 'Microphone', at: 0.22 },
  { id: 'speaker', label: 'Speaker', at: 0.4 },
  { id: 'internet', label: 'Internet', at: 0.62 },
]

function clock(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `0:${String(seconds).padStart(2, '0')}`
}

function checkId(id) {
  return id === 'internet' ? 'connection' : id
}

function checkOk(id, sample) {
  if (id === 'camera') return Boolean(sample.camera)
  if (id === 'microphone') return Boolean(sample.microphone)
  if (id === 'speaker') return sample.speaker === true
  if (id === 'upload') return sample.uplinkMbps == null ? sample.progress >= 0.9 : sample.uplinkMbps > 0.2
  if (id === 'download') return sample.downlinkMbps == null ? sample.progress >= 0.9 : sample.downlinkMbps >= 0.4
  if (id === 'device') return (sample.hardwareConcurrency || 0) > 0 || sample.progress >= 0.9
  if (id === 'battery') return sample.batteryChecked === true && sample.lowPower !== true
  const latencyOk = sample.latencyMs == null || sample.latencyMs <= 280
  const lossOk = sample.packetLoss == null || sample.packetLoss <= 0.08
  return Boolean(sample.stable) && latencyOk && lossOk
}

function requestLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  })
}

export default function ReadinessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const doctor = location.state?.doctor || readVideoJourney()?.doctor
  const dockRef = useRef(null)
  const stageRef = useRef(null)
  const liveRef = useRef(null)
  const pipRef = useRef(null)
  const playRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const playbackUrlRef = useRef(null)
  const dragRef = useRef(null)
  const frameRef = useRef(null)
  const [phase, setPhase] = useState(() => {
    const saved = readVideoJourney()
    return saved?.phase === 'ready' && saved?.outcome ? 'ready' : 'permissions'
  })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [facing, setFacing] = useState('user')
  const [progress, setProgress] = useState(0)
  const [sample, setSample] = useState({})
  const [outcome, setOutcome] = useState(() => readVideoJourney()?.outcome || null)
  const [summary, setSummary] = useState(() => readVideoJourney()?.summary || null)
  const [error, setError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [playbackUrl, setPlaybackUrl] = useState(null)
  const [recordedFront, setRecordedFront] = useState(true)
  const locationGrantedRef = useRef(false)
  const [pipPos, setPipPos] = useState(null)

  const rememberUrl = (url) => {
    releasePreviewUrl(playbackUrlRef.current)
    playbackUrlRef.current = url
    setPlaybackUrl(url)
  }

  const discardPreview = () => {
    recorderRef.current?.discard?.()
    recorderRef.current = null
    if (playRef.current) {
      playRef.current.pause?.()
      playRef.current.removeAttribute('src')
      playRef.current.load?.()
    }
    releasePreviewUrl(playbackUrlRef.current)
    playbackUrlRef.current = null
    setPlaybackUrl(null)
  }

  const stopAll = () => {
    discardPreview()
    stopStream(streamRef.current)
    streamRef.current = null
  }

  const exit = () => {
    stopAll()
    const saved = readVideoJourney()
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }
    const returnTo = location.state?.returnTo || saved?.returnTo
    const target = doctor || saved?.doctor
    if (returnTo && String(returnTo).startsWith('/doctor/')) {
      navigate(returnTo, { replace: true, state: videoEntryState(saved || { doctor: target }) })
      return
    }
    if (target?.id) {
      navigate(`/doctor/${target.id}`, { replace: true, state: videoEntryState({ doctor: target }) })
    }
  }

  const resume = () => {
    stopAll()
    const saved = readVideoJourney()
    const fromRoute = location.state?.afterReadiness?.state || location.state || {}
    const nextDoctor = fromRoute.doctor || saved?.doctor
    if (!nextDoctor) return
    const state = videoEntryState({
      ...saved,
      ...fromRoute,
      doctor: nextDoctor,
      date: fromRoute.date || saved?.date || null,
      time: fromRoute.time || saved?.time || null,
      phase: 'ready',
      outcome,
      summary,
    })
    saveVideoJourney(state)
    navigate(VIDEO_SLOT_PATH, { replace: true, state })
  }

  const bookForSomeone = () => {
    saveVideoJourney({
      ...(location.state || {}),
      doctor,
      forSomeoneElse: true,
    })
    beginLive()
  }

  const leaveForInPerson = () => {
    stopAll()
    clearVideoLock()
    clearVideoJourney()
    navigate('/booking', {
      replace: true,
      state: {
        preferredVisitType: 'In-Person',
        visitType: 'In-Person',
        videoLock: false,
        origin: location.state?.origin || 'video',
        doctor,
      },
    })
  }

  const beginLive = async () => {
    discardPreview()
    setBusy(true)
    setError('')
    setOutcome(null)
    setSummary(null)
    const granted = locationGrantedRef.current || await requestLocation()
    locationGrantedRef.current = granted
    try {
      stopStream(streamRef.current)
      const stream = await openCameraPreview({ facingMode: 'user' })
      streamRef.current = stream
      setFacing('user')
      setPhase('live')
      setAttempt((value) => value + 1)
    } catch (err) {
      setOutcome('poor')
      setError(err?.name === 'NotAllowedError'
        ? 'Allow the camera and microphone, then run the test again.'
        : 'We could not open the camera. Try again.')
      setPhase('ready')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (phase !== 'live' || attempt === 0) return undefined
    let cancelled = false
    const stream = streamRef.current
    setProgress(0)
    setSample({})
    setOutcome(null)
    setPlaybackUrl(null)
    ;(async () => {
      if (!stream) return
      let sessionId = null
      try {
        const session = await startReadiness()
        sessionId = session.sessionId
        if (cancelled) return
        if (liveRef.current) liveRef.current.removeAttribute('src')
        attachPreview(liveRef.current, stream)
        attachPreview(pipRef.current, stream)
        const [speaker, power] = await Promise.all([
          speakerOn ? probeSpeaker() : Promise.resolve(false),
          readDevicePower(),
        ])
        if (cancelled) return
        setRecordedFront(true)
        recorderRef.current = startPreviewRecording(stream)
        const metrics = await measureReadiness(stream, {
          durationMs: READINESS_MS,
          onProgress: (value) => { if (!cancelled) setProgress(value) },
          onSample: (next) => {
            if (!cancelled) setSample({ ...next, speaker, ...power, locationGranted: locationGrantedRef.current })
          },
        })
        const result = await completeReadiness(session.sessionId, {
          ...metrics,
          speaker,
          ...power,
          locationGranted: locationGrantedRef.current,
        })
        if (cancelled) return
        const blob = await recorderRef.current?.stop?.()
        recorderRef.current = null
        if (blob) rememberUrl(URL.createObjectURL(blob))
        const nextSummary = {
          camera: Boolean(metrics.camera),
          microphone: Boolean(metrics.microphone),
          speaker,
          locationGranted: locationGrantedRef.current,
          lowPower: Boolean(power.lowPower),
          connection: result.outcome,
        }
        setSummary(nextSummary)
        saveVideoJourney({
          ...(location.state || {}),
          doctor,
          outcome: result.outcome,
          phase: 'ready',
          summary: nextSummary,
        })
        await closeReadiness(sessionId)
        writeVideoLock({
          outcome: result.outcome,
          qualityScore: result.qualityScore,
          checkedAt: Date.now(),
          metrics: {
            latencyMs: metrics.latencyMs,
            jitterMs: metrics.jitterMs,
            packetLoss: metrics.packetLoss,
            networkType: metrics.networkType,
            camera: metrics.camera,
            microphone: metrics.microphone,
            speaker,
            lowPower: power.lowPower,
            locationGranted: locationGrantedRef.current,
          },
        })
        setOutcome(result.outcome)
        setPhase('ready')
      } catch (err) {
        if (cancelled) return
        if (sessionId) await closeReadiness(sessionId)
        recorderRef.current?.discard?.()
        recorderRef.current = null
        const nextSummary = {
          camera: false,
          microphone: false,
          speaker: false,
          locationGranted: locationGrantedRef.current,
          lowPower: false,
          connection: 'poor',
        }
        setSummary(nextSummary)
        saveVideoJourney({
          ...(location.state || {}),
          doctor,
          outcome: 'poor',
          phase: 'ready',
          summary: nextSummary,
        })
        writeVideoLock({ outcome: 'poor', qualityScore: 0, checkedAt: Date.now() })
        setOutcome('poor')
        setError(err?.name === 'NotAllowedError'
          ? 'Allow the camera and microphone, then run the test again.'
          : 'We could not finish the check. Try again.')
        setPhase('ready')
      }
    })()
    return () => {
      cancelled = true
      recorderRef.current?.discard?.()
      recorderRef.current = null
    }
  }, [phase, attempt])

  useEffect(() => () => {
    recorderRef.current?.discard?.()
    releasePreviewUrl(playbackUrlRef.current)
    stopStream(streamRef.current)
  }, [])

  const setTrackEnabled = (kind, enabled) => {
    streamRef.current?.getTracks?.().forEach((track) => {
      if (track.kind === kind) track.enabled = enabled
    })
  }

  const flipCamera = async () => {
    const nextFacing = facing === 'user' ? 'environment' : 'user'
    try {
      const stream = await openCameraPreview({ facingMode: nextFacing })
      stream.getAudioTracks().forEach((track) => { track.enabled = micOn })
      stream.getVideoTracks().forEach((track) => { track.enabled = cameraOn })
      recorderRef.current?.discard?.()
      stopStream(streamRef.current)
      streamRef.current = stream
      setFacing(nextFacing)
      if (phase === 'live') {
        if (liveRef.current) liveRef.current.removeAttribute('src')
        attachPreview(liveRef.current, stream)
        setRecordedFront(nextFacing === 'user')
        recorderRef.current = startPreviewRecording(stream)
      }
      attachPreview(pipRef.current, stream)
    } catch {
      /* keep the current camera */
    }
  }

  const onPipDown = (event) => {
    const stage = stageRef.current?.getBoundingClientRect()
    const pip = frameRef.current?.getBoundingClientRect()
    if (!stage || !pip) return
    dragRef.current = {
      dx: event.clientX - pip.left,
      dy: event.clientY - pip.top,
      width: pip.width,
      height: pip.height,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPipMove = (event) => {
    if (!dragRef.current || !stageRef.current) return
    const stage = stageRef.current.getBoundingClientRect()
    const { dx, dy, width, height } = dragRef.current
    const reserve = dockRef.current?.offsetHeight || 0
    const x = Math.min(Math.max(12, event.clientX - stage.left - dx), stage.width - width - 12)
    const y = Math.min(Math.max(12, event.clientY - stage.top - dy), Math.max(12, stage.height - height - reserve - 12))
    setPipPos({ x, y })
  }

  const remaining = Math.max(0, READINESS_MS - progress * READINESS_MS)
  const revealed = LIVE_ROWS.filter((item) => progress >= item.at)
  const done = CHECKS.filter((item) => checkOk(item.id, sample) && progress >= item.at).length
  const ring = CHECKS.length ? done / CHECKS.length : 0
  const passed = outcome === 'ready' || outcome === 'usable'
  const cameraReady = sample.camera != null ? Boolean(sample.camera) : Boolean(summary?.camera)
  const micReady = sample.microphone != null ? Boolean(sample.microphone) : Boolean(summary?.microphone)
  const lowPower = Boolean(sample.lowPower || summary?.lowPower)
  const internetCopy = outcome === 'ready'
    ? 'Good for video call'
    : outcome === 'usable'
      ? 'Usable for a video call'
      : 'Needs a stronger network'
  const speakerCopy = sample.speaker === true || summary?.speaker
    ? 'You\'ll hear clearly'
    : (passed ? 'You\'ll hear clearly' : 'Needs a check')

  if (phase === 'permissions') {
    return (
      <div className="video-preflight">
        <div className="video-preflight-intro">
          <SignalMark />
          <h1>Let's check your video call</h1>
          <p>This takes about 10 seconds. We'll make sure everything works before you book.</p>
        </div>
        <div className="video-preview-placeholder">
          <PhotoIcon />
          <span>Live preview starts after permission</span>
        </div>
        <div className="video-check-heading">
          <div>
            <h2>We'll check</h2>
            <p>This happens automatically.</p>
          </div>
          <span className="video-time-pill">10 sec</span>
        </div>
        <ul className="video-check-grid">
          <li>
            <CamIcon />
            <strong>Camera</strong>
            <span>Pending</span>
          </li>
          <li>
            <MicIcon />
            <strong>Microphone</strong>
            <span>Pending</span>
          </li>
          <li>
            <SignalMark small />
            <strong>Internet</strong>
            <span>Pending</span>
          </li>
          <li>
            <SpeakerIcon />
            <strong>Speaker</strong>
            <span>Pending</span>
          </li>
        </ul>
        <div className="video-actions">
          <button type="button" className="video-secondary" disabled={busy} onClick={bookForSomeone}>
            Booking for someone else
          </button>
          <button type="button" className="video-primary" disabled={busy} onClick={beginLive}>
            {busy ? 'Asking…' : 'Start check'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div className="video-ready">
        <div className="video-ready-intro">
          <div className={`video-ready-mark${passed ? '' : ' is-poor'}`} aria-hidden="true">{passed ? '✓' : '!'}</div>
          <h1>{passed ? "You're all set" : "Let's improve the setup"}</h1>
          <p>
            {passed
              ? 'Everything is working well. You can book your video call now.'
              : (error || 'A brighter room, a quieter space, or a stronger network will make the visit clearer.')}
          </p>
        </div>
        {playbackUrl ? (
          <div className="video-ready-frame">
            <video
              ref={playRef}
              className={`video-ready-play${recordedFront ? ' is-mirror' : ''}`}
              src={playbackUrl}
              autoPlay
              playsInline
              aria-label="Preview of how you look and sound"
            />
            <span className="video-ready-playbtn" aria-hidden="true"><PlayIcon /></span>
            <p className="video-ready-caption">This is how you'll look on the call</p>
          </div>
        ) : null}
        <ul className="video-check-grid is-result">
          <li>
            {cameraReady ? <span className="video-grid-check" aria-hidden="true"><CheckIcon /></span> : null}
            <CamIcon />
            <strong>Camera</strong>
            <span>{cameraReady ? 'Looks good' : 'Needs a check'}</span>
          </li>
          <li>
            {micReady ? <span className="video-grid-check" aria-hidden="true"><CheckIcon /></span> : null}
            <MicIcon />
            <strong>Microphone</strong>
            <span>{micReady ? 'Working well' : 'Needs a check'}</span>
          </li>
          <li>
            {passed ? <span className="video-grid-check" aria-hidden="true"><CheckIcon /></span> : null}
            <SignalMark small />
            <strong>Internet</strong>
            <span>{internetCopy}</span>
          </li>
          <li>
            {passed ? <span className="video-grid-check" aria-hidden="true"><CheckIcon /></span> : null}
            <SpeakerIcon />
            <strong>Speaker</strong>
            <span>{speakerCopy}</span>
          </li>
        </ul>
        {lowPower ? <p>Low Power Mode is on. Charging the device will keep the picture steadier.</p> : null}
        <p className="video-privacy">This preview stays on this device. It is deleted when you continue or leave, and it is never uploaded.</p>
        {passed ? (
          <div className="video-actions">
            <button type="button" className="video-secondary" onClick={beginLive}>Run test again</button>
            <button type="button" className="video-primary" onClick={resume}>Continue</button>
          </div>
        ) : (
          <div className="video-actions">
            <button type="button" className="video-secondary" onClick={leaveForInPerson}>Switch to In-Person</button>
            <button type="button" className="video-primary" onClick={beginLive}>Retry Test</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`video-readiness${facing === 'user' ? ' is-front' : ''}`}>
      <section ref={stageRef} className="video-stage" aria-label="Video readiness check">
        <video ref={liveRef} autoPlay muted playsInline aria-label="Your camera preview" />
        <div className="video-readiness-shade" aria-hidden="true" />
        <header className="video-readiness-top">
          <h1>Checking connection</h1>
          <p className="video-countdown" role="timer" aria-label={`${Math.ceil(remaining / 1000)} seconds remaining`}>{clock(remaining)}</p>
        </header>
        <div
          ref={frameRef}
          className="video-pip-frame"
          style={pipPos ? { left: pipPos.x, top: pipPos.y, right: 'auto' } : undefined}
          onPointerDown={onPipDown}
          onPointerMove={onPipMove}
          onPointerUp={() => { dragRef.current = null }}
        >
          <div className={`video-pip${facing === 'user' ? ' is-mirror' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ring * 100)} aria-valuetext="Readiness checks">
            <video ref={pipRef} autoPlay muted playsInline aria-label="Self preview" />
          </div>
        </div>
      </section>
      <div ref={dockRef} className="video-readiness-dock">
        {revealed.length ? (
          <div className="video-check-card" aria-live="polite">
            {revealed.map((item) => {
              const ok = checkOk(checkId(item.id), sample)
              return (
                <div key={item.id} className={`video-check-row${ok ? ' is-done' : ''}`} aria-current={ok ? undefined : 'step'}>
                  <span className={`video-check-icon${ok ? '' : ' is-pending'}`} aria-hidden="true">{ok ? <CheckIcon /> : null}</span>
                  <span className="video-check-name">{item.label}</span>
                  {ok ? null : <span className="video-check-state">Checking...</span>}
                </div>
              )
            })}
          </div>
        ) : null}
        <div className="video-call-controls" role="group" aria-label="Call controls">
        <button type="button" className={`video-call-btn${micOn ? '' : ' is-off'}`} aria-pressed={micOn} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'} onClick={() => { const next = !micOn; setMicOn(next); setTrackEnabled('audio', next) }}>
          <MicIcon off={!micOn} />
        </button>
        <button type="button" className={`video-call-btn${cameraOn ? '' : ' is-off'}`} aria-pressed={cameraOn} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'} onClick={() => { const next = !cameraOn; setCameraOn(next); setTrackEnabled('video', next) }}>
          <CamIcon off={!cameraOn} />
        </button>
        <button type="button" className={`video-call-btn${speakerOn ? '' : ' is-off'}`} aria-pressed={speakerOn} aria-label={speakerOn ? 'Turn speaker off' : 'Turn speaker on'} onClick={() => setSpeakerOn((value) => !value)}>
          <SpeakerIcon off={!speakerOn} />
        </button>
        <button type="button" className="video-call-btn" aria-label="Switch camera" onClick={flipCamera}>
          <FlipIcon />
        </button>
        <button type="button" className="video-call-btn is-end" aria-label="Cancel" onClick={exit}>
          <EndIcon />
        </button>
        </div>
      </div>
    </div>
  )
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4.5 8.2h2.6l1.4-2h6.9l1.4 2H19.5a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-8.2a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13.2" r="3.1" />
    </svg>
  )
}

function SignalMark({ small = false }) {
  return (
    <svg className={`video-signal${small ? ' is-small' : ''}`} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="28" width="6" height="12" rx="2" />
      <rect x="16" y="20" width="6" height="20" rx="2" />
      <rect x="26" y="12" width="6" height="28" rx="2" />
      <rect x="36" y="4" width="6" height="36" rx="2" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7.5v9l8-4.5-8-4.5z" fill="currentColor" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7.5" />
    </svg>
  )
}

function MicIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  )
}

function CamIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
      {off ? <path d="M2 2l20 20" /> : null}
    </svg>
  )
}

function SpeakerIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      {off ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6" />}
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 8V4h4" />
      <path d="M20 16v4h-4" />
      <path d="M20 8A8 8 0 0 0 7 5L4 8" />
      <path d="M4 16a8 8 0 0 0 13 3l3-3" />
    </svg>
  )
}

function EndIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
