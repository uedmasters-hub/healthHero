import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { displayDoctorName, relativeRect } from '../lib/geometry'
import { freezeNow } from '../lib/scrollLock'
import { SheetPortal } from './PageTransition'
import { formatMoney } from '../lib/paymentSession'
import { resolveProviderPhoto } from '../lib/providerPhoto'
import './SharedHero.css'

const SharedHeroContext = createContext(null)

export const HERO_MS = 520
export const CLOSE_HERO_MS = 720
export const SKELETON_MS = 420
export const BODY_MS = 70
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const CLOSE_EASE = 'cubic-bezier(0.32, 0.72, 0.18, 1)'

export function useSharedHero() {
  return useContext(SharedHeroContext)
}

function isUsableRect(rect) {
  return Boolean(rect && rect.width >= 24 && rect.height >= 24)
}

function MorphCard({ doctor, layout, appointmentPreview }) {
  const photo = resolveProviderPhoto(doctor) || '/img/doctors/new/doctor.png'
  const name = displayDoctorName(doctor?.name)
  const specialty = doctor?.specialty || 'Specialist'
  const experience = doctor?.experience || ''
  const rating = doctor?.rating ?? 4.8
  const cardLayout = layout === 'mini' ? 'grid is-mini' : layout

  if (layout === 'appointment') {
    const cells = appointmentPreview?.cells?.length
      ? appointmentPreview.cells
      : [
          appointmentPreview?.date && { label: 'Date', value: appointmentPreview.date },
          appointmentPreview?.time && { label: 'Time', value: appointmentPreview.time },
          { label: 'Type', value: `${appointmentPreview?.visitType || 'In-Person'} Visit` },
          appointmentPreview?.location && { label: 'Location', value: appointmentPreview.location },
        ].filter(Boolean)

    const grid = (cells.length ? cells : [
      { label: 'Date', value: '—' },
      { label: 'Time', value: '—' },
      { label: 'Type', value: 'In-Person Visit' },
      { label: 'Location', value: '—' },
    ]).slice(0, 4)

    return (
      <div className="shared-hero-card is-appointment">
        <div className="shared-hero-appointment-identity">
          <div className="shared-hero-photo">
            <img src={photo} alt="" />
          </div>
          <div className="shared-hero-appointment-copy">
            <h3 className="shared-hero-name">{name}</h3>
            <p className="shared-hero-meta">
              <span className="shared-hero-specialty">{specialty}</span>
            </p>
          </div>
          <span className="shared-hero-rating">
            <span aria-hidden="true">★</span>
            {rating}
          </span>
        </div>
        <div className="shared-hero-appointment-body">
          {grid.map((cell) => (
            <div key={`${cell.label}-${cell.value}`} className="shared-hero-appointment-cell">
              <span className="shared-hero-appointment-label">{cell.label}</span>
              <span className="shared-hero-appointment-value">{cell.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`shared-hero-card is-${cardLayout}`}>
      <div className="shared-hero-photo">
        <img src={photo} alt="" />
      </div>
      <h3 className="shared-hero-name">{name}</h3>
      <p className="shared-hero-meta">
        <span className="shared-hero-specialty">{specialty}</span>
        <span className="shared-hero-rating">
          <span aria-hidden="true">★</span>
          {rating}
        </span>
      </p>
      {experience ? <span className="shared-hero-exp">{experience}</span> : null}
      {layout === 'hero' && doctor?.fee != null ? (
        <p className="shared-hero-fee">
          <strong>{formatMoney(doctor.fee)}*</strong> Consultation fee
        </p>
      ) : null}
    </div>
  )
}

function SharedHeroLayer({ session, pathname }) {
  const { doctor, sourceRect, destRect, openFromRect, layout, animate, phase, appointmentPreview } = session
  // Portal lives outside PushStack — never paint on non-hero routes (browser back / deep links).
  if (!isSharedHeroSurface(pathname)) return null
  if (!doctor || !sourceRect || phase === 'idle') return null
  // Destination page owns the card once settled; keep the portal empty to avoid ghosts on pop.
  if (phase === 'settled' || phase === 'hero-settled' || phase === 'closing-settle') return null

  const fromRect = String(phase).startsWith('closing') ? sourceRect : (openFromRect || sourceRect)
  const box = (layout === 'hero' || layout === 'appointment') && destRect ? destRect : fromRect
  const closing = String(phase).startsWith('closing')
  const duration = closing ? CLOSE_HERO_MS : HERO_MS
  const ease = closing ? CLOSE_EASE : EASE

  return (
    <SheetPortal>
      <div className="shared-hero-layer is-on" aria-hidden="true">
        <div
          className={`shared-hero-shell ${animate ? 'is-animating' : ''}`}
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            transition: animate
              ? `left ${duration}ms ${ease}, top ${duration}ms ${ease}, width ${duration}ms ${ease}, height ${duration}ms ${ease}`
              : 'none',
          }}
        >
          <MorphCard doctor={doctor} layout={layout} appointmentPreview={appointmentPreview} />
        </div>
      </div>
    </SheetPortal>
  )
}

const IDLE = {
  phase: 'idle',
  doctor: null,
  sourceRect: null,
  destRect: null,
  openFromRect: null,
  layout: 'grid',
  targetLayout: 'hero',
  animate: false,
  restore: null,
  sourceDoctorId: null,
  closeLayout: 'grid',
  appointmentPreview: null,
}

function isSharedHeroSurface(pathname) {
  return (
    pathname.startsWith('/doctor/')
    || pathname === '/appointment'
    || pathname === '/prepare-visit'
    || pathname === '/pre-checkin'
    || pathname.startsWith('/booking')
  )
}

function homeAnchorRect() {
  const host = document.querySelector('[data-top-doctor-anchor]')
  const card = host?.querySelector('.dc-card') || host
  const rect = relativeRect(card)
  return isUsableRect(rect) ? rect : null
}

export function SharedHeroProvider({ children }) {
  const location = useLocation()
  const destElRef = useRef(null)
  const destLocked = useRef(false)
  const [session, setSession] = useState(IDLE)
  const closeDoneRef = useRef(null)
  const timersRef = useRef([])
  const sessionRef = useRef(session)
  sessionRef.current = session

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const hardReset = useCallback(() => {
    clearTimers()
    destLocked.current = false
    destElRef.current = null
    closeDoneRef.current = null
    setSession(IDLE)
  }, [])

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }

  useEffect(() => () => clearTimers(), [])

  // Browser back / deep-link / tab switch must never leave a portaled morph card over Home.
  // Clear even mid-close — PushStack owns the exit animation; the portal must die immediately.
  useEffect(() => {
    if (isSharedHeroSurface(location.pathname)) return
    if (sessionRef.current.phase === 'idle') return
    hardReset()
  }, [location.pathname, hardReset])

  useEffect(() => {
    const onPushPopHome = () => {
      if (sessionRef.current.phase === 'idle') return
      hardReset()
    }
    window.addEventListener('emedicalls:push-pop-home', onPushPopHome)
    return () => window.removeEventListener('emedicalls:push-pop-home', onPushPopHome)
  }, [hardReset])

  const startOpen = useCallback(({
    doctor,
    sourceEl,
    runNavigate,
    restore,
    swap,
    hideBook = true,
    targetLayout = 'hero',
    sourceLayout,
    appointmentPreview = null,
  }) => {
    freezeNow('home')
    const sourceRect = relativeRect(sourceEl)
    if (!doctor || !isUsableRect(sourceRect)) {
      runNavigate?.()
      return
    }
    clearTimers()
    destLocked.current = false
    destElRef.current = null
    const openingLayout = sourceLayout || targetLayout || (hideBook ? 'mini' : 'grid')
    setSession((prev) => {
      const keepClose = Boolean(swap && prev.sourceRect)
      return {
        phase: 'preparing',
        doctor,
        sourceRect: keepClose ? prev.sourceRect : sourceRect,
        destRect: null,
        openFromRect: sourceRect,
        layout: openingLayout,
        targetLayout: targetLayout || 'hero',
        animate: false,
        restore: keepClose ? prev.restore : (restore || null),
        sourceDoctorId: keepClose ? prev.sourceDoctorId : doctor.id,
        closeLayout: keepClose ? prev.closeLayout : (hideBook ? 'mini' : 'grid'),
        appointmentPreview: appointmentPreview || prev.appointmentPreview || null,
      }
    })
    runNavigate?.()
  }, [])

  const finishOpen = useCallback((destRect) => {
    destLocked.current = true
    const skipSkeletonWait = sessionRef.current?.targetLayout === 'appointment'
    setSession((prev) => {
      if (prev.phase !== 'preparing' && prev.phase !== 'opening') return prev
      return { ...prev, destRect, phase: 'opening', animate: false }
    })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSession((prev) => {
          if (prev.phase !== 'opening' && prev.phase !== 'preparing') return prev
          return {
            ...prev,
            destRect,
            layout: prev.targetLayout || 'hero',
            animate: true,
            phase: 'opening',
          }
        })
        later(() => {
          setSession((prev) => (prev.phase === 'opening' ? { ...prev, phase: 'hero-settled', animate: false } : prev))
          // Appointment payload is already on-screen in the morph card — settle immediately.
          later(() => {
            setSession((prev) => (prev.phase === 'hero-settled' ? { ...prev, phase: 'settled' } : prev))
          }, skipSkeletonWait ? 0 : SKELETON_MS)
        }, HERO_MS)
      })
    })
  }, [])

  const registerDest = useCallback((el) => {
    if (!el || destLocked.current) return
    destElRef.current = el
    const measure = (attempt = 0) => {
      if (destLocked.current) return
      if (destElRef.current !== el) return
      const destRect = relativeRect(el)
      if (!isUsableRect(destRect)) {
        if (attempt < 16) requestAnimationFrame(() => measure(attempt + 1))
        return
      }
      finishOpen(destRect)
    }
    measure()
  }, [finishOpen])

  const startClose = useCallback((onDone) => {
    closeDoneRef.current = onDone
    clearTimers()
    const current = sessionRef.current
    if (current.phase === 'idle' || !current.sourceRect) {
      onDone?.()
      return
    }
    const destRect = relativeRect(destElRef.current) || current.destRect
    const homeRect = homeAnchorRect()
    setSession((prev) => ({
      ...prev,
      destRect: isUsableRect(destRect) ? destRect : prev.destRect,
      sourceRect: homeRect || prev.sourceRect,
      closeLayout: homeRect ? 'mini' : prev.closeLayout,
      phase: 'closing-body',
      animate: false,
      layout: 'hero',
    }))
    later(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const nextHome = homeAnchorRect()
          setSession((prev) => ({
            ...prev,
            sourceRect: nextHome || prev.sourceRect,
            closeLayout: nextHome ? 'mini' : prev.closeLayout,
            phase: 'closing-hero',
            layout: nextHome ? 'mini' : (prev.closeLayout || 'grid'),
            animate: true,
          }))
          later(() => {
            setSession((prev) => (
              prev.phase === 'closing-hero'
                ? { ...prev, phase: 'closing-settle', animate: false }
                : prev
            ))
            later(() => {
              const done = closeDoneRef.current
              closeDoneRef.current = null
              destLocked.current = false
              destElRef.current = null
              setSession(IDLE)
              done?.()
            }, 180)
          }, CLOSE_HERO_MS)
        })
      })
    }, BODY_MS)
  }, [])

  const value = {
    ...session,
    active: session.phase !== 'idle',
    morphing: session.phase === 'preparing' || session.phase === 'opening' || session.phase === 'closing-hero' || session.phase === 'closing-body' || session.phase === 'closing-settle',
    showSkeletons: session.phase === 'preparing' || session.phase === 'opening' || session.phase === 'hero-settled' || String(session.phase).startsWith('closing'),
    startOpen,
    registerDest,
    startClose,
    reset: hardReset,
  }

  return (
    <SharedHeroContext.Provider value={value}>
      {children}
      <SharedHeroLayer session={session} pathname={location.pathname} />
    </SharedHeroContext.Provider>
  )
}
