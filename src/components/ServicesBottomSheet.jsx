import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransition } from './PageTransition'
import { useFetchSession } from './FetchSession'
import { useDemoPreview } from './DemoPreviewModal'
import { runServiceAction } from '../lib/serviceActions'
import './Services.css'

const LineIcon = ({ d, children }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
    {children}
  </svg>
)

const icons = {
  generalPhysician: (
    <LineIcon>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </LineIcon>
  ),
  cardiology: (
    <LineIcon>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </LineIcon>
  ),
  neurology: (
    <LineIcon>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.966-.516" />
      <path d="M19.966 17.484A4 4 0 0 1 18 18" />
    </LineIcon>
  ),
  pediatrics: (
    <LineIcon>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="9" cy="7" r="0.5" fill="var(--primary)" />
      <circle cx="15" cy="7" r="0.5" fill="var(--primary)" />
      <path d="M10 12c.5.5 1.5 1 2 1s1.5-.5 2-1" />
    </LineIcon>
  ),
  gynecology: (
    <LineIcon>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5v8" />
      <path d="M8 13h8" />
    </LineIcon>
  ),
  orthopedics: (
    <LineIcon>
      <path d="M18.6 3.4c.4.4.4 1 0 1.4L8.4 15c-.4.4-1 .4-1.4 0l-2-2c-.4-.4-.4-1 0-1.4l9.8-9.8c.4-.4 1-.4 1.4 0l2.4 2.2Z" />
      <path d="M6 12l-1 1" />
      <path d="M3 21l1-1" />
      <path d="M14.5 5.5l3 3" />
      <path d="M18 2l4 4" />
    </LineIcon>
  ),
  bloodTest: (
    <LineIcon>
      <path d="M12 2C8 6 5 9.5 5 13a7 7 0 0 0 14 0c0-3.5-3-7-7-11Z" />
    </LineIcon>
  ),
  urineTest: (
    <LineIcon>
      <path d="M12 2v6" />
      <path d="M8 8l4 4 4-4" />
      <path d="M7 14h10" />
      <path d="M7 14c0 3.87 2.24 7 5 7s5-3.13 5-7" />
    </LineIcon>
  ),
  xRay: (
    <LineIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </LineIcon>
  ),
  ecg: (
    <LineIcon>
      <path d="M2 12h4l3-9 4 18 3-9h6" />
    </LineIcon>
  ),
  ultrasound: (
    <LineIcon>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M6 10l4-4 3 6 3-3 4 4" />
    </LineIcon>
  ),
  labPackages: (
    <LineIcon>
      <path d="M9 3h6v4H9z" />
      <path d="M7 7l-2 13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2L17 7" />
      <path d="M9 11v4" />
      <path d="M15 11v4" />
    </LineIcon>
  ),
  medicineDelivery: (
    <LineIcon>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 14v2" />
      <path d="M11 15h2" />
    </LineIcon>
  ),
  uploadPrescription: (
    <LineIcon>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 12v6" />
      <path d="M9 15l3-3 3 3" />
    </LineIcon>
  ),
  refillMedicines: (
    <LineIcon>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" />
      <path d="M9 12v.01" />
      <path d="M9 15v.01" />
      <path d="M9 18v.01" />
    </LineIcon>
  ),
  homeNursing: (
    <LineIcon>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </LineIcon>
  ),
  injectionService: (
    <LineIcon>
      <path d="M18 2l4 4" />
      <path d="M17.4 7.6L7.2 17.8c-.5.5-1.2.8-2 .8H3v-2.2c0-.8.3-1.5.8-2L14.2 4.4" />
      <path d="M9 15l6-6" />
      <path d="M3 21h6" />
    </LineIcon>
  ),
  physiotherapy: (
    <LineIcon>
      <circle cx="16" cy="4" r="2" />
      <path d="M4 22l4-8 4 2 4-6 4 2" />
      <path d="M4 22l3-6" />
      <path d="M10 16l-2-2" />
    </LineIcon>
  ),
  elderlyCare: (
    <LineIcon>
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v4" />
      <path d="M8 22l2-8 4 2 2-8" />
      <path d="M6 14h12" />
    </LineIcon>
  ),
  homeSampleCollection: (
    <LineIcon>
      <path d="M9 3h6v4H9z" />
      <path d="M7 7l-2 13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2L17 7" />
      <path d="M12 11v4" />
    </LineIcon>
  ),
  doctorHomeVisit: (
    <LineIcon>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
      <path d="M12 8v.01" />
    </LineIcon>
  ),
  emergencyCare: (
    <LineIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </LineIcon>
  ),
  healthCheckup: (
    <LineIcon>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </LineIcon>
  ),
  nutrition: (
    <LineIcon>
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z" />
      <path d="M12 8v4" />
      <path d="M10 10h4" />
    </LineIcon>
  ),
  mentalHealth: (
    <LineIcon>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.966-.516" />
      <path d="M19.966 17.484A4 4 0 0 1 18 18" />
    </LineIcon>
  ),
  fitness: (
    <LineIcon>
      <path d="M6.5 6.5h11" />
      <path d="M6.5 17.5h11" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4 8v8" />
      <path d="M20 8v8" />
      <path d="M6 8v8" />
      <path d="M18 8v8" />
    </LineIcon>
  ),
  wellnessPrograms: (
    <LineIcon>
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </LineIcon>
  ),
  eyeCare: (
    <LineIcon>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </LineIcon>
  ),
  ent: (
    <LineIcon>
      <path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
      <path d="M10 14v4a2 2 0 0 0 4 0v-4" />
      <path d="M8 21h8" />
    </LineIcon>
  ),
  dental: (
    <LineIcon>
      <path d="M12 2C8 2 5 5 5 9c0 3 1 5 2 7l1 4c.3 1 .7 2 1 2h6c.3 0 .7-1 1-2l1-4c1-2 2-4 2-7 0-4-3-7-7-7Z" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </LineIcon>
  ),
  dermatology: (
    <LineIcon>
      <path d="M12 2C8 2 5 5 5 9c0 3 1 5 2 7l1 4c.3 1 .7 2 1 2h6c.3 0 .7-1 1-2l1-4c1-2 2-4 2-7 0-4-3-7-7-7Z" />
      <path d="M8 12c1-1 2-1 4 0s3 1 4 0" />
    </LineIcon>
  ),
  pulmonology: (
    <LineIcon>
      <path d="M12 4v8" />
      <path d="M8 8c-2 0-4 1-4 4 0 2 1 3 2 4l2 2" />
      <path d="M16 8c2 0 4 1 4 4 0 2-1 3-2 4l-2 2" />
      <path d="M8 16c0 2 1 4 4 4s4-2 4-4" />
    </LineIcon>
  ),
  diabetesCare: (
    <LineIcon>
      <path d="M12 2C8 6 5 9.5 5 13a7 7 0 0 0 14 0c0-3.5-3-7-7-11Z" />
      <path d="M12 13V9" />
      <path d="M10 11h4" />
    </LineIcon>
  ),
}

const allServices = [
  {
    title: 'Doctor & Consultation',
    items: [
      { name: 'General Physician', icon: icons.generalPhysician },
      { name: 'Cardiology', icon: icons.cardiology },
      { name: 'Neurology', icon: icons.neurology },
      { name: 'Pediatrics', icon: icons.pediatrics },
      { name: 'Gynecology', icon: icons.gynecology },
      { name: 'Orthopedics', icon: icons.orthopedics },
    ]
  },
  {
    title: 'Diagnostics',
    items: [
      { name: 'Blood Test', icon: icons.bloodTest },
      { name: 'Urine Test', icon: icons.urineTest },
      { name: 'X-Ray', icon: icons.xRay },
      { name: 'ECG', icon: icons.ecg },
      { name: 'Ultrasound', icon: icons.ultrasound },
      { name: 'Pathology Labs', icon: icons.labPackages },
    ]
  },
  {
    title: 'Medicine & Pharmacy',
    items: [
      { name: 'Medicine Delivery', icon: icons.medicineDelivery },
      { name: 'Upload Prescription', icon: icons.uploadPrescription },
      { name: 'Refill Medicines', icon: icons.refillMedicines },
    ]
  },
  {
    title: 'Home Healthcare',
    items: [
      { name: 'Home Nursing', icon: icons.homeNursing },
      { name: 'Injection Service', icon: icons.injectionService },
      { name: 'Physiotherapy', icon: icons.physiotherapy },
      { name: 'Elderly Care', icon: icons.elderlyCare },
      { name: 'Home Sample Collection', icon: icons.homeSampleCollection },
      { name: 'Doctor Home Visit', icon: icons.doctorHomeVisit },
    ]
  },
  {
    title: 'Emergency & Wellness',
    items: [
      { name: 'Emergency Care', icon: icons.emergencyCare },
      { name: 'Health Checkup', icon: icons.healthCheckup },
      { name: 'Nutrition', icon: icons.nutrition },
      { name: 'Mental Health', icon: icons.mentalHealth },
      { name: 'Fitness', icon: icons.fitness },
      { name: 'Wellness Programs', icon: icons.wellnessPrograms },
    ]
  },
  {
    title: 'Specialty Services',
    items: [
      { name: 'Eye Care', icon: icons.eyeCare },
      { name: 'ENT', icon: icons.ent },
      { name: 'Dental', icon: icons.dental },
      { name: 'Dermatologist', icon: icons.dermatology },
      { name: 'Pulmonology', icon: icons.pulmonology },
      { name: 'Diabetes Care', icon: icons.diabetesCare },
    ]
  },
]

const FAST_STAGGER = 28
const INITIAL_DELAY = 320
const OFFSCREEN_DELAY = 600

const CACHE_KEY = 'overlay:services'

export default function ServicesBottomSheet() {
  const navigate = useNavigate()
  const { isServicesOpen, isServicesSlidingOut, closeServices } = useTransition()
  const { show: showDemoPreview } = useDemoPreview()
  const session = useFetchSession()
  const skipFetch = session.isLoaded(CACHE_KEY)
  const contentRef = useRef(null)
  const itemRefs = useRef([])
  const revealedRef = useRef(new Set())
  const [, forceUpdate] = useState(0)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const timersRef = useRef([])
  const initialDoneRef = useRef(false)

  const revealCard = useCallback((idx) => {
    if (revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
    forceUpdate(n => n + 1)
  }, [])

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true

    const next = () => {
      if (queueRef.current.length === 0) {
        processingRef.current = false
        return
      }
      const batch = queueRef.current.splice(0, 3)
      batch.forEach(revealCard)
      const t = setTimeout(next, FAST_STAGGER)
      timersRef.current.push(t)
    }
    next()
  }, [revealCard])

  const getVisibleIndices = useCallback(() => {
    const container = contentRef.current
    if (!container) return []
    const containerRect = container.getBoundingClientRect()
    const visible = []

    itemRefs.current.forEach((el, idx) => {
      if (skipFetch || !el || revealedRef.current.has(idx)) return
      const rect = el.getBoundingClientRect()
      const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top)
      if (visibleHeight > rect.height * 0.2) {
        visible.push(idx)
      }
    })
    return visible
  }, [skipFetch])

  const checkVisibilityInitial = useCallback(() => {
    const indices = getVisibleIndices()
    if (indices.length > 0) {
      indices.forEach(idx => queueRef.current.push(idx))
      processQueue()
    }

    const t = setTimeout(() => {
      initialDoneRef.current = true
    }, OFFSCREEN_DELAY)
    timersRef.current.push(t)
  }, [getVisibleIndices, processQueue])

  const checkVisibilityScroll = useCallback(() => {
    if (!initialDoneRef.current) return
    const indices = getVisibleIndices()
    if (indices.length > 0) {
      indices.forEach(idx => {
        if (!queueRef.current.includes(idx)) queueRef.current.push(idx)
      })
      processQueue()
    }
  }, [getVisibleIndices, processQueue])

  useEffect(() => {
    if (!isServicesOpen || isServicesSlidingOut) return undefined
    if (skipFetch) {
      initialDoneRef.current = true
      return undefined
    }
    initialDoneRef.current = false
    const t = setTimeout(checkVisibilityInitial, INITIAL_DELAY)
    const done = setTimeout(() => {
      session.markLoaded(CACHE_KEY)
      forceUpdate((n) => n + 1)
    }, INITIAL_DELAY + OFFSCREEN_DELAY)
    return () => {
      clearTimeout(t)
      clearTimeout(done)
    }
  }, [isServicesOpen, isServicesSlidingOut, checkVisibilityInitial, skipFetch, session])

  useEffect(() => {
    const container = contentRef.current
    if (!container || !isServicesOpen) return
    const onScroll = () => checkVisibilityScroll()
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [isServicesOpen, checkVisibilityScroll])

  useEffect(() => {
    if (isServicesOpen && !skipFetch) {
      revealedRef.current = new Set()
      queueRef.current = []
      processingRef.current = false
      initialDoneRef.current = false
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [isServicesOpen, skipFetch])

  const handleClose = () => {
    if (isServicesSlidingOut) return
    closeServices()
  }

  const handleService = (name) => {
    runServiceAction(name, {
      navigate,
      onCloseOverlays: closeServices,
      onPreview: showDemoPreview,
    })
  }

  if (!isServicesOpen && !isServicesSlidingOut) return null

  let flatIndex = 0

  return (
    <>
    <div className={`services-bottom-sheet-overlay ${isServicesSlidingOut ? 'closing' : ''}`} onClick={handleClose}>
      <div className="services-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="services-bottom-sheet-handle" />
        <div className="services-bottom-sheet-header">
          <h2 className="services-bottom-sheet-title">All Services</h2>
          <button className="services-bottom-sheet-close" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="services-bottom-sheet-content" ref={contentRef}>
          {allServices.map((section) => (
            <div key={section.title} className="services-bottom-sheet-section">
              <h3 className="services-bottom-sheet-section-title">{section.title}</h3>
              <div className="services-bottom-sheet-grid">
                {section.items.map((item) => {
                  const idx = flatIndex++
                  const isRevealed = skipFetch || revealedRef.current.has(idx)
                  return (
                    <button
                      type="button"
                      key={item.name}
                      className={`services-bottom-sheet-item ${isRevealed ? 'revealed' : ''}`}
                      ref={el => { itemRefs.current[idx] = el }}
                      onClick={() => handleService(item.name)}
                    >
                      <div className={`sheet-skeleton ${isRevealed ? 'hidden' : ''}`}>
                        <div className="sheet-skeleton-icon shimmer" />
                        <div className="sheet-skeleton-text shimmer" />
                        <div className="sheet-skeleton-text-sm shimmer" />
                      </div>
                      <div className={`sheet-content-layer ${isRevealed ? 'visible' : ''}`}>
                        <div className="services-bottom-sheet-item-icon">{item.icon}</div>
                        <span className="services-bottom-sheet-item-name">{item.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </div>
      </div>
    </div>
    </>
  )
}
