import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchFacilityPage, mapsDirectionsUrl } from '../features/providers'
import { getDoctorReviewSummary, placeReviewKey } from '../data/reviews'
import { formatMoney } from '../lib/paymentSession'
import { flowState } from '../lib/careFlow'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import DoctorCard from './DoctorCard'
import GalleryLightbox from './GalleryLightbox'
import EmptyState from './EmptyState'
import ProviderAvatar from './ProviderAvatar'
import { galleryFor, mapEmbedUrl } from './profile/placeMedia'
import { ProfileGallery, ProfileHeader, ProfileMap, ProfileRatings } from './profile/placeProfile'
import './DoctorProfile.css'
import './DoctorCard.css'

const TAG_BACKGROUNDS = ['#DBEAFE', '#D1FAE5', '#EDE9FE', '#FFEDD5']

function ProfileSkeletons() {
  return (
    <div className="profile-skeletons" aria-hidden="true">
      <div className="profile-section">
        <div className="profile-skel-label shimmer" />
        <div className="profile-skel-line shimmer" />
        <div className="profile-skel-line is-mid shimmer" />
      </div>
      <div className="profile-stats">
        <div className="profile-stat shimmer" />
        <div className="profile-stat shimmer" />
        <div className="profile-stat shimmer" />
      </div>
      <div className="profile-section">
        <div className="profile-skel-label shimmer" />
        <div className="profile-skel-tags">
          <div className="profile-skel-tag shimmer" />
          <div className="profile-skel-tag shimmer" />
          <div className="profile-skel-tag shimmer" />
          <div className="profile-skel-tag shimmer" />
        </div>
      </div>
    </div>
  )
}

export default function FacilityPage() {
  const { centerId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = usePushBack(-1)
  const scrollRef = useRef(null)

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

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
  const doctors = payload?.doctors || []

  const galleryImages = useMemo(
    () => galleryFor((payload?.media || []).map((item) => item.url), facility?.image),
    [payload, facility],
  )
  const reviews = useMemo(() => getDoctorReviewSummary(placeReviewKey('facility', centerId)), [centerId])
  const directionsUrl = useMemo(() => mapsDirectionsUrl(facility), [facility])
  const embedUrl = useMemo(() => mapEmbedUrl(facility), [facility])
  const phoneContact = contacts.find((item) => item.kind === 'phone')?.value || facility?.phone
  const emailContact = contacts.find((item) => item.kind === 'email')?.value || facility?.email
  const address = facility?.fullAddress || facility?.address || ''
  const subtitle = facility?.classification || facility?.facilityLevel || facility?.type || ''
  const rating = reviews.total
    ? reviews.rating
    : (facility?.rating != null && Number(facility.rating) > 0 ? Number(facility.rating).toFixed(1) : null)
  const lowestFee = services.reduce((min, item) => {
    if (item.fee == null || !Number.isFinite(item.fee)) return min
    return min == null || item.fee < min ? item.fee : min
  }, null)

  const tags = (departments.length ? departments : services).slice(0, 8)
  const about = facility
    ? [
      `${facility.name} is listed as a ${subtitle || 'healthcare center'}.`,
      address || null,
      facility.verificationStatus === 'verified' ? 'Verified on the health facility registry.' : null,
    ].filter(Boolean).join(' ')
    : ''

  const shareProfile = useCallback(async () => {
    const url = window.location.href
    const title = facility?.name ? `${facility.name} on eMedicalls` : 'Healthcare center on eMedicalls'
    const text = subtitle
      ? `Check out ${facility.name}, ${subtitle}, on eMedicalls`
      : 'Check out this healthcare center on eMedicalls'
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard?.writeText(url)
    } catch {
      /* ignore */
    }
  }, [facility, subtitle])

  const bookFacility = () => {
    if (doctors[0]) {
      navigate('/booking/slot', {
        state: flowState(null, {
          doctor: doctors[0],
          origin: 'facility',
          returnTo: `/centers/${centerId}`,
          centerId,
        }),
      })
      return
    }
    navigate('/booking', {
      state: flowState(null, {
        origin: 'facility',
        returnTo: `/centers/${centerId}`,
        centerId,
      }),
    })
  }

  const headerActions = (
    <>
      <button className="ds-icon-btn is-subtle is-md" type="button" aria-label="Share" onClick={shareProfile}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>
      <button
        className={`ds-icon-btn is-subtle is-md ${isFavorite ? 'is-danger' : ''}`}
        type="button"
        onClick={() => setIsFavorite((value) => !value)}
        aria-label="Favorite"
        aria-pressed={isFavorite}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </>
  )

  if (status === 'loading') {
    return (
      <div className="doctor-profile is-skeleton has-cta">
        <ProfileHeader title="Healthcare Profile" onBack={goBack} />
        <div className="profile-scroll is-loading">
          <ProfileSkeletons />
        </div>
      </div>
    )
  }

  if (status === 'error' || !facility) {
    return (
      <div className="doctor-profile">
        <ProfileHeader title="Healthcare Profile" onBack={goBack} />
        <div className="profile-scroll">
          <div className="profile-section">
            <EmptyState
              image="/img/empty_state/hospital.png"
              alt=""
              title="Facility unavailable"
              message={error || 'We could not load this healthcare center from the registry.'}
            />
            <button type="button" className="view-all-reviews" onClick={load}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="doctor-profile has-cta">
      <ProfileHeader title="Healthcare Profile" onBack={goBack} actions={headerActions} />

      <div className="profile-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing || status === 'refreshing'} />

        <div className="profile-hero-card">
          <div className="dc-card dc-card-profile ds-card">
            <div className="dc-profile-photo">
              <ProviderAvatar
                name={facility.name}
                src={facility.image || null}
                useCatalogFallback={false}
                imgClassName="dc-profile-photo-img"
                alt=""
              />
            </div>
            <div className="dc-profile-copy">
              <div className="dc-title-row">
                <h3 className="dc-name">{facility.name}</h3>
                {rating ? (
                  <span className="dc-rating">
                    <span className="dc-star" aria-hidden="true">★</span>
                    {rating}
                  </span>
                ) : null}
              </div>
              {subtitle ? <p className="dc-specialty">{subtitle}</p> : null}
              {facility.hfCode ? <p className="dc-degree">HF {facility.shortHfCode || facility.hfCode}</p> : null}
              {lowestFee != null ? (
                <p className="dc-fee">
                  <strong>{formatMoney(lowestFee)}*</strong> Starting fee
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="profile-body is-ready">
          <div className="profile-section">
            <div className="profile-section-label">About</div>
            <p className="profile-about-text">{about}</p>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <strong>{departments.length}</strong>
              <span>Departments</span>
            </div>
            <div className="profile-stat">
              <strong>{services.length}</strong>
              <span>Services</span>
            </div>
            <div className="profile-stat">
              <strong>{rating || '—'}</strong>
              <span>Rating</span>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-label">{departments.length ? 'Departments' : 'Services'}</div>
            {tags.length ? (
              <div className="specialty-grid">
                {tags.map((item, index) => (
                  <div className="specialty-tag" key={item.id || item.name}>
                    <div className="specialty-tag-icon" style={{ background: TAG_BACKGROUNDS[index % TAG_BACKGROUNDS.length] }}>
                      {String(item.name || '•').slice(0, 1)}
                    </div>
                    {item.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-about-text">No departments listed yet.</p>
            )}
          </div>

          {services.length && departments.length ? (
            <div className="profile-section">
              <div className="profile-section-label">Services</div>
              {services.map((item) => (
                <div className="center-card" key={item.id} style={{ cursor: 'default' }}>
                  <div className="center-info">
                    <div className="center-name">{item.name}</div>
                    {item.description ? <div className="center-address">{item.description}</div> : null}
                  </div>
                  {item.fee != null ? <div className="center-distance">{formatMoney(item.fee)}</div> : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="profile-section">
            <div className="profile-section-label">Opening hours</div>
            {hours.length ? hours.map((row) => (
              <div className="center-card" key={row.id || row.dayOfWeek} style={{ cursor: 'default' }}>
                <div className="center-info">
                  <div className="center-name">{row.dayLabel}</div>
                  <div className="center-address">{row.isClosed ? 'Closed' : row.label}</div>
                </div>
              </div>
            )) : (
              <p className="profile-about-text">Hours not published yet.</p>
            )}
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Contact</div>
            {phoneContact ? (
              <a className="center-card" href={`tel:${phoneContact}`}>
                <div className="center-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="center-info">
                  <div className="center-name">Phone</div>
                  <div className="center-address">{phoneContact}</div>
                </div>
              </a>
            ) : null}
            {emailContact ? (
              <a className="center-card" href={`mailto:${emailContact}`}>
                <div className="center-info">
                  <div className="center-name">Email</div>
                  <div className="center-address">{emailContact}</div>
                </div>
              </a>
            ) : null}
            {!phoneContact && !emailContact && !embedUrl ? (
              <p className="profile-about-text">No contact details published yet.</p>
            ) : null}
            {facility.parentName ? (
              <div className="center-card" style={{ cursor: 'default' }}>
                <div className="center-info">
                  <div className="center-name">Parent facility</div>
                  <div className="center-address">
                    {facility.parentName}
                    {facility.parentHfCode ? ` · HF ${facility.parentHfCode}` : ''}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <ProfileMap name={facility.name} embedUrl={embedUrl} directionsUrl={directionsUrl} />

          <ProfileGallery images={galleryImages} onOpen={() => setGalleryOpen(true)} />

          <ProfileRatings
            summary={reviews}
            onViewAll={() => navigate(`/centers/${centerId}/reviews`, {
              state: flowState(location, {
                returnTo: `/centers/${centerId}`,
                subjectName: facility.name,
              }),
            })}
          />

          <div className="profile-section">
            <div className="profile-section-label">Doctors</div>
            {doctors.length ? (
              <div className="profile-consultants">
                {doctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    variant="grid"
                    hideBook
                    origin="facility"
                    returnTo={`/centers/${centerId}`}
                  />
                ))}
              </div>
            ) : (
              <p className="profile-about-text">No doctors linked to this facility yet.</p>
            )}
          </div>

          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </div>
      </div>

      <div className="app-flow-footer">
        <button type="button" className="app-flow-cta" onClick={bookFacility}>
          Book appointment
        </button>
      </div>

      <GalleryLightbox images={galleryImages} isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  )
}
