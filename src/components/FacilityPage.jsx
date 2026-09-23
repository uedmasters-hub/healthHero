import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchFacilityPage, mapsDirectionsUrl } from '../features/providers'
import { formatPlaceParts } from '../features/geography/formatPlace'
import DoctorCard from './DoctorCard'
import GalleryLightbox from './GalleryLightbox'
import EmptyState from './EmptyState'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { flowState } from '../lib/careFlow'
import './FacilityPage.css'

function FacilitySkeleton() {
  return (
    <div className="facility-skel" aria-hidden="true">
      <div className="facility-skel-hero shimmer" />
      <div className="facility-skel-block shimmer" />
      <div className="facility-skel-block is-mid shimmer" />
      <div className="facility-skel-row">
        <div className="facility-skel-chip shimmer" />
        <div className="facility-skel-chip shimmer" />
        <div className="facility-skel-chip shimmer" />
      </div>
      <div className="facility-skel-card shimmer" />
      <div className="facility-skel-card shimmer" />
    </div>
  )
}

function Section({ title, children, empty, emptyTitle }) {
  if (!children && empty) {
    return (
      <section className="facility-section">
        <h2 className="facility-section-title">{title}</h2>
        <p className="facility-section-empty">{emptyTitle || 'Nothing listed yet.'}</p>
      </section>
    )
  }
  if (!children) return null
  return (
    <section className="facility-section">
      <h2 className="facility-section-title">{title}</h2>
      {children}
    </section>
  )
}

export default function FacilityPage() {
  const { centerId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = usePushBack(-1)
  const scrollRef = useRef(null)
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    dataset: 'facility:detail',
  })

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const load = useCallback(async () => {
    if (!centerId) {
      setStatus('error')
      setError('Missing facility id')
      setPayload(null)
      return
    }
    setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'))
    const next = await fetchFacilityPage(centerId)
    if (next.error || !next.facility) {
      setStatus('error')
      setError(next.error || 'Facility not found')
      setPayload(next)
      return
    }
    setPayload(next)
    setError(null)
    setStatus('ready')
  }, [centerId])

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => { cancelled = true }
  }, [load])

  const ptr = usePullToRefresh(scrollRef, load)

  const facility = payload?.facility || null
  const hours = payload?.hours || []
  const departments = payload?.departments || []
  const services = payload?.services || []
  const contacts = payload?.contacts || []
  const media = payload?.media || []
  const doctors = payload?.doctors || []

  const galleryImages = useMemo(() => {
    const fromMedia = media.map((m) => m.url).filter(Boolean)
    if (fromMedia.length) return fromMedia
    if (facility?.imageUrl) return [facility.imageUrl]
    if (facility?.logoUrl) return [facility.logoUrl]
    return []
  }, [media, facility])

  const directionsUrl = useMemo(() => mapsDirectionsUrl(facility), [facility])

  const phoneContact = contacts.find((c) => c.kind === 'phone')?.value || facility?.phone
  const emailContact = contacts.find((c) => c.kind === 'email')?.value || facility?.email
  const todayHours = useMemo(() => {
    const today = new Date().getDay()
    return hours.find((h) => h.dayOfWeek === today) || null
  }, [hours])

  const subtitle = [
    facility?.facilityLevel || facility?.type,
    formatPlaceParts(facility?.city, facility?.district) || facility?.city,
  ].filter(Boolean).join(' · ')

  const openDoctor = (doctor) => {
    navigate(`/doctor/${doctor.id}`, {
      state: flowState(location, {
        origin: 'facility',
        returnTo: `/centers/${centerId}`,
        centerId,
      }),
    })
  }

  const bookFacility = () => {
    if (doctors[0]) {
      navigate('/booking/slot', {
        state: flowState(location, {
          doctor: doctors[0],
          origin: 'facility',
          returnTo: `/centers/${centerId}`,
          centerId,
        }),
      })
      return
    }
    navigate('/booking', {
      state: flowState(location, {
        origin: 'facility',
        returnTo: `/centers/${centerId}`,
        centerId,
      }),
    })
  }

  if (status === 'loading') {
    return (
      <div className="facility-page page-push-in">
        <header className="facility-header">
          <button type="button" className="facility-back" data-push-back onClick={goBack} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="facility-header-title">Facility</h1>
          <span className="facility-header-spacer" />
        </header>
        <div className="facility-scroll">
          <FacilitySkeleton />
        </div>
      </div>
    )
  }

  if (status === 'error' || !facility) {
    return (
      <div className="facility-page page-push-in">
        <header className="facility-header">
          <button type="button" className="facility-back" data-push-back onClick={goBack} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="facility-header-title">Facility</h1>
          <span className="facility-header-spacer" />
        </header>
        <div className="facility-scroll facility-scroll-empty">
          <EmptyState
            image="/img/empty_state/hospital.png"
            alt=""
            title="Facility unavailable"
            message={error || 'We could not load this healthcare center from the registry.'}
          />
          <button type="button" className="facility-retry" onClick={load}>
            Try again
          </button>
          <button type="button" className="facility-link-btn" onClick={() => navigate('/centers')}>
            Back to centers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="facility-page page-push-in has-cta">
      <header className="facility-header">
        <button type="button" className="facility-back" data-push-back onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="facility-header-title">Facility</h1>
        <span className="facility-header-spacer" />
      </header>

      <div className="facility-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing || status === 'refreshing'} />

        <RevealItem
          className="facility-hero"
          revealed={isRevealed(0)}
          cached={isCached}
          ref={setItemRef(0)}
        >
          <div className="facility-hero-media">
            {facility.image ? (
              <img src={facility.image} alt="" className="facility-hero-img" />
            ) : (
              <div className="facility-hero-placeholder" aria-hidden="true" />
            )}
          </div>
          <div className="facility-hero-body">
            <div className="facility-hero-chips">
              {facility.verificationStatus === 'verified' ? (
                <span className="facility-chip is-verified">Verified</span>
              ) : null}
              {facility.hfCode ? (
                <span className="facility-chip">HF {facility.hfCode}</span>
              ) : null}
              {facility.facilityLevel || facility.type ? (
                <span className="facility-chip">{facility.facilityLevel || facility.type}</span>
              ) : null}
            </div>
            <h2 className="facility-name">{facility.name}</h2>
            {subtitle ? <p className="facility-subtitle">{subtitle}</p> : null}
            <div className="facility-meta-row">
              {facility.rating != null ? (
                <span className="facility-rating">
                  <span aria-hidden="true">★</span>
                  {Number(facility.rating).toFixed(1)}
                  {facility.ratingCount ? (
                    <span className="facility-rating-count">({facility.ratingCount})</span>
                  ) : null}
                </span>
              ) : null}
              {facility.fullAddress || facility.address ? (
                <span className="facility-location">{facility.fullAddress || facility.address}</span>
              ) : null}
            </div>
            {todayHours ? (
              <p className="facility-today">
                Today · {todayHours.isClosed ? 'Closed' : todayHours.label}
              </p>
            ) : null}
          </div>
        </RevealItem>

        <div className="facility-actions">
          {phoneContact ? (
            <a className="facility-action" href={`tel:${phoneContact}`}>
              Call
            </a>
          ) : null}
          {directionsUrl ? (
            <a className="facility-action" href={directionsUrl} target="_blank" rel="noreferrer">
              Directions
            </a>
          ) : null}
          {facility.website ? (
            <a className="facility-action" href={facility.website} target="_blank" rel="noreferrer">
              Website
            </a>
          ) : null}
        </div>

        <Section title="Departments" empty={!departments.length} emptyTitle="No departments listed yet.">
          {departments.length ? (
            <ul className="facility-list">
              {departments.map((dept) => (
                <li key={dept.id} className="facility-list-item">
                  <div className="facility-list-title">{dept.name}</div>
                  {dept.description ? <p className="facility-list-copy">{dept.description}</p> : null}
                  <div className="facility-list-meta">
                    {dept.floor != null ? <span>Floor {dept.floor}</span> : null}
                    {dept.phone ? <span>{dept.phone}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Services" empty={!services.length} emptyTitle="No services published yet.">
          {services.length ? (
            <ul className="facility-list">
              {services.map((svc) => (
                <li key={svc.id} className="facility-list-item">
                  <div className="facility-list-title-row">
                    <div className="facility-list-title">{svc.name}</div>
                    {svc.fee != null ? (
                      <span className="facility-fee">
                        {svc.currency} {svc.fee}
                      </span>
                    ) : null}
                  </div>
                  {svc.description ? <p className="facility-list-copy">{svc.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Doctors" empty={!doctors.length} emptyTitle="No doctors linked to this facility yet.">
          {doctors.length ? (
            <div className="facility-doctors">
              {doctors.map((doctor, index) => (
                <RevealItem
                  key={doctor.id}
                  className="facility-doctor-wrap"
                  revealed={isRevealed(index + 1)}
                  cached={isCached}
                  ref={setItemRef(index + 1)}
                >
                  <DoctorCard
                    doctor={doctor}
                    variant="list"
                    onClick={() => openDoctor(doctor)}
                  />
                </RevealItem>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title="Opening hours" empty={!hours.length} emptyTitle="Hours not published yet.">
          {hours.length ? (
            <ul className="facility-hours">
              {hours.map((row) => (
                <li key={row.id || row.dayOfWeek} className={`facility-hours-row ${row.isClosed ? 'is-closed' : ''}`}>
                  <span>{row.dayLabel}</span>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section
          title="Contact"
          empty={!(phoneContact || emailContact || contacts.length || facility.fullAddress || facility.address)}
          emptyTitle="No contact details published yet."
        >
          {(phoneContact || emailContact || contacts.length || facility.fullAddress || facility.address) ? (
            <ul className="facility-list">
              {phoneContact ? (
                <li className="facility-list-item">
                  <div className="facility-list-title">Phone</div>
                  <a className="facility-inline-link" href={`tel:${phoneContact}`}>{phoneContact}</a>
                </li>
              ) : null}
              {emailContact ? (
                <li className="facility-list-item">
                  <div className="facility-list-title">Email</div>
                  <a className="facility-inline-link" href={`mailto:${emailContact}`}>{emailContact}</a>
                </li>
              ) : null}
              {contacts
                .filter((c) => c.kind !== 'phone' && c.kind !== 'email')
                .map((c) => (
                  <li key={c.id} className="facility-list-item">
                    <div className="facility-list-title">{c.label}</div>
                    <div className="facility-list-copy">{c.value}</div>
                  </li>
                ))}
              {facility.fullAddress || facility.address ? (
                <li className="facility-list-item">
                  <div className="facility-list-title">Address</div>
                  <div className="facility-list-copy">{facility.fullAddress || facility.address}</div>
                  {directionsUrl ? (
                    <a className="facility-inline-link" href={directionsUrl} target="_blank" rel="noreferrer">
                      Get directions
                    </a>
                  ) : null}
                </li>
              ) : null}
            </ul>
          ) : null}
        </Section>

        <Section title="Gallery" empty={!galleryImages.length} emptyTitle="No photos published yet.">
          {galleryImages.length ? (
            <button
              type="button"
              className="facility-gallery"
              onClick={() => setGalleryOpen(true)}
              aria-label="Open gallery"
            >
              {galleryImages.slice(0, 4).map((src) => (
                <img key={src} src={src} alt="" className="facility-gallery-img" />
              ))}
              {galleryImages.length > 4 ? (
                <span className="facility-gallery-more">+{galleryImages.length - 4}</span>
              ) : null}
            </button>
          ) : null}
        </Section>

        {facility.parentName ? (
          <section className="facility-section">
            <h2 className="facility-section-title">Parent facility</h2>
            <p className="facility-list-copy">
              {facility.parentName}
              {facility.parentHfCode ? ` · HF ${facility.parentHfCode}` : ''}
            </p>
          </section>
        ) : null}
      </div>

      <div className="app-flow-footer">
        <button type="button" className="app-flow-cta" onClick={bookFacility}>
          Book appointment
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
