import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import {
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  advanceRadiusDrag,
  kmFromReach,
  labelRadiusKm,
  mapZoomForRadius,
  radiusPxPerKm,
  reachForKm,
  reachFromOffset,
  settleRadiusKm,
} from '../lib/radiusDial'
import './SearchRadiusDial.css'

const DEFAULT_ANGLE = Math.PI / 5

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
}

function pulseHaptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(12)
  }
}

function useAnimatedCount(value) {
  const target = Number(value) || 0
  const reduced = prefersReducedMotion()
  const [shown, setShown] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = target
      return undefined
    }
    const from = fromRef.current
    if (from === target) return undefined
    const start = performance.now()
    let frame = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 320)
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(from + (target - from) * eased)
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return reduced ? target : shown
}

function measureAnchor(orbit) {
  const shell = orbit?.closest('.dir-shell')
  if (!orbit || !shell) return null
  const orbitBox = orbit.getBoundingClientRect()
  const shellBox = shell.getBoundingClientRect()
  return {
    x: orbitBox.left + orbitBox.width / 2 - shellBox.left,
    y: orbitBox.top + orbitBox.height / 2 - shellBox.top,
    width: shellBox.width,
    height: shellBox.height,
  }
}

export default function SearchRadiusDial({
  radiusKm,
  nationwide: _nationwide = false,
  count = 0,
  busy = false,
  origin = null,
  onStep,
  mapPhase = 'idle',
  onMapPhase,
  previewRef,
}) {
  const labelId = useId()
  const orbitRef = useRef(null)
  const coverageRef = useRef(null)
  const angleRef = useRef(DEFAULT_ANGLE)
  const draggingRef = useRef(false)
  const publishedRef = useRef(null)
  const finishRef = useRef(null)
  const lastPointRef = useRef(null)
  const rawKmRef = useRef(RADIUS_MIN_KM)
  const targetKmRef = useRef(RADIUS_MIN_KM)
  const visualKmRef = useRef(RADIUS_MIN_KM)
  const quantumRef = useRef(1)
  const speedRef = useRef(0)
  const directionRef = useRef(1)
  const coarseRef = useRef(false)
  const samplesRef = useRef([])
  const lastReachRef = useRef(null)
  const dragFrameRef = useRef(0)
  const publishTimerRef = useRef(0)
  const pendingKmRef = useRef(null)
  const springingRef = useRef(false)
  const keyAtRef = useRef(0)
  const baseKm = Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, Math.round(Number(radiusKm) || RADIUS_MIN_KM)))
  const [angle, setAngle] = useState(DEFAULT_ANGLE)
  const [drag, setDrag] = useState(null)
  const [spring, setSpring] = useState(null)
  const [presentedKm, setPresentedKm] = useState(null)
  const animatedCount = useAnimatedCount(count)
  const settledReach = reachForKm(baseKm)
  const visual = drag
    ? { reach: drag.reach, angle: drag.angle, spring: false, dragging: true }
    : spring
      ? {
        reach: spring.phase === 'to' ? spring.to : spring.from,
        angle: spring.angle,
        spring: true,
        dragging: false,
      }
      : { reach: settledReach, angle, spring: false, dragging: false }
  const displayKm = labelRadiusKm(drag ? drag.km : (presentedKm ?? baseKm))
  const left = 50 + Math.cos(visual.angle) * visual.reach * 50
  const top = 50 + Math.sin(visual.angle) * visual.reach * 50
  const valueText = `${displayKm} kilometers, ${animatedCount} ${animatedCount === 1 ? 'doctor' : 'doctors'}`

  const publishKm = (km, immediate = false) => {
    const next = labelRadiusKm(km)
    if (next === (publishedRef.current ?? baseKm)) return
    if (!immediate) {
      pendingKmRef.current = next
      if (publishTimerRef.current) return
      publishTimerRef.current = window.setTimeout(() => {
        publishTimerRef.current = 0
        const pending = pendingKmRef.current
        pendingKmRef.current = null
        if (pending == null) return
        publishKm(pending, true)
      }, 120)
      return
    }
    if (publishTimerRef.current) {
      window.clearTimeout(publishTimerRef.current)
      publishTimerRef.current = 0
    }
    pendingKmRef.current = null
    publishedRef.current = next
    onStep?.({ id: String(next), km: next, value: String(next), unit: 'km' })
  }

  const springTo = (km, nextAngle = angleRef.current, fromReach = visual.reach, snap = false) => {
    const settled = labelRadiusKm(km)
    const reach = reachForKm(settled)
    const moved = Math.abs(fromReach - reach) >= 0.004
    const changed = settled !== (publishedRef.current ?? baseKm)
    angleRef.current = nextAngle
    setAngle(nextAngle)
    setDrag(null)
    publishKm(settled, true)
    if (changed || moved || snap) pulseHaptic()
    if (prefersReducedMotion() || !moved) {
      springingRef.current = false
      setPresentedKm(null)
      setSpring(null)
      return
    }
    springingRef.current = true
    setPresentedKm(kmFromReach(fromReach))
    setSpring({
      from: fromReach,
      to: reach,
      angle: nextAngle,
      km: settled,
      phase: 'from',
    })
  }

  const stopDragLoop = () => {
    if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current)
    dragFrameRef.current = 0
  }

  const startDragLoop = () => {
    stopDragLoop()
    let last = performance.now()
    const tick = (now) => {
      if (!draggingRef.current) return
      const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000))
      last = now
      const target = targetKmRef.current
      const current = visualKmRef.current
      const smooth = quantumRef.current >= 10 ? 0.12 : 0.045
      const blend = 1 - Math.exp(-dt / smooth)
      let next = current + (target - current) * blend
      if (Math.abs(target - next) < 0.035) next = target
      visualKmRef.current = next
      if (Math.abs(next - current) >= 0.01) {
        setDrag({
          reach: reachForKm(next),
          angle: angleRef.current,
          km: next,
        })
        publishKm(quantumRef.current >= 10 ? targetKmRef.current : next)
      }
      dragFrameRef.current = requestAnimationFrame(tick)
    }
    dragFrameRef.current = requestAnimationFrame(tick)
  }

  const pointFromEvent = (event) => {
    const orbit = orbitRef.current
    if (!orbit) return null
    const box = orbit.getBoundingClientRect()
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    const reach = reachFromOffset(dx, dy, box.width / 2)
    const nextAngle = Math.hypot(dx, dy) < 1 ? angleRef.current : Math.atan2(dy, dx)
    return { reach, angle: nextAngle }
  }

  const frameForReach = (reach) => {
    if (!origin) return null
    return {
      zoom: mapZoomForRadius(origin.latitude, kmFromReach(reach)),
      anchor: measureAnchor(orbitRef.current),
    }
  }

  const onPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return
    const point = pointFromEvent(event)
    if (!point) return
    const km = labelRadiusKm(drag?.km ?? presentedKm ?? baseKm)
    draggingRef.current = true
    springingRef.current = false
    lastPointRef.current = point
    lastReachRef.current = point.reach
    rawKmRef.current = km
    targetKmRef.current = km
    visualKmRef.current = km
    quantumRef.current = 1
    coarseRef.current = false
    speedRef.current = 0
    directionRef.current = 1
    samplesRef.current = []
    publishedRef.current = km
    angleRef.current = point.angle
    setSpring(null)
    setPresentedKm(null)
    setDrag({ reach: reachForKm(km), angle: point.angle, km })
    onMapPhase?.('open', frameForReach(reachForKm(km)))
    event.currentTarget.setPointerCapture?.(event.pointerId)
    startDragLoop()
  }

  const onPointerMove = (event) => {
    if (!draggingRef.current) return
    const point = pointFromEvent(event)
    if (!point || lastReachRef.current == null) return
    const orbit = orbitRef.current
    const radiusPx = orbit ? orbit.getBoundingClientRect().width / 2 : 0
    const deltaPx = (point.reach - lastReachRef.current) * radiusPx
    const now = performance.now()
    const radialPx = point.reach * radiusPx
    const samples = samplesRef.current
    samples.push({ t: now, px: radialPx })
    const cutoff = now - 90
    while (samples.length > 2 && samples[0].t < cutoff) samples.shift()
    const first = samples[0]
    const last = samples[samples.length - 1]
    const dt = (last.t - first.t) / 1000
    const speed = dt >= 0.012 ? Math.abs(last.px - first.px) / dt : speedRef.current
    speedRef.current = speed
    if (Math.sign(deltaPx)) directionRef.current = Math.sign(deltaPx)
    const step = advanceRadiusDrag({
      km: rawKmRef.current,
      deltaPx,
      pxPerSec: speed,
      pxPerKm: radiusPxPerKm(radiusPx),
      coarse: coarseRef.current,
    })
    rawKmRef.current = step.km
    targetKmRef.current = step.target
    quantumRef.current = step.quantum
    coarseRef.current = step.quantum >= 10
    lastReachRef.current = point.reach
    lastPointRef.current = point
    angleRef.current = point.angle
  }

  const finishDrag = (event) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    stopDragLoop()
    const hasPointer = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)
    const point = hasPointer ? pointFromEvent(event) : null
    const from = point || lastPointRef.current
    lastPointRef.current = null
    lastReachRef.current = null
    const fromReach = reachForKm(visualKmRef.current)
    const settled = settleRadiusKm(rawKmRef.current, speedRef.current, directionRef.current)
    springTo(settled, from?.angle ?? angleRef.current, fromReach, true)
    onMapPhase?.('hold')
  }

  useEffect(() => {
    finishRef.current = finishDrag
  })

  useEffect(() => {
    const end = (event) => finishRef.current?.(event)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  const springFrom = spring?.phase === 'from' ? `${spring.from}:${spring.to}` : ''

  useLayoutEffect(() => {
    if (!springFrom) return undefined
    let cancelled = false
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        setSpring((current) => (
          current && current.phase === 'from' ? { ...current, phase: 'to' } : current
        ))
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(outer)
    }
  }, [springFrom])

  useEffect(() => {
    if (!springFrom) return undefined
    const timer = window.setTimeout(() => {
      springingRef.current = false
      setPresentedKm(null)
      setSpring(null)
    }, 720)
    return () => window.clearTimeout(timer)
  }, [springFrom])

  useEffect(() => () => {
    if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current)
    if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current)
  }, [])

  const originLat = origin?.latitude
  const originLng = origin?.longitude

  useEffect(() => {
    if (mapPhase === 'idle' || !Number.isFinite(originLat)) return undefined
    let frame = 0
    const tick = () => {
      const orbit = orbitRef.current
      const coverage = coverageRef.current
      const shell = orbit?.closest('.dir-shell')
      if (orbit && coverage && shell) {
        const orbitBox = orbit.getBoundingClientRect()
        const shellBox = shell.getBoundingClientRect()
        const coverageBox = coverage.getBoundingClientRect()
        const reach = orbitBox.width ? coverageBox.width / orbitBox.width : null
        if (reach != null) {
          if (springingRef.current) {
            const measured = kmFromReach(reach)
            setPresentedKm((prev) => (prev != null && Math.abs(prev - measured) < 0.04 ? prev : measured))
          }
          previewRef?.current?.sync(
            mapZoomForRadius(originLat, kmFromReach(reach)),
            {
              x: orbitBox.left + orbitBox.width / 2 - shellBox.left,
              y: orbitBox.top + orbitBox.height / 2 - shellBox.top,
              width: shellBox.width,
              height: shellBox.height,
            },
          )
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mapPhase, originLat, originLng, previewRef])

  const onKeyDown = (event) => {
    const now = performance.now()
    const quick = now - keyAtRef.current < 90
    keyAtRef.current = now
    const stepKm = quick ? 10 : 1
    const moveKey = (km) => {
      const fromReach = reachForKm(displayKm)
      onMapPhase?.('hold', frameForReach(fromReach))
      springTo(km, angleRef.current, fromReach)
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveKey(displayKm + stepKm)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveKey(displayKm - stepKm)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveKey(RADIUS_MIN_KM)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveKey(RADIUS_MAX_KM)
    }
  }

  return (
    <div className={`radius-dial${visual.dragging ? ' is-dragging' : ''}${visual.spring ? ' is-spring' : ''}${mapPhase !== 'idle' ? ' is-map' : ''}`}>
      <div
        className="radius-dial__orbit"
        ref={orbitRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div
          className="radius-dial__coverage"
          ref={coverageRef}
          style={{ width: `${visual.reach * 100}%`, height: `${visual.reach * 100}%` }}
          aria-hidden="true"
        />
        <div className="radius-dial__center">
          <span className="radius-dial__value" id={labelId}>
            {displayKm} km
          </span>
          <span className="radius-dial__count" aria-live="polite">
            {animatedCount} {animatedCount === 1 ? 'result' : 'results'}
          </span>
        </div>
        <button
          type="button"
          className="radius-dial__handle"
          role="slider"
          aria-label="Search radius"
          aria-valuemin={RADIUS_MIN_KM}
          aria-valuemax={RADIUS_MAX_KM}
          aria-valuenow={displayKm}
          aria-valuetext={valueText}
          aria-busy={busy || undefined}
          style={{ left: `${left}%`, top: `${top}%` }}
          onKeyDown={onKeyDown}
          onClick={(event) => event.preventDefault()}
        />
      </div>
    </div>
  )
}
