import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import DoctorCard from './DoctorCard'
import StickyFooterCta from './StickyFooterCta'
import { useSharedHero } from './SharedHero'
import { getDoctorById } from '../data/doctors'
import {
  PREP_STEPS,
  getPrepStepIndex,
  isPreparationComplete,
  markPreparationComplete,
  withPreparationProgress,
} from '../lib/appointmentJourney'
import { buildAppointmentPreview } from '../lib/appointmentPreview'
import './PrepareVisit.css'

const STEP_REVEAL_MS = 900

function stepState(index, activeIndex) {
  if (index < activeIndex) return 'completed'
  if (index === activeIndex) return 'current'
  return 'pending'
}

export default function PrepareVisit() {
  const navigate = useNavigate()
  const { currentBooking, setCurrentBooking } = useBooking()
  const shared = useSharedHero()
  const heroRef = useRef(null)
  const timersRef = useRef([])
  const startedForRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLeaving, setIsLeaving] = useState(false)

  const sharedFlow = Boolean(
    currentBooking
    && shared?.active
    && String(shared.doctor?.id) === String(currentBooking.doctor?.id),
  )

  useEffect(() => {
    if (!currentBooking) {
      navigate('/', { replace: true })
      return
    }
    if (isPreparationComplete(currentBooking) && !sharedFlow) {
      navigate('/appointment', { replace: true })
    }
  }, [currentBooking, navigate, sharedFlow])

  useEffect(() => {
    if (!currentBooking || isPreparationComplete(currentBooking) || isLeaving) return undefined

    const bookingKey = String(currentBooking.doctor?.id || 'booking')
    if (startedForRef.current === bookingKey) return undefined
    startedForRef.current = bookingKey

    const savedIndex = getPrepStepIndex(currentBooking)
    const startAt = Math.min(savedIndex, PREP_STEPS.length - 1)
    setActiveIndex(startAt)

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    let step = startAt
    const advance = () => {
      if (step >= PREP_STEPS.length - 1) {
        setCurrentBooking((prev) => withPreparationProgress(prev, {
          prepStepIndex: PREP_STEPS.length - 1,
        }))
        return
      }
      step += 1
      setActiveIndex(step)
      setCurrentBooking((prev) => withPreparationProgress(prev, { prepStepIndex: step }))
      if (step < PREP_STEPS.length - 1) {
        const id = window.setTimeout(advance, STEP_REVEAL_MS)
        timersRef.current.push(id)
      }
    }

    if (startAt < PREP_STEPS.length - 1) {
      const id = window.setTimeout(advance, STEP_REVEAL_MS)
      timersRef.current.push(id)
    }

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      startedForRef.current = null
    }
  }, [currentBooking?.doctor?.id, setCurrentBooking, isLeaving])

  if (!currentBooking) return null
  if (isPreparationComplete(currentBooking) && !sharedFlow && !isLeaving) return null

  const doctor = currentBooking.doctor
  const fullDoctor = doctor?.id != null ? getDoctorById(doctor.id) : null
  const morphDoctor = { ...fullDoctor, ...doctor }

  const finishPreparation = (nextPath, { withSharedHero = false } = {}) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    const go = () => {
      setCurrentBooking((prev) => markPreparationComplete(prev))
      navigate(nextPath, { replace: true })
    }

    if (withSharedHero && shared?.startOpen && heroRef.current && morphDoctor?.id) {
      setIsLeaving(true)
      shared.startOpen({
        doctor: morphDoctor,
        sourceEl: heroRef.current,
        runNavigate: go,
        targetLayout: 'appointment',
        sourceLayout: 'appointment',
        appointmentPreview: buildAppointmentPreview(currentBooking),
      })
      return
    }

    shared?.reset?.()
    go()
  }

  const dateValue = currentBooking.date?.full instanceof Date
    ? currentBooking.date.full
    : new Date(currentBooking.date?.full || currentBooking.date)
  const dateStr = Number.isNaN(dateValue.getTime())
    ? ''
    : dateValue.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })

  return (
    <div className={`prepare-page${isLeaving || sharedFlow ? ' is-leaving' : ''}`}>
      <div className="prepare-header-bar">
        <h1 className="prepare-header-title">Prepare for My Visit</h1>
      </div>

      <div className="prepare-body">
        <div
          className={`prepare-hero-card ds-card${isLeaving || sharedFlow ? ' is-morphing' : ''}`}
          ref={heroRef}
        >
          <DoctorCard
            doctor={morphDoctor}
            context="identity"
            className="prepare-doctor-row"
            origin="appointment"
            disableNavigate
          />
          <div className="prepare-hero-meta" aria-hidden="true">
            <span>{dateStr}</span>
            <span className="prepare-hero-dot" />
            <span>{currentBooking.time}</span>
            <span className="prepare-hero-dot" />
            <span>{currentBooking.visitType || 'In-Person'} Visit</span>
          </div>
        </div>

        <div className="prepare-timeline" aria-label="Preparation timeline">
          {PREP_STEPS.map((step, index) => {
            const state = stepState(index, activeIndex)
            return (
              <div
                key={step.id}
                className={`prepare-step ${state}`}
                data-step={index}
              >
                <div className="prepare-step-left">
                  <div className="prepare-step-icon">
                    {state === 'completed' ? (
                      <svg className="prepare-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="prepare-step-num">{index + 1}</span>
                    )}
                  </div>
                  {index < PREP_STEPS.length - 1 ? (
                    <div className="prepare-step-line" aria-hidden="true">
                      <span className="prepare-step-line-fill" />
                    </div>
                  ) : null}
                </div>
                <div className="prepare-step-content">
                  <div className="prepare-step-label">{step.title}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <StickyFooterCta
        primaryLabel="View Appointment Details"
        onPrimary={() => finishPreparation('/appointment', { withSharedHero: true })}
        secondaryLabel="Back to Home"
        onSecondary={() => finishPreparation('/')}
        pending={isLeaving || sharedFlow}
      />
    </div>
  )
}
