import { useCallback, useEffect, useRef, useState } from 'react'
import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import './PromoCarousel.css'

const AUTO_MS = 4800

/**
 * Horizontal promo carousel — scroll-snap, dots, optional auto-advance.
 * Same motion language as UpcomingBookingsCarousel (scale active slide).
 */
export default function PromoCarousel({
  slides = [],
  onAction,
  autoPlay = true,
  className = '',
}) {
  const trackRef = useRef(null)
  const slideNodes = useRef([])
  const [activeIndex, setActiveIndex] = useState(0)
  const pauseUntilRef = useRef(0)
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: `promo-carousel:${slides.length}`,
  })

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || !slides.length) return
    const center = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    slideNodes.current.forEach((node, index) => {
      if (!node) return
      const mid = node.offsetLeft + node.offsetWidth / 2
      const dist = Math.abs(mid - center)
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
    syncActiveFromScroll()
    const onScroll = () => syncActiveFromScroll()
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [syncActiveFromScroll, slides.length])

  const scrollToIndex = useCallback((index) => {
    const node = slideNodes.current[index]
    const track = trackRef.current
    if (!node || !track) return
    const left = node.offsetLeft - (track.clientWidth - node.offsetWidth) / 2
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    if (!autoPlay || slides.length < 2) return undefined
    const id = window.setInterval(() => {
      if (performance.now() < pauseUntilRef.current) return
      const next = (activeIndex + 1) % slides.length
      scrollToIndex(next)
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
        aria-label="Pharmacy promotions"
      >
        <div className="promo-carousel__track">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex
            const isAdjacent = Math.abs(index - activeIndex) === 1
            return (
              <div
                key={slide.id}
                className="promo-carousel__slide"
                ref={(node) => { slideNodes.current[index] = node }}
              >
                <RevealItem
                  as="article"
                  className={[
                    'promo-card',
                    `promo-card--${slide.tone || 'refill'}`,
                    isActive ? 'is-active' : '',
                    isAdjacent ? 'is-adjacent' : '',
                  ].filter(Boolean).join(' ')}
                  revealed={isRevealed(index)}
                  cached={isCached}
                  ref={setItemRef(index)}
                >
                  <div className="promo-card__copy">
                    <h2 className="promo-card__title">{slide.title}</h2>
                    {slide.body ? (
                      <p className="promo-card__body">{slide.body}</p>
                    ) : null}
                    {slide.cta ? (
                      <button
                        type="button"
                        className="promo-card__cta"
                        onClick={() => onAction?.(slide)}
                      >
                        <span>{slide.cta}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                          <path d="M5 12h14" />
                          <path d="M13 6l6 6-6 6" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                  <div className="promo-card__visual" aria-hidden="true">
                    <div className="promo-card__orb" />
                    <div className="promo-card__orb is-soft" />
                    {slide.image ? (
                      <img className="promo-card__image" src={slide.image} alt="" draggable={false} />
                    ) : null}
                  </div>
                </RevealItem>
              </div>
            )
          })}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="promo-carousel__dots" role="tablist" aria-label="Promotion pages">
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
              aria-label={`Go to promotion ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
