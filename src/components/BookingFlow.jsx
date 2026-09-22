import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getBookingEntryPath, isHomePath, restoreOriginOverlays } from '../lib/careFlow'
import { usePushBack } from '../features/pushNav'
import { useTransition } from './PageTransition'
import './BookingFlow.css'

const BookingFlowContext = createContext(null)

export function useBookingFlow() {
  return useContext(BookingFlowContext)
}

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

function stepFromPath(pathname = '') {
  if (pathname.includes('/confirm')) return 3
  if (pathname.includes('/patient')) return 2
  if (pathname.includes('/slot')) return 1
  return 0
}

/**
 * Booking chrome for one stack layer. Step is captured at mount so underlays
 * keep their screen while the live route advances (native push/pop).
 */
export default function BookingFlow({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { openSpecialisations } = useTransition()
  const [currentStep, setCurrentStep] = useState(() => stepFromPath(location.pathname))
  const [showSuccess, setShowSuccess] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)

  const titles = stepTitles

  useEffect(() => {
    if (currentStep !== 2) setAddingPatient(false)
  }, [currentStep])

  const popStack = usePushBack(() => {
    if (currentStep === 0) {
      const state = location.state || {}
      const target = getBookingEntryPath(state)
      if (isHomePath(target)) restoreOriginOverlays(state, { openSpecialisations })
    }
    navigate(-1)
  })

  const goBack = () => {
    // Confirmation has no back — never return to Review Booking from success.
    if (showSuccess) return
    if (currentStep === 2 && addingPatient) {
      setAddingPatient(false)
      return
    }
    popStack()
  }

  const ctx = {
    currentStep,
    setCurrentStep,
    showSuccess,
    setShowSuccess,
    addingPatient,
    setAddingPatient,
  }

  return (
    <BookingFlowContext.Provider value={ctx}>
      <div className={`booking-layout ${showSuccess ? 'is-success' : ''} page-push-in`}>
        {!showSuccess && (
          <>
            <div className="booking-header">
              <button className="back-btn" type="button" data-push-back onClick={goBack} aria-label="Back">
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
          {children}
        </div>
      </div>
    </BookingFlowContext.Provider>
  )
}
