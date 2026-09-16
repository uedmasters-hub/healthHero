import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { flowState, goBackToOrigin, getBookingEntryPath, isHomePath, restoreOriginOverlays } from '../lib/careFlow'
import { useTransition } from './PageTransition'
import './BookingFlow.css'

const steps = [
  { key: 'select-provider', label: 'Select Provider' },
  { key: 'select-slot', label: 'Select Slot' },
  { key: 'select-patient', label: 'Select Patient' },
  { key: 'confirm', label: 'Confirm' },
]

const stepTitles = [
  'Find Doctor',
  'Choose Date & Time',
  'Select Patient',
  'Review Booking',
]

export default function BookingFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openSpecialisations } = useTransition()
  const [currentStep, setCurrentStep] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)

  const titles = stepTitles
  const onConfirm = location.pathname.includes('/confirm')
  const onPatient = location.pathname.includes('/patient')
  const onSlot = location.pathname.includes('/slot')

  useEffect(() => {
    if (onConfirm) setCurrentStep(3)
    else if (onPatient) setCurrentStep(2)
    else if (onSlot) setCurrentStep(1)
    else setCurrentStep(0)
  }, [onSlot, onPatient, onConfirm])

  useEffect(() => {
    if (!onPatient) setAddingPatient(false)
  }, [onPatient])

  const leaveFindDoctor = () => {
    const state = location.state || {}
    const target = getBookingEntryPath(state)
    if (isHomePath(target)) restoreOriginOverlays(state, { openSpecialisations })
    if (target && target !== location.pathname) {
      navigate(target, { state: isHomePath(target) ? undefined : flowState(state) })
      return
    }
    navigate('/')
  }

  const goBack = () => {
    // Confirmation has no back — never return to Review Booking from success.
    if (showSuccess) return

    const state = location.state || {}

    if (onConfirm) {
      navigate('/booking/patient', { state: flowState(state, { fromConfirm: undefined }) })
      return
    }

    if (onPatient) {
      if (addingPatient) {
        setAddingPatient(false)
        return
      }
      navigate('/booking/slot', { state: flowState(state, { fromConfirm: undefined }) })
      return
    }

    if (onSlot) {
      if (state.fromProfile) {
        navigate(state.returnTo || `/doctor/${state.doctor?.id}`, { state: flowState(state) })
        return
      }
      navigate('/booking', { state: flowState(state, { returnTo: '/booking' }) })
      return
    }

    leaveFindDoctor()
  }

  return (
    <div className={`booking-layout ${showSuccess ? 'is-success' : ''} page-push-in`}>
      {!showSuccess && (
        <>
          <div className="booking-header">
            <button className="back-btn" onClick={goBack} aria-label="Back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h1 className="booking-header-title">{titles[currentStep]}</h1>
            <div className="booking-header-spacer" />
          </div>
          <div className="stepper">
            {steps.map((step, idx) => (
              <div
                key={step.key}
                className={`stepper-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
        </>
      )}
      <div className="booking-content">
        <Outlet context={{ currentStep, setCurrentStep, showSuccess, setShowSuccess, addingPatient, setAddingPatient }} />
      </div>
    </div>
  )
}
