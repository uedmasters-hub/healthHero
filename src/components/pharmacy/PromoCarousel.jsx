import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RxImage } from './PharmacyHome'
import './PromoCarousel.css'

const AUTO_MS = 4800

/**
 * Pharmacy hero carousel — tinted cards with neighbours peeking on both
 * sides, scroll-snap, pill dots, optional auto-advance. `startIndex` centres
 * a slide on first paint without animating.
 */
export default function PromoCarousel({
  slides = [],
  onAction,
  startIndex = 0,
  autoPlay = true,
  label = 'Pharmacy highlights',
  className = '',
}) {
  const trackRef = useRef(null)
  const slideNodes = useRef([])
  const [activeIndex, setActiveIndex] = useState(() => Math.min(startIndex, Math.max(0, slides.length - 1)))
  const startRef = useRef(activeIndex)
  const pauseUntilRef = useRef(0)

  const offsetFor = useCallback((index) => {
    const node = slideNodes.current[index]
    const track = trackRef.current
    if (!node || !track) return null
    return Math.max(0, node.offsetLeft - (track.clientWidth - node.offsetWidth) / 2)
  }, [])

  useLayoutEffect(() => {
    const left = offsetFor(startRef.current)
    if (left != null) trackRef.current.scrollLeft = left
  }, [slides.length, offsetFor])

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || !slides.length) return
    const center = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    slideNodes.current.forEach((node, index) => {
      if (!node) return
      const dist = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center)
      if (dist < bestDist) {
        bestDist = dist
        best = index
      }
    })
    setActiveIndex(best)
  }, [slides.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    track.addEventListener('scroll', syncActiveFromScroll, { passive: true })
    return () => track.removeEventListener('scroll', syncActiveFromScroll)
  }, [syncActiveFromScroll])

  const scrollToIndex = useCallback((index) => {
    const left = offsetFor(index)
    if (left == null) return
    trackRef.current.scrollTo({ left, behavior: 'smooth' })
    setActiveIndex(index)
  }, [offsetFor])

  useEffect(() => {
    if (!autoPlay || slides.length < 2) return undefined
    const id = window.setInterval(() => {
      if (performance.now() < pauseUntilRef.current) return
      scrollToIndex((activeIndex + 1) % slides.length)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [autoPlay, slides.length, activeIndex, scrollToIndex])

  const pauseAuto = () => {
    pauseUntilRef.current = performance.now() + AUTO_MS * 2
  }

  if (!slides.length) return null

  return (
    <div className={`promo-carousel ${className}`.trim()}>
      <div
        className={`promo-carousel__scroller${slides.length === 1 ? ' is-single' : ''}`}
        ref={trackRef}
        onPointerDown={pauseAuto}
        onTouchStart={pauseAuto}
        aria-roledescription="carousel"
        aria-label={label}
      >
        <div className="promo-carousel__track">
          {slides.map((slide, index) => (
            <article
              key={slide.id}
              ref={(node) => { slideNodes.current[index] = node }}
              className={[
                'promo-card',
                `is-${slide.tone || 'mint'}`,
                index === activeIndex ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}`}
            >
              <div className="promo-card__copy">
                <h2 className="promo-card__title">{slide.title}</h2>
                {slide.body ? <p className="promo-card__body">{slide.body}</p> : null}
                {slide.cta ? (
                  <button
                    type="button"
                    className="promo-card__cta ds-btn ds-btn--primary ds-btn--md"
                    onClick={() => onAction?.(slide)}
                  >
                    {slide.cta}
                  </button>
                ) : null}
              </div>
              <div className="promo-card__art" aria-hidden="true">
                <RxImage srcs={slide.images} className="promo-card__image" />
              </div>
            </article>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="promo-carousel__dots" role="tablist" aria-label="Highlight pages">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={`promo-carousel__dot${index === activeIndex ? ' is-active' : ''}`}
              onClick={() => {
                pauseAuto()
                scrollToIndex(index)
              }}
              aria-label={`Go to highlight ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
