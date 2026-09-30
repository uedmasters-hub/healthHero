import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { discountPercent, listCatalog } from '../../features/pharmacy/shopApi'
import { Badge } from '../ui'
import { CartStepper, PriceTag, ProductArt, TrustStrip } from './ProductBits'
import { PharmacyIcon } from './PharmacyIcons'
import '../Services.css'
import './PharmacyShop.css'

const RAIL = [
  { id: 'all', label: 'All Medicines', icon: 'pill' },
  { id: 'personal', label: 'Personal Care', icon: 'bottle' },
  { id: 'conditions', label: 'Health Conditions', icon: 'plus' },
  { id: 'baby', label: 'Baby Care', icon: 'baby' },
  { id: 'first-aid', label: 'First Aid', icon: 'cross' },
  { id: 'devices', label: 'Health Devices', icon: 'device' },
  { id: 'vitamins', label: 'Vitamins & Supplements', icon: 'spark' },
  { id: 'ayurveda', label: 'Ayurveda & Herbal', icon: 'leaf' },
  { id: 'offers', label: 'Offers', icon: 'tag' },
]

function shelfOf(product) {
  const klass = String(product.drugClass || '').toLowerCase()
  const name = String(product.name || '').toLowerCase()
  if (product.category === 'equipment' || klass === 'monitoring') return 'devices'
  if (klass === 'vitamins' || name.includes('vitamin') || name.includes('multivitamin')) return 'vitamins'
  if (klass === 'ayurveda' || klass === 'homeopathy' || name.includes('ashwagandha') || name.includes('amla') || name.includes('chyawan')) return 'ayurveda'
  if (klass === 'hygiene') return 'personal'
  if (klass === 'hydration' || name.includes('antiseptic') || name.includes('inhaler') || name.includes('thermometer')) return 'first-aid'
  if (name.includes('baby') || name.includes('infant')) return 'baby'
  return 'conditions'
}

function inShelf(product, shelf) {
  if (shelf === 'all') return true
  if (shelf === 'offers') {
    return product.mrp != null && product.price != null && product.mrp > product.price
  }
  return shelfOf(product) === shelf
}

function ProductTile({ product, onOpen }) {
  const off = discountPercent(product)
  return (
    <article className="shop-tile ds-card is-compact">
      <button type="button" className="shop-tile__open" onClick={() => onOpen(product.id)}>
        <span className="shop-tile__media">
          <ProductArt product={product} />
          {product.requiresPrescription ? (
            <Badge tone="warning" className="shop-tile__flag">Rx</Badge>
          ) : off ? (
            <Badge tone="success" className="shop-tile__flag">{off}% off</Badge>
          ) : null}
        </span>
        <span className="shop-tile__name">{product.name}</span>
        {product.packLabel ? <span className="shop-tile__pack">{product.packLabel}</span> : null}
        <PriceTag product={product} showSaving={false} className="shop-tile__price" />
      </button>
      <CartStepper product={product} block />
    </article>
  )
}

const SHELVES = RAIL.filter((item) => item.id !== 'all')

function CategoryToggle({ railOpen, onClick, floating = false }) {
  return (
    <button
      type="button"
      className={`shop-rail-toggle${floating ? ' ds-icon-btn is-subtle is-floating' : ''}`}
      aria-expanded={railOpen}
      aria-label={railOpen ? 'Hide categories' : 'Show categories'}
      onClick={onClick}
    >
      <span className="shop-rail__grip" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
      </span>
    </button>
  )
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function MarketplaceFeed({
  query = '',
  pharmacyId = null,
  onOpenProduct,
  stageRef,
}) {
  const [shelf, setShelf] = useState('all')
  const [railOpen, setRailOpen] = useState(true)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navRef = useRef(null)
  const indicatorRef = useRef(null)
  const scrollingTo = useRef(null)
  const localStageRef = useRef(null)
  const scrollerRef = stageRef || localStageRef

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listCatalog({ q: query, category: 'all', pharmacyId })
      .then((rows) => {
        if (!cancelled) {
          setProducts(rows)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProducts([])
          setError(err.message || 'Medicines could not be loaded.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [query, pharmacyId])

  const groups = useMemo(
    () => SHELVES.map((item) => ({
      ...item,
      products: products.filter((product) => inShelf(product, item.id)),
    })),
    [products],
  )

  const scrollToShelf = (id) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    scrollingTo.current = id
    setShelf(id)
    if (id === 'all') {
      if (scroller.scrollTop < 2) {
        scrollingTo.current = null
        return
      }
      scroller.scrollTo({ top: 0, behavior })
      return
    }
    const section = scroller.querySelector(`[data-section="${id}"]`)
    if (!section) return
    const top = scroller.scrollTop
      + section.getBoundingClientRect().top
      - scroller.getBoundingClientRect().top
    if (Math.abs(top - scroller.scrollTop) < 2) {
      scrollingTo.current = null
      return
    }
    scroller.scrollTo({ top, behavior })
  }

  useEffect(() => {
    const nav = navRef.current
    const button = nav?.querySelector(`[data-shelf="${shelf}"]`)
    if (!nav || !button) return
    const navBox = nav.getBoundingClientRect()
    const box = button.getBoundingClientRect()
    const ideal = navBox.top + (navBox.height - box.height) / 2
    if (Math.abs(box.top - ideal) < 8) return
    nav.scrollTo({
      top: Math.max(0, nav.scrollTop + (box.top - ideal)),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [shelf])

  useEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator || !railOpen) return undefined
    let cancelled = false
    const place = () => {
      if (cancelled) return
      const button = nav.querySelector(`[data-shelf="${shelf}"]`)
      if (!button || !button.offsetHeight) return
      indicator.style.height = `${button.offsetHeight}px`
      indicator.style.transform = `translate3d(0, ${button.offsetTop}px, 0)`
      indicator.classList.add('is-ready')
    }
    place()
    document.fonts?.ready.then(place)
    const observer = new ResizeObserver(place)
    observer.observe(nav)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [shelf, railOpen])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined
    let frame = 0

    const spy = () => {
      frame = 0
      const pending = scrollingTo.current
      if (pending) {
        const scrollerTop = scroller.getBoundingClientRect().top
        const arrived = pending === 'all'
          ? scroller.scrollTop < 4
          : Math.abs((scroller.querySelector(`[data-section="${pending}"]`)?.getBoundingClientRect().top ?? scrollerTop) - scrollerTop) < 4
        if (!arrived) return
        scrollingTo.current = null
      }

      const line = scroller.getBoundingClientRect().top + 8
      let next = 'all'
      for (const item of SHELVES) {
        const section = scroller.querySelector(`[data-section="${item.id}"]`)
        if (section && section.getBoundingClientRect().top <= line) next = item.id
      }
      const atBottom = scroller.scrollTop > 0
        && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      if (atBottom) {
        const last = [...SHELVES].reverse().find((item) => scroller.querySelector(`[data-section="${item.id}"]`))
        if (last) next = last.id
      }
      setShelf((current) => (current === next ? current : next))
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(spy)
    }
    const release = () => { scrollingTo.current = null }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('pointerdown', release)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('pointerdown', release)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [scrollerRef, loading, products])

  return (
    <div className={`shop-browse${railOpen ? '' : ' is-rail-hidden'}`}>
      <div className="shop-rail-slot">
        <nav className="shop-rail" aria-label="Shop categories">
          <div className="shop-rail__header">
            {railOpen ? (
              <CategoryToggle railOpen={railOpen} onClick={() => setRailOpen(false)} />
            ) : null}
          </div>
          <div className="shop-rail__nav" ref={navRef} aria-hidden={!railOpen} inert={!railOpen}>
            <span className="shop-rail__indicator" ref={indicatorRef} aria-hidden="true" />
            {RAIL.map((item) => (
              <button
                key={item.id}
                type="button"
                data-shelf={item.id}
                className={`shop-rail__item${shelf === item.id ? ' is-active' : ''}`}
                aria-current={shelf === item.id ? 'true' : undefined}
                tabIndex={railOpen ? 0 : -1}
                onClick={() => scrollToShelf(item.id)}
              >
                <span className="shop-rail__icon">
                  <PharmacyIcon name={item.icon} size={18} />
                </span>
                <span className="shop-rail__label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="shop-aisle">
        {loading ? (
          <div className="shop-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="shop-tile--skel shimmer" key={index} />
            ))}
          </div>
        ) : null}
        {!loading && error ? <p className="shop-aisle__empty">{error}</p> : null}
        {!loading && !error && !products.length ? (
          <p className="shop-aisle__empty">
            {query.trim() ? 'No products match that search.' : 'Nothing in this store yet.'}
          </p>
        ) : null}
        {!loading && !error && products.length ? groups.map((group) => (
          <section className="shop-shelf" data-section={group.id} key={group.id}>
            <h2 className="ds-section-head__title">{group.label}</h2>
            {group.products.length ? (
              <div className="shop-grid">
                {group.products.map((product) => (
                  <ProductTile key={product.id} product={product} onOpen={onOpenProduct} />
                ))}
              </div>
            ) : (
              <p className="shop-aisle__empty">Nothing in {group.label} yet.</p>
            )}
          </section>
        )) : null}

        <TrustStrip />
      </div>
      {!railOpen && typeof document !== 'undefined' && document.querySelector('.shop-store')
        ? createPortal(
          <CategoryToggle floating railOpen={railOpen} onClick={() => setRailOpen(true)} />,
          document.querySelector('.shop-store'),
        )
        : null}
    </div>
  )
}
