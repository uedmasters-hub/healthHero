import { createContext, useContext, useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

const TransitionContext = createContext()
const SHEET_CLOSE_MS = 250

export function useTransition() {
  return useContext(TransitionContext)
}

export function SheetPortal({ children, to = 'app' }) {
  const [target, setTarget] = useState(null)

  useLayoutEffect(() => {
    const selector = to === 'screen' ? '#phone-screen' : '.phone-app'
    setTarget(document.querySelector(selector))
  }, [to])

  if (!target) return null
  return createPortal(children, target)
}

export function useAppSheet() {
  const { openSheet, closeSheet } = useTransition()
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const registeredRef = useRef(false)
  const timerRef = useRef(null)

  const show = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    closingRef.current = false
    setClosing(false)
    setVisible(true)
    if (!registeredRef.current) {
      registeredRef.current = true
      openSheet()
    }
  }, [openSheet])

  const hide = useCallback((after) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    if (registeredRef.current) {
      registeredRef.current = false
      closeSheet(SHEET_CLOSE_MS)
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      closingRef.current = false
      setVisible(false)
      setClosing(false)
      after?.()
    }, SHEET_CLOSE_MS)
  }, [closeSheet])

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (registeredRef.current) {
      registeredRef.current = false
      closeSheet(0)
    }
  }, [closeSheet])

  return { isPresented: visible, isClosing: closing, show, hide }
}

export function TransitionProvider({ children }) {
  const [isSpecialisationsOpen, setIsSpecialisationsOpen] = useState(false)
  const [isSpecialisationsSlidingOut, setIsSpecialisationsSlidingOut] = useState(false)
  const [isSpecialisationsParked, setIsSpecialisationsParked] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const [isServicesSlidingOut, setIsServicesSlidingOut] = useState(false)
  const [isInsightsOpen, setIsInsightsOpen] = useState(false)
  const [isInsightsSlidingOut, setIsInsightsSlidingOut] = useState(false)
  const [isTopDoctorsOpen, setIsTopDoctorsOpen] = useState(false)
  const [isTopDoctorsSlidingOut, setIsTopDoctorsSlidingOut] = useState(false)
  const [isTopDoctorsParked, setIsTopDoctorsParked] = useState(false)
  const [topDoctorsParkMode, setTopDoctorsParkMode] = useState('slide')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const sheetCountRef = useRef(0)
  const topDoctorsParkTimer = useRef(null)
  const specialisationsParkTimer = useRef(null)

  const openSpecialisations = useCallback(() => {
    if (specialisationsParkTimer.current) {
      clearTimeout(specialisationsParkTimer.current)
      specialisationsParkTimer.current = null
    }
    setIsSpecialisationsParked(false)
    setIsSpecialisationsSlidingOut(false)
    setIsSpecialisationsOpen(true)
  }, [])

  const closeSpecialisations = useCallback(() => {
    if (specialisationsParkTimer.current) {
      clearTimeout(specialisationsParkTimer.current)
      specialisationsParkTimer.current = null
    }
    setIsSpecialisationsParked(false)
    setIsSpecialisationsSlidingOut(true)
    setTimeout(() => {
      setIsSpecialisationsOpen(false)
      setIsSpecialisationsSlidingOut(false)
    }, 350)
  }, [])

  const parkSpecialisations = useCallback(() => {
    if (specialisationsParkTimer.current) clearTimeout(specialisationsParkTimer.current)
    setIsSpecialisationsParked(true)
    setIsSpecialisationsSlidingOut(true)
    specialisationsParkTimer.current = setTimeout(() => {
      setIsSpecialisationsSlidingOut(false)
      specialisationsParkTimer.current = null
    }, 350)
  }, [])

  const dismissSpecialisations = parkSpecialisations

  const openServices = useCallback(() => {
    setIsServicesSlidingOut(false)
    setIsServicesOpen(true)
  }, [])

  const closeServices = useCallback(() => {
    setIsServicesSlidingOut(true)
    setTimeout(() => {
      setIsServicesOpen(false)
      setIsServicesSlidingOut(false)
    }, 250)
  }, [])

  const openInsights = useCallback(() => {
    setIsInsightsSlidingOut(false)
    setIsInsightsOpen(true)
  }, [])

  const closeInsights = useCallback(() => {
    setIsInsightsSlidingOut(true)
    setTimeout(() => {
      setIsInsightsOpen(false)
      setIsInsightsSlidingOut(false)
    }, 250)
  }, [])

  const openTopDoctors = useCallback(() => {
    if (topDoctorsParkTimer.current) {
      clearTimeout(topDoctorsParkTimer.current)
      topDoctorsParkTimer.current = null
    }
    setIsTopDoctorsParked(false)
    setTopDoctorsParkMode('slide')
    setIsTopDoctorsSlidingOut(false)
    setIsTopDoctorsOpen(true)
  }, [])

  const closeTopDoctors = useCallback(() => {
    if (topDoctorsParkTimer.current) {
      clearTimeout(topDoctorsParkTimer.current)
      topDoctorsParkTimer.current = null
    }
    setIsTopDoctorsParked(false)
    setTopDoctorsParkMode('slide')
    setIsTopDoctorsSlidingOut(true)
    setTimeout(() => {
      setIsTopDoctorsOpen(false)
      setIsTopDoctorsSlidingOut(false)
    }, 360)
  }, [])

  const parkTopDoctors = useCallback((opts = {}) => {
    const ghost = opts?.ghost === true
    if (topDoctorsParkTimer.current) {
      clearTimeout(topDoctorsParkTimer.current)
      topDoctorsParkTimer.current = null
    }
    setTopDoctorsParkMode(ghost ? 'ghost' : 'slide')
    setIsTopDoctorsParked(true)
    if (ghost) {
      setIsTopDoctorsSlidingOut(false)
      return
    }
    setIsTopDoctorsSlidingOut(true)
    topDoctorsParkTimer.current = setTimeout(() => {
      setIsTopDoctorsSlidingOut(false)
      topDoctorsParkTimer.current = null
    }, 350)
  }, [])

  const revealParkedTopDoctors = useCallback(() => {
    if (topDoctorsParkTimer.current) {
      clearTimeout(topDoctorsParkTimer.current)
      topDoctorsParkTimer.current = null
    }
    setIsTopDoctorsParked(false)
    setIsTopDoctorsSlidingOut(false)
    setIsTopDoctorsOpen(true)
    setTopDoctorsParkMode('slide')
  }, [])

  const dismissTopDoctors = parkTopDoctors

  const openSheet = useCallback(() => {
    sheetCountRef.current += 1
    setIsSheetOpen(true)
  }, [])

  const closeSheet = useCallback((delay = SHEET_CLOSE_MS) => {
    void delay
    sheetCountRef.current = Math.max(0, sheetCountRef.current - 1)
    if (sheetCountRef.current === 0) setIsSheetOpen(false)
  }, [])

  const isAnyOverlayActive = (
    (isSpecialisationsOpen && !isSpecialisationsParked && !isSpecialisationsSlidingOut) ||
    (isServicesOpen && !isServicesSlidingOut) ||
    (isInsightsOpen && !isInsightsSlidingOut) ||
    (isTopDoctorsOpen && !isTopDoctorsParked && !isTopDoctorsSlidingOut) ||
    isSheetOpen
  )

  return (
    <TransitionContext.Provider value={{
      isSpecialisationsOpen,
      isSpecialisationsSlidingOut,
      isSpecialisationsParked,
      isServicesOpen,
      isServicesSlidingOut,
      isInsightsOpen,
      isInsightsSlidingOut,
      isTopDoctorsOpen,
      isTopDoctorsSlidingOut,
      isTopDoctorsParked,
      topDoctorsParkMode,
      openSpecialisations,
      closeSpecialisations,
      dismissSpecialisations,
      parkSpecialisations,
      openServices,
      closeServices,
      openInsights,
      closeInsights,
      openTopDoctors,
      closeTopDoctors,
      dismissTopDoctors,
      parkTopDoctors,
      revealParkedTopDoctors,
      openSheet,
      closeSheet,
      isAnyOverlayActive
    }}>
      {children}
    </TransitionContext.Provider>
  )
}
