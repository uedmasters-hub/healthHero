import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTransition } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { HOME_TOP_COUNT, promoteTopDoctor, useTopDoctors } from '../lib/topDoctorsOrder'
import DoctorCard from './DoctorCard'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './TopDoctors.css'
import './DoctorCard.css'

const RETURN_STAGGER = 86

export default function TopDoctors() {
  const { openTopDoctors } = useTransition()
  const shared = useSharedHero()
  const doctors = useTopDoctors(HOME_TOP_COUNT)
  const originIdxRef = useRef(0)
  const rippleStartedRef = useRef(false)
  const holdSessionRef = useRef(false)
  const returnTimersRef = useRef([])
  const revealedRef = useRef(new Set())
  const [ignoreCacheReveal, setIgnoreCacheReveal] = useState(false)
  const [, bump] = useState(0)

  const pinned = Boolean(
    shared?.sourceDoctorId != null
    && doctors.some((doc) => doc.id === shared.sourceDoctorId)
  )
  const holding = Boolean(pinned && shared?.active)
  const returningFromProfile = Boolean(holding && String(shared?.phase || '').startsWith('closing'))
  const holdCachedCards = ignoreCacheReveal || holding

  if (holding && !holdSessionRef.current) {
    holdSessionRef.current = true
    revealedRef.current = new Set()
    rippleStartedRef.current = false
    returnTimersRef.current.forEach(clearTimeout)
    returnTimersRef.current = []
    originIdxRef.current = 0
  } else if (!holding) {
    holdSessionRef.current = false
  }

  const stagger = useStaggerReveal({
    delay: 380,
    dataset: 'home:top-doctors',
  })
  const { containerRef, setItemRef, isRevealed, isCached } = stagger

  const revealCard = useCallback((idx) => {
    if (revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
    bump((n) => n + 1)
  }, [])

  const runReturnRipple = useCallback(() => {
    const n = doctors.length
    const origin = originIdxRef.current >= 0 ? originIdxRef.current : 0
    const order = []
    if (origin < n) order.push(origin)
    const rest = []
    for (let i = 0; i < n; i += 1) {
      if (!order.includes(i)) rest.push(i)
    }
    rest.sort((a, b) => Math.abs(a - origin) - Math.abs(b - origin) || a - b)
    ;[...order, ...rest].forEach((idx, step) => {
      const delay = step === 0 ? 0 : 40 + (step - 1) * RETURN_STAGGER
      const t = setTimeout(() => revealCard(idx), delay)
      returnTimersRef.current.push(t)
    })
  }, [doctors.length, revealCard])

  useLayoutEffect(() => {
    if (!holding) return
    originIdxRef.current = Math.max(0, doctors.findIndex((doc) => doc.id === shared.sourceDoctorId))
    containerRef.current?.scrollTo({ left: 0, behavior: 'auto' })
  }, [holding, shared?.sourceDoctorId, doctors, containerRef])

  useLayoutEffect(() => {
    if (!returningFromProfile) return
    if (!ignoreCacheReveal) {
      returnTimersRef.current.forEach(clearTimeout)
      returnTimersRef.current = []
      setIgnoreCacheReveal(true)
    }
  }, [returningFromProfile, ignoreCacheReveal])

  useLayoutEffect(() => {
    if (!ignoreCacheReveal) return
    if (shared?.phase === 'closing-settle') {
      revealCard(originIdxRef.current)
      return
    }
    if (shared?.phase !== 'idle' || rippleStartedRef.current) return
    rippleStartedRef.current = true
    runReturnRipple()
  }, [shared?.phase, ignoreCacheReveal, revealCard, runReturnRipple])

  return (
    <div className={`top-doctors ${holdCachedCards ? 'is-return-hold' : ''}`}>
      <div className="section-header">
        <h2 className="section-title">Top 10 Doctor Speciality</h2>
        <a className="view-all-link" onClick={openTopDoctors}>See all &gt;</a>
      </div>
      <div className="doctors-scroll" ref={containerRef}>
        {doctors.map((doctor, i) => {
          const isPlaceholder = shared?.active && shared.sourceDoctorId === doctor.id
          const shown = holdCachedCards
            ? revealedRef.current.has(i)
            : isRevealed(i)
          return (
            <RevealItem
              key={doctor.id}
              className={`doctor-grid-item ${isPlaceholder ? 'is-shared-placeholder' : ''}`}
              revealed={shown}
              cached={holdCachedCards ? false : isCached}
              ref={setItemRef(i)}
              data-top-doctor-anchor={i === 0 ? '' : undefined}
            >
              <DoctorCard
                doctor={doctor}
                variant="grid"
                origin="top10-speciality"
                returnTo="/"
                onBeforeNavigate={() => promoteTopDoctor(doctor.id)}
              />
            </RevealItem>
          )
        })}
      </div>
    </div>
  )
}
