import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ONBOARD_ASSETS,
  ONBOARD_LOGO,
  ONBOARD_SLIDES,
  OnboardingActiveContext,
  OnboardingStatusContext,
  persistOnboardingCompleted,
  preloadOnboardAssets,
  resolveOnboardingCompleted,
} from '../lib/onboarding'
import { BRAND_NAME } from '../lib/brand'
import { useAuth } from '../features/auth/hooks/useAuth'
import './Onboarding.css'

const LAST = ONBOARD_SLIDES.length
const SWIPE_PX = 56
const SETTLE_MS = 800
const SPLASH_MS = 1320
const DIAL_STEP = 30
const DIAL_RADIUS = 160

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function dialPose(delta) {
  const angle = (delta * DIAL_STEP * Math.PI) / 180
  const abs = Math.abs(delta)
  return {
    x: Math.sin(angle) * DIAL_RADIUS,
    y: (1 - Math.cos(angle)) * 24,
    rot: delta * 14,
    scale: 0.92 + 0.08 * Math.max(0, 1 - abs),
    opacity: abs < 1.35 ? 1 : 0,
    z: Math.round((2 - abs) * 10),
  }
}

function ArtCard({ slide, delta, ready }) {
  const pose = dialPose(delta)
  const near = Math.abs(delta) < 1.65
  return (
    <div
      className="onboard-art"
      aria-hidden={!near}
      style={{
        transform: `translate3d(${pose.x}%, ${pose.y}%, 0) rotate(${pose.rot}deg) scale(${pose.scale})`,
        opacity: pose.opacity,
        zIndex: pose.z,
      }}
    >
      <div className="onboard-cloud" />
      {!ready && near ? <div className="onboard-skel shimmer" aria-hidden="true" /> : null}
      <img
        src={slide.image}
        alt=""
        draggable="false"
        className={ready ? 'is-ready' : ''}
      />
    </div>
  )
}

/**
 * Product onboarding runs only after Supabase auth is established.
 * Never clears the auth session. Completion is persisted to public.users
 * with a per-user local cache for fast startup.
 */
export function OnboardingProvider({ children }) {
  const { ready, isAuthenticated, user } = useAuth()
  const userId = user?.id || null
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!ready) {
      setStatus('pending')
      return undefined
    }

    if (!isAuthenticated || !userId) {
      // Guests skip product onboarding; AuthGate sends them to Login.
      setStatus('done')
      return undefined
    }

    let cancelled = false
    setStatus('pending')
    resolveOnboardingCompleted(userId).then((complete) => {
      if (cancelled) return
      setStatus(complete ? 'done' : 'needed')
    })

    return () => {
      cancelled = true
    }
  }, [ready, isAuthenticated, userId])

  const active = status === 'needed'

  const onComplete = useCallback(async () => {
    if (userId) {
      await persistOnboardingCompleted(userId)
    }
    setStatus('done')
  }, [userId])

  return (
    <OnboardingStatusContext.Provider value={status}>
      <OnboardingActiveContext.Provider value={active}>
        {children}
        {active ? <Onboarding onComplete={onComplete} /> : null}
      </OnboardingActiveContext.Provider>
    </OnboardingStatusContext.Provider>
  )
}

function Onboarding({ onComplete }) {
  const [open, setOpen] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [loaded, setLoaded] = useState(() => new Set())
  const [copyStep, setCopyStep] = useState(0)
  const [copyOut, setCopyOut] = useState(null)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const lockRef = useRef(false)
  const dragRef = useRef({ active: false, x: 0, start: 0 })
  const stepRef = useRef(0)
  const autoRef = useRef(false)
  const timers = useRef([])

  stepRef.current = step

  const later = useCallback((fn, ms) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    const root = document.querySelector('.phone-app')
    if (!root || !open) return undefined
    const siblings = [...root.children].filter((el) => !el.classList.contains('onboard'))
    siblings.forEach((el) => { el.inert = true })
    return () => siblings.forEach((el) => { el.inert = false })
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    preloadOnboardAssets().then((urls) => {
      if (!alive) return
      setLoaded(new Set(urls))
    })
    ONBOARD_ASSETS.forEach((src) => {
      const image = new Image()
      image.onload = () => {
        if (!alive) return
        setLoaded((prev) => {
          if (prev.has(src)) return prev
          const next = new Set(prev)
          next.add(src)
          return next
        })
      }
      image.src = src
    })
    return () => { alive = false }
  }, [open])

  const go = useCallback((next, source = 'swipe') => {
    const clamped = Math.max(0, Math.min(LAST, next))
    if (clamped === stepRef.current) return
    if (source !== 'cta' && lockRef.current) return
    lockRef.current = true
    const nextDir = clamped > stepRef.current ? 1 : -1
    setDir(nextDir)
    setDrag(0)
    setDragging(false)
    setStep(clamped)
    later(() => { lockRef.current = false }, prefersReducedMotion() ? 80 : SETTLE_MS)
  }, [later])

  useEffect(() => {
    if (!open || step !== 0 || autoRef.current) return undefined
    const wait = prefersReducedMotion() ? 360 : SPLASH_MS
    const id = later(() => {
      autoRef.current = true
      go(1)
    }, wait)
    return () => clearTimeout(id)
  }, [open, step, go, later])

  useEffect(() => {
    if (step === copyStep) return undefined
    setCopyOut(copyStep)
    setCopyStep(step)
    const id = later(() => setCopyOut(null), 300)
    return () => clearTimeout(id)
  }, [step, copyStep, later])

  const finish = useCallback(() => {
    if (leaving) return
    setLeaving(true)
    later(() => {
      setOpen(false)
      onComplete?.()
    }, prefersReducedMotion() ? 80 : 420)
  }, [leaving, later, onComplete])

  const onContinue = () => {
    if (step >= LAST) finish()
    else go(step + 1, 'cta')
  }

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('button')) return
    dragRef.current = { active: true, x: 0, start: event.clientX }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!dragRef.current.active) return
    const dx = event.clientX - dragRef.current.start
    dragRef.current.x = dx
    setDrag(dx)
  }

  const endDrag = () => {
    if (!dragRef.current.active) return
    const dx = dragRef.current.x
    dragRef.current = { active: false, x: 0, start: 0 }
    setDragging(false)
    const reduce = prefersReducedMotion()
    const threshold = reduce ? 28 : SWIPE_PX
    if (dx <= -threshold) {
      if (step >= LAST) {
        setDrag(0)
        return
      }
      go(step + 1)
      return
    }
    if (dx >= threshold) {
      go(step - 1)
      return
    }
    setDrag(0)
  }

  if (!open) return null

  const onContent = step > 0
  const slideIndex = Math.max(0, step - 1)
  const dialIndex = onContent
    ? slideIndex - (dragging ? drag / 240 : 0)
    : 0
  const copySlide = copyStep > 0 ? ONBOARD_SLIDES[copyStep - 1] : null
  const outgoingSlide = copyOut > 0 && copyOut !== copyStep ? ONBOARD_SLIDES[copyOut - 1] : null

  return (
    <div
      className={`onboard ${onContent ? 'is-content' : 'is-splash'} ${leaving ? 'is-leaving' : ''} ${dragging ? 'is-dragging' : ''}`}
      data-dir={dir}
      role="dialog"
      aria-label={`Welcome to ${BRAND_NAME}`}
      aria-modal="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="onboard-splash" aria-hidden={onContent}>
        <div className="onboard-brand">
          <img src={ONBOARD_LOGO} alt="" className="onboard-logo" />
          <p className="onboard-wordmark">{BRAND_NAME}</p>
        </div>
      </div>

      <div className="onboard-journey" aria-hidden={!onContent}>
        <div className="onboard-copy">
          {outgoingSlide ? (
            <div className="onboard-copy-layer is-out" key={`out-${outgoingSlide.id}`}>
              <h1 className="onboard-title">{outgoingSlide.title}</h1>
              <p className="onboard-body">{outgoingSlide.body}</p>
            </div>
          ) : null}
          {copySlide ? (
            <div className="onboard-copy-layer is-in" key={`in-${copySlide.id}`}>
              <h1 className="onboard-title">{copySlide.title}</h1>
              <p className="onboard-body">{copySlide.body}</p>
            </div>
          ) : null}
        </div>

        <div className="onboard-stage">
          {ONBOARD_SLIDES.map((slide, index) => (
            <ArtCard
              key={slide.id}
              slide={slide}
              delta={index - dialIndex}
              ready={loaded.has(slide.image)}
            />
          ))}
        </div>

        <div className="onboard-chrome">
          <div className="onboard-dots" aria-hidden="true">
            {ONBOARD_SLIDES.map((slide, index) => (
              <span
                key={slide.id}
                className={`onboard-dot ${index === slideIndex && onContent ? 'is-active' : ''}`}
              />
            ))}
          </div>
          <button type="button" className="onboard-cta" onClick={onContinue} aria-label={step >= LAST ? 'Get Started' : 'Continue'}>
            <span className={`onboard-cta-label ${step < LAST ? 'is-on' : ''}`} aria-hidden="true">Continue</span>
            <span className={`onboard-cta-label ${step >= LAST ? 'is-on' : ''}`} aria-hidden="true">Get Started</span>
          </button>
        </div>
      </div>
    </div>
  )
}
