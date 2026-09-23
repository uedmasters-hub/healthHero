import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchPharmacyPage,
  mapsPharmacyDirectionsUrl,
} from '../features/providers/pharmaciesRepository'
import { formatPlaceParts } from '../features/geography/formatPlace'
import GalleryLightbox from './GalleryLightbox'
import EmptyState from './EmptyState'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { useDemoPreview } from './DemoPreviewModal'
import './PharmacyDetailPage.css'

function PharmacySkeleton() {
  return (
    <div className="pharm-detail-skel" aria-hidden="true">
      <div className="pharm-detail-skel-hero shimmer" />
      <div className="pharm-detail-skel-block shimmer" />
      <div className="pharm-detail-skel-block is-mid shimmer" />
      <div className="pharm-detail-skel-row">
        <div className="pharm-detail-skel-chip shimmer" />
        <div className="pharm-detail-skel-chip shimmer" />
      </div>
      <div className="pharm-detail-skel-card shimmer" />
      <div className="pharm-detail-skel-card shimmer" />
    </div>
  )
}

function Section({ title, children, empty, emptyTitle }) {
  if (!children && empty) {
    return (
      <section className="pharm-detail-section">
        <h2 className="pharm-detail-section-title">{title}</h2>
        <p className="pharm-detail-section-empty">{emptyTitle || 'Nothing listed yet.'}</p>
      </section>
    )
  }
  if (!children) return null
  return (
    <section className="pharm-detail-section">
      <h2 className="pharm-detail-section-title">{title}</h2>
      {children}
    </section>
  )
}

export default function PharmacyDetailPage() {
  const { pharmacyId } = useParams()
  const navigate = useNavigate()
  const goBack = usePushBack(-1)
  const scrollRef = useRef(null)
  const { show: showDemoPreview } = useDemoPreview()

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const load = useCallback(async () => {
    if (!pharmacyId) {
      setStatus('error')
      setError('Missing pharmacy id')
      setPayload(null)
      return
    }
    setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'))
    const next = await fetchPharmacyPage(pharmacyId)
    if (next.error || !next.pharmacy) {
      setStatus('error')
      setError(next.error || 'Pharmacy not found')
      setPayload(next)
      return
    }
    setPayload(next)
    setError(null)
    setStatus('ready')
  }, [pharmacyId])

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => { cancelled = true }
  }, [load])

  const ptr = usePullToRefresh(scrollRef, load)

  const pharmacy = payload?.pharmacy || null
  const hours = payload?.hours || []
  const services = payload?.services || []
  const contacts = payload?.contacts || []
  const media = payload?.media || []

  const galleryImages = useMemo(() => {
    const fromMedia = media.map((m) => m.url).filter(Boolean)
    if (fromMedia.length) return fromMedia
    if (pharmacy?.image) return [pharmacy.image]
    return []
  }, [media, pharmacy])

  const directionsUrl = useMemo(() => mapsPharmacyDirectionsUrl(pharmacy), [pharmacy])
  const phoneContact = contacts.find((c) => c.kind === 'phone')?.value || pharmacy?.phone
  const emailContact = contacts.find((c) => c.kind === 'email')?.value || pharmacy?.email
  const todayHours = useMemo(() => {
    const today = new Date().getDay()
    return hours.find((h) => h.dayOfWeek === today) || null
  }, [hours])

  const mapEmbedUrl = useMemo(() => {
    if (!pharmacy) return null
    if (pharmacy.latitude != null && pharmacy.longitude != null) {
      return `https://maps.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}&z=15&output=embed`
    }
    const q = encodeURIComponent(pharmacy.fullAddress || pharmacy.address || pharmacy.name || '')
    if (!q) return null
    return `https://maps.google.com/maps?q=${q}&z=14&output=embed`
  }, [pharmacy])

  const locationLabel = pharmacy
    ? formatPlaceParts(pharmacy.place, pharmacy.city, pharmacy.district) || pharmacy.address
    : ''

  if (status === 'loading') {
    return (
      <div className="pharm-detail-page page-push-in">
        <header className="pharm-detail-header">
          <button type="button" className="pharm-detail-back" data-push-back onClick={goBack} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="pharm-detail-header-title">Pharmacy</h1>
          <span className="pharm-detail-header-spacer" />
        </header>
        <div className="pharm-detail-scroll">
          <PharmacySkeleton />
        </div>
      </div>
    )
  }

  if (status === 'error' || !pharmacy) {
    return (
      <div className="pharm-detail-page page-push-in">
        <header className="pharm-detail-header">
          <button type="button" className="pharm-detail-back" data-push-back onClick={goBack} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="pharm-detail-header-title">Pharmacy</h1>
          <span className="pharm-detail-header-spacer" />
        </header>
        <div className="pharm-detail-scroll pharm-detail-scroll-empty">
          <EmptyState
            image="/img/empty_state/pharmacy.png"
            alt=""
            title="Pharmacy unavailable"
            message={error || 'We could not load this pharmacy from the DDA registry.'}
          />
          <button type="button" className="pharmacy-retry" onClick={load}>Try again</button>
          <button type="button" className="pharmacy-retry is-secondary" onClick={() => navigate('/pharmacy')}>
            Back to pharmacies
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pharm-detail-page page-push-in has-cta">
      <header className="pharm-detail-header">
        <button type="button" className="pharm-detail-back" data-push-back onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="pharm-detail-header-title">Pharmacy</h1>
        <span className="pharm-detail-header-spacer" />
      </header>

      <div className="pharm-detail-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing || status === 'refreshing'} />

        <div className="pharm-detail-hero">
          <div className="pharm-detail-hero-media">
            {pharmacy.image ? (
              <img src={pharmacy.image} alt="" className="pharm-detail-hero-img" />
            ) : (
              <div className="pharm-detail-hero-placeholder" aria-hidden="true" />
            )}
          </div>
          <div className="pharm-detail-hero-body">
            <div className="pharm-detail-chips">
              {pharmacy.isVerified ? <span className="pharm-detail-chip is-verified">Verified</span> : null}
              {pharmacy.pharmacyType ? <span className="pharm-detail-chip">{pharmacy.pharmacyType}</span> : null}
              {pharmacy.delivers ? <span className="pharm-detail-chip">Delivery</span> : null}
            </div>
            <h2 className="pharm-detail-name">{pharmacy.name}</h2>
            {locationLabel ? <p className="pharm-detail-subtitle">{locationLabel}</p> : null}
            {todayHours ? (
              <p className="pharm-detail-today">
                Today · {todayHours.isClosed ? 'Closed' : todayHours.label}
              </p>
            ) : pharmacy.delivers ? (
              <p className="pharm-detail-today">Delivery available</p>
            ) : null}
          </div>
        </div>

        <div className="pharm-detail-actions">
          {phoneContact ? (
            <a className="pharm-detail-action" href={`tel:${phoneContact}`}>Call</a>
          ) : null}
          {directionsUrl ? (
            <a className="pharm-detail-action" href={directionsUrl} target="_blank" rel="noreferrer">Directions</a>
          ) : null}
          {emailContact ? (
            <a className="pharm-detail-action" href={`mailto:${emailContact}`}>Email</a>
          ) : null}
        </div>

        <Section title="License" empty={!(pharmacy.licenseNumber || pharmacy.pharmacyCode)}>
          <ul className="pharm-detail-list">
            {pharmacy.licenseNumber || pharmacy.pharmacyCode ? (
              <li className="pharm-detail-list-item">
                <div className="pharm-detail-list-title">DDA registration</div>
                <div className="pharm-detail-list-copy">{pharmacy.licenseNumber || pharmacy.pharmacyCode}</div>
              </li>
            ) : null}
            {pharmacy.pharmacyType ? (
              <li className="pharm-detail-list-item">
                <div className="pharm-detail-list-title">Pharmacy type</div>
                <div className="pharm-detail-list-copy">{pharmacy.pharmacyType}</div>
                {pharmacy.systemType && pharmacy.systemType !== pharmacy.pharmacyType ? (
                  <div className="pharm-detail-list-meta">{pharmacy.systemType}</div>
                ) : null}
              </li>
            ) : null}
            <li className="pharm-detail-list-item">
              <div className="pharm-detail-list-title">Verification</div>
              <div className="pharm-detail-list-copy">
                {pharmacy.isVerified ? 'Verified on eMedicalls' : 'Listed from DDA registry'}
              </div>
            </li>
          </ul>
        </Section>

        <Section title="Contact" empty={!(phoneContact || emailContact || pharmacy.fullAddress || pharmacy.address)}>
          <ul className="pharm-detail-list">
            {phoneContact ? (
              <li className="pharm-detail-list-item">
                <div className="pharm-detail-list-title">Phone</div>
                <a className="pharm-detail-link" href={`tel:${phoneContact}`}>{phoneContact}</a>
              </li>
            ) : null}
            {emailContact ? (
              <li className="pharm-detail-list-item">
                <div className="pharm-detail-list-title">Email</div>
                <a className="pharm-detail-link" href={`mailto:${emailContact}`}>{emailContact}</a>
              </li>
            ) : null}
            {pharmacy.fullAddress || pharmacy.address ? (
              <li className="pharm-detail-list-item">
                <div className="pharm-detail-list-title">Address</div>
                <div className="pharm-detail-list-copy">{pharmacy.fullAddress || pharmacy.address}</div>
                {directionsUrl ? (
                  <a className="pharm-detail-link" href={directionsUrl} target="_blank" rel="noreferrer">
                    Get directions
                  </a>
                ) : null}
              </li>
            ) : null}
          </ul>
        </Section>

        <Section title="Opening hours" empty={!hours.length} emptyTitle="Hours not published yet.">
          {hours.length ? (
            <ul className="pharm-detail-hours">
              {hours.map((row) => (
                <li key={row.id || row.dayOfWeek} className={`pharm-detail-hours-row ${row.isClosed ? 'is-closed' : ''}`}>
                  <span>{row.dayLabel}</span>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Services" empty={!services.length} emptyTitle="Services will appear here when published.">
          {services.length ? (
            <ul className="pharm-detail-list">
              {services.map((svc) => (
                <li key={svc.id} className="pharm-detail-list-item">
                  <div className="pharm-detail-list-title">{svc.name}</div>
                  {svc.description ? <p className="pharm-detail-list-copy">{svc.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Location" empty={!mapEmbedUrl} emptyTitle="Map unavailable for this pharmacy.">
          {mapEmbedUrl ? (
            <div className="pharm-detail-map">
              <iframe
                title="Pharmacy location"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
        </Section>

        <Section title="Gallery" empty={!galleryImages.length} emptyTitle="No photos published yet.">
          {galleryImages.length ? (
            <button
              type="button"
              className="pharm-detail-gallery"
              onClick={() => setGalleryOpen(true)}
              aria-label="Open gallery"
            >
              {galleryImages.slice(0, 4).map((src) => (
                <img key={src} src={src} alt="" className="pharm-detail-gallery-img" />
              ))}
              {galleryImages.length > 4 ? (
                <span className="pharm-detail-gallery-more">+{galleryImages.length - 4}</span>
              ) : null}
            </button>
          ) : null}
        </Section>

        <section className="pharm-detail-section">
          <h2 className="pharm-detail-section-title">Order & prescriptions</h2>
          <div className="pharm-detail-future">
            <p>Medicine ordering and prescription upload are coming soon for this pharmacy.</p>
            <button type="button" className="pharm-detail-future-btn" onClick={() => showDemoPreview?.()}>
              Upload prescription
            </button>
          </div>
        </section>
      </div>

      <div className="app-flow-footer">
        <button type="button" className="app-flow-cta" onClick={() => showDemoPreview?.()}>
          Order medicine
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      <GalleryLightbox
        images={galleryImages}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}
