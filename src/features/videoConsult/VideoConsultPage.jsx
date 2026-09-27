import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchProviderAvailability, queryProviders } from '../providers'
import { useBooking } from '../../components/BookingContext'
import { confirmConsultationAccess } from '../auth/services/oauth'
import { READINESS_MS } from '../../../supabase/functions/_shared/videoEngine.mjs'
import { videoDoctorsWithSlots } from './catalog'
import {
  clearVideoLock,
  readinessStillValid,
  readVideoLock,
  videoEntryState,
  writeVideoLock,
} from './lock'
import {
  completeReadiness,
  markEnded,
  markJoined,
  reopenConsultation,
  reserveThenProvision,
  startReadiness,
} from './sessionApi'
import {
  attachPreview,
  createLocalCall,
  measureReadiness,
  openCameraPreview,
  stopStream,
} from './tabcomEngine'
import './VideoConsult.css'

function BackButton({ onClick, label = 'Back' }) {
  return (
    <button type="button" className="ds-icon-btn is-xl" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19 12H5" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  )
}

function formatDay(iso) {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-NP', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function VideoConsultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { appointmentId: joinAppointmentId } = useParams()
  const { reserveVideoAppointment, getBooking } = useBooking()
  const lock = readVideoLock()
  const incomingDoctor = location.state?.doctor || null

  const [step, setStep] = useState(() => {
    if (joinAppointmentId) return 'join'
    if (incomingDoctor && readinessStillValid(lock)) return 'slots'
    if (incomingDoctor) return 'readiness'
    return 'list'
  })
  const [rows, setRows] = useState([])
  const [loadingList, setLoadingList] = useState(step === 'list')
  const [doctor, setDoctor] = useState(incomingDoctor)
  const [slots, setSlots] = useState(location.state?.slots || [])
  const [selected, setSelected] = useState(null)
  const [progress, setProgress] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [outcome, setOutcome] = useState(lock?.outcome || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(null)
  const videoRef = useRef(null)
  const remoteRef = useRef(null)
  const streamRef = useRef(null)
  const metricsRef = useRef(null)
  const transportRef = useRef(null)
  const sessionRef = useRef(lock?.consultationSessionId || null)
  const callRef = useRef(null)

  useEffect(() => {
    writeVideoLock({ videoLock: true, doctorId: doctor?.id || lock?.doctorId || null })
  }, [doctor?.id, lock?.doctorId])

  useEffect(() => {
    if (step !== 'list') return undefined
    let cancelled = false
    setLoadingList(true)
    ;(async () => {
      const result = await queryProviders({ pageSize: 24, useRadius: false })
      const doctors = result?.doctors || []
      const pairs = await Promise.all(doctors.slice(0, 16).map(async (item) => {
        const live = await fetchProviderAvailability(item).catch(() => [])
        return [String(item.providerUuid || item.id), live]
      }))
      if (cancelled) return
      setRows(videoDoctorsWithSlots(doctors, new Map(pairs)))
      setLoadingList(false)
    })().catch(() => {
      if (!cancelled) setLoadingList(false)
    })
    return () => { cancelled = true }
  }, [step])

  useEffect(() => {
    if (step !== 'readiness') return undefined
    let cancelled = false
    const video = videoRef.current
    setProgress(0)
    setOutcome(null)
    setError('')
    ;(async () => {
      try {
        const session = await startReadiness()
        const stream = await openCameraPreview()
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        attachPreview(video, stream)
        const metrics = await measureReadiness(stream, {
          durationMs: READINESS_MS,
          onProgress: (value) => { if (!cancelled) setProgress(value) },
        })
        const result = await completeReadiness(session.sessionId, metrics)
        if (cancelled) return
        metricsRef.current = { ...metrics, qualityScore: result.qualityScore, outcome: result.outcome }
        setOutcome(result.outcome)
        writeVideoLock({
          outcome: result.outcome,
          checkedAt: Date.now(),
          doctorId: doctor?.id || null,
        })
      } catch (err) {
        if (cancelled) return
        metricsRef.current = { camera: false, microphone: false, outcome: 'poor', qualityScore: 0 }
        setOutcome('poor')
        setError(err?.name === 'NotAllowedError'
          ? 'Allow the camera and microphone, then try again.'
          : 'We could not finish the check. Try again.')
      }
    })()
    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [step, doctor?.id, attempt])

  useEffect(() => {
    if (step !== 'readiness' || outcome !== 'ready') return undefined
    const timer = window.setTimeout(() => setStep('slots'), 900)
    return () => window.clearTimeout(timer)
  }, [step, outcome])

  useEffect(() => {
    if (step !== 'slots' || slots.length || !doctor) return undefined
    let cancelled = false
    fetchProviderAvailability(doctor).then((live) => {
      if (cancelled) return
      const [row] = videoDoctorsWithSlots([doctor], new Map([[String(doctor.providerUuid || doctor.id), live || []]]))
      setSlots(row?.slots || [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [step, doctor, slots.length])

  useEffect(() => {
    if (step !== 'join') return undefined
    let cancelled = false
    const video = videoRef.current
    ;(async () => {
      try {
        const stream = await openCameraPreview()
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        attachPreview(video, stream)
        const existingId = sessionRef.current
        if (existingId && !transportRef.current) {
          const reopened = await reopenConsultation(existingId)
          transportRef.current = reopened.transport
        }
        if (existingId) await markJoined(existingId)
        const call = createLocalCall({
          localStream: stream,
          onRemoteStream: (remote) => {
            if (!remoteRef.current) return
            remoteRef.current.srcObject = remote
            remoteRef.current.classList.add('is-live')
            remoteRef.current.play?.().catch(() => {})
          },
          onSignal: () => {},
        })
        callRef.current = call
        if (!transportRef.current?.url && transportRef.current?.kind !== 'livekit') {
          await call.start().catch(() => {})
        }
        if (transportRef.current?.kind === 'livekit' && transportRef.current.token) {
          const livekit = await import('livekit-client').catch(() => null)
          if (livekit && transportRef.current.serverUrl) {
            const room = new livekit.Room()
            await room.connect(transportRef.current.serverUrl, transportRef.current.token)
            await room.localParticipant.setMicrophoneEnabled(true)
            await room.localParticipant.setCameraEnabled(true)
          }
        }
      } catch {
        if (!cancelled) setError('We could not open the consultation. Try again.')
      }
    })()
    return () => {
      cancelled = true
      callRef.current?.end()
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [step])

  const grouped = useMemo(() => {
    const map = new Map()
    slots.forEach((slot) => {
      const list = map.get(slot.date) || []
      list.push(slot)
      map.set(slot.date, list)
    })
    return Array.from(map.entries())
  }, [slots])

  const chooseDoctor = (row) => {
    setDoctor(row.doctor)
    setSlots(row.slots)
    setSelected(null)
    writeVideoLock({ doctorId: row.doctor.id, videoLock: true })
    setStep(readinessStillValid(readVideoLock()) ? 'slots' : 'readiness')
  }

  const confirm = async () => {
    if (!doctor || !selected || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await reserveThenProvision({
        reserve: (slot) => reserveVideoAppointment({
          doctor,
          date: { full: new Date(`${slot.date}T00:00:00`) },
          time: slot.time,
          visitType: 'Video Consultation',
          duration: '30 min',
          origin: location.state?.origin || 'video',
          patient: { name: 'Patient', relationship: 'Self' },
        }),
        slot: selected,
        capabilities: metricsRef.current || { outcome: outcome || 'ready', webrtc: true, camera: true, microphone: true },
      })
      if (result.needsConsent) {
        setBooking(result.booking)
        await confirmConsultationAccess()
        return
      }
      transportRef.current = result.session.transport
      sessionRef.current = result.session.sessionId
      setBooking(result.booking)
      writeVideoLock({
        appointmentId: result.booking.engineId || result.booking.id,
        consultationSessionId: result.session.sessionId,
        outcome: metricsRef.current?.outcome || outcome,
      })
      setStep('booked')
    } catch (err) {
      if (err?.needsConsent || err?.code === 'needs_consent') {
        await confirmConsultationAccess()
        return
      }
      if (err?.code === 'reservation_failed') {
        setError('That time could not be reserved. Choose another time.')
        return
      }
      setError('The appointment was saved, but the consultation could not be opened. You can try joining again.')
      setStep('booked')
    } finally {
      setBusy(false)
    }
  }

  const leaveForInPerson = () => {
    clearVideoLock()
    navigate('/booking', {
      state: {
        preferredVisitType: 'In-Person',
        visitType: 'In-Person',
        videoLock: false,
        origin: 'video',
        doctor,
      },
    })
  }

  const title = step === 'join'
    ? 'Consultation'
    : step === 'readiness'
      ? 'Video check'
      : step === 'slots' || step === 'review'
        ? 'Choose a time'
        : step === 'booked'
          ? 'Booked'
          : 'Video consultation'

  return (
    <div className="video-consult">
      <header className="video-consult-header">
        <BackButton
          onClick={() => {
            if (step === 'review') setStep('slots')
            else if (step === 'slots' && !joinAppointmentId) setStep('list')
            else if (step === 'join') {
              markEnded(sessionRef.current).catch(() => {})
              navigate('/')
            } else navigate(-1)
          }}
        />
        <h1>{title}</h1>
      </header>
      <div className="video-consult-body">
        {step === 'list' ? (
          <>
            <p className="video-consult-lead">Doctors with an open video time.</p>
            {loadingList ? <p className="video-status" role="status">Finding doctors…</p> : null}
            {!loadingList && !rows.length ? (
              <p className="video-status" role="status">No video times are open right now.</p>
            ) : null}
            <ul className="video-doctor-list">
              {rows.map((row) => (
                <li key={row.doctor.providerUuid || row.doctor.id}>
                  <button type="button" className="video-doctor" onClick={() => chooseDoctor(row)}>
                    <strong>{row.doctor.name}</strong>
                    <span>{row.doctor.specialty}</span>
                    <span>{row.slots.length === 1 ? '1 open time' : `${row.slots.length} open times`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {step === 'readiness' ? (
          <section aria-label="Video readiness check">
            <div className="video-stage">
              <video ref={videoRef} autoPlay muted playsInline aria-label="Your camera preview" />
              <div className="video-stage-caption">
                <p>{outcome ? outcomeLabel(outcome) : 'Checking your connection'}</p>
                {!outcome ? (
                  <div
                    className="video-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuetext="Checking your connection"
                  >
                    <span style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                ) : null}
              </div>
            </div>
            {outcome ? <p className="video-outcome" role="status">{outcomeLabel(outcome)}</p> : null}
            {outcome === 'usable' ? (
              <p className="video-note">You can continue. The picture may be less steady.</p>
            ) : null}
            {outcome === 'poor' ? (
              <p className="video-note">{error || 'A video consultation may not be reliable right now.'}</p>
            ) : null}
            {outcome === 'usable' ? (
              <div className="video-actions">
                <button type="button" className="video-primary" onClick={() => setStep('slots')}>Continue</button>
              </div>
            ) : null}
            {outcome === 'poor' ? (
              <div className="video-actions">
                <button type="button" className="video-primary" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
                <button type="button" className="video-secondary" onClick={leaveForInPerson}>Book an in-person visit</button>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 'slots' ? (
          <>
            <p className="video-consult-lead">{doctor?.name ? doctor.name : 'Choose a time'}</p>
            {!grouped.length ? <p className="video-status" role="status">No open video times for this doctor.</p> : null}
            {grouped.map(([date, times]) => (
              <div key={date}>
                <p className="video-note">{formatDay(date)}</p>
                <ul className="video-slot-list">
                  {times.map((slot) => {
                    const active = selected?.date === slot.date && selected?.time === slot.time
                    return (
                      <li key={`${slot.date}-${slot.time}`}>
                        <button
                          type="button"
                          className={`video-slot${active ? ' is-selected' : ''}`}
                          aria-pressed={active}
                          onClick={() => setSelected(slot)}
                        >
                          <strong>{slot.time}</strong>
                          <span>Video consultation</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            <button type="button" className="video-primary" disabled={!selected} onClick={() => setStep('review')}>
              Continue
            </button>
          </>
        ) : null}

        {step === 'review' ? (
          <>
            <div className="video-summary">
              <p><strong>{doctor?.name}</strong></p>
              <p>{formatDay(selected?.date)} · {selected?.time}</p>
              <p>Video consultation</p>
            </div>
            {error ? <p className="video-note" role="alert">{error}</p> : null}
            <button type="button" className="video-primary" disabled={busy} onClick={confirm}>
              {busy ? 'Reserving…' : 'Confirm time'}
            </button>
          </>
        ) : null}

        {step === 'booked' ? (
          <>
            <p className="video-outcome" role="status">Your consultation is reserved.</p>
            <div className="video-summary">
              <p><strong>{booking?.doctor?.name || doctor?.name}</strong></p>
              <p>{booking?.time || selected?.time}</p>
            </div>
            {error ? <p className="video-note" role="alert">{error}</p> : null}
            <button
              type="button"
              className="video-primary"
              onClick={() => {
                const id = booking?.engineId || booking?.id || joinAppointmentId
                if (transportRef.current?.url) {
                  window.open(transportRef.current.url, '_blank', 'noopener,noreferrer')
                }
                navigate(`/video/join/${id}`, { state: videoEntryState({ doctor, origin: 'video' }) })
                setStep('join')
              }}
            >
              Join Consultation
            </button>
          </>
        ) : null}

        {step === 'join' ? (
          <section aria-label="Consultation">
            <div className="video-stage">
              <video ref={videoRef} autoPlay muted playsInline aria-label="Your camera preview" />
              <video ref={remoteRef} autoPlay playsInline className="video-remote" aria-label="Clinician video" />
              <div className="video-stage-caption">
                <p>Waiting for your clinician</p>
              </div>
            </div>
            {error ? <p className="video-note" role="alert">{error}</p> : null}
            <button
              type="button"
              className="video-secondary"
              onClick={() => {
                const saved = getBooking?.(joinAppointmentId)
                if (saved) setBooking(saved)
                markEnded(sessionRef.current).catch(() => {})
                navigate('/')
              }}
            >
              Leave
            </button>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function outcomeLabel(outcome) {
  if (outcome === 'ready') return 'Ready'
  if (outcome === 'usable') return 'Usable'
  if (outcome === 'poor') return 'Poor'
  return ''
}
