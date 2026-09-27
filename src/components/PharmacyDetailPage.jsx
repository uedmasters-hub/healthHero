import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchPharmacyPage,
  mapsPharmacyDirectionsUrl,
} from '../features/providers/pharmaciesRepository'
import { getDoctorReviewSummary, placeReviewKey } from '../data/reviews'
import { pharmacyDisplayTitle } from '../lib/pharmacyModel'
import { formatMoney } from '../lib/paymentSession'
import { flowState } from '../lib/careFlow'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import GalleryLightbox from './GalleryLightbox'
import EmptyState from './EmptyState'
import { galleryFor, mapEmbedUrl } from './profile/placeMedia'
import { PharmacyHeroCard, ProfileGallery, ProfileHeader, ProfileMap, ProfileRatings } from './profile/placeProfile'
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
        </div>
      </div>
    </div>
  )
}

export default function PharmacyDetailPage() {
  const { pharmacyId } = useParams()
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
  const displayName = pharmacyDisplayTitle(pharmacy)
  const address = pharmacy?.fullAddress || pharmacy?.address || pharmacy?.locationLabel || ''
  const kind = pharmacy?.pharmacyType || pharmacy?.systemType || 'Pharmacy'
  const reviews = useMemo(() => getDoctorReviewSummary(placeReviewKey('pharmacy', pharmacyId)), [pharmacyId])
  const rating = reviews.total
    ? reviews.rating
    : (pharmacy?.rating != null && Number(pharmacy.rating) > 0 ? Number(pharmacy.rating).toFixed(1) : null)
  const phoneContact = contacts.find((item) => item.kind === 'phone')?.value || pharmacy?.phone
  const emailContact = contacts.find((item) => item.kind === 'email')?.value || pharmacy?.email
  const directionsUrl = useMemo(() => mapsPharmacyDirectionsUrl(pharmacy), [pharmacy])
  const embedUrl = useMemo(() => mapEmbedUrl(pharmacy), [pharmacy])

  const galleryImages = useMemo(
    () => galleryFor((payload?.media || []).map((item) => item.url), pharmacy?.image || pharmacy?.logoUrl),
    [payload, pharmacy],
  )

  const about = pharmacy
    ? [
      `${displayName} is a registered ${kind.toLowerCase()} on eMedicalls.`,
      address || null,
      pharmacy.ddaVerifiedLabel || (pharmacy.isVerified ? 'DDA verified.' : null),
      pharmacy.delivers ? 'This pharmacy delivers.' : null,
    ].filter(Boolean).join(' ')
    : ''

  const shareProfile = useCallback(async () => {
    const url = window.location.href
    const title = displayName ? `${displayName} on eMedicalls` : 'Pharmacy on eMedicalls'
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Check out ${displayName} on eMedicalls`, url })
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
  }, [displayName])

  const openShop = () => {
    const storePath = `/pharmacy/store/${pharmacyId}`
    if (location.state?.returnTo === storePath) {
      goBack()
      return
    }
    navigate(storePath, {
      state: flowState(location, {
        origin: 'pharmacy-profile',
        returnTo: `/pharmacy/${pharmacyId}`,
        storeName: displayName,
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
        <ProfileHeader title="Pharmacy Profile" onBack={goBack} />
        <div className="profile-scroll is-loading">
          <ProfileSkeletons />
        </div>
      </div>
    )
  }

  if (status === 'error' || !pharmacy) {
    return (
      <div className="doctor-profile page-push-in">
        <ProfileHeader title="Pharmacy Profile" onBack={goBack} />
        <div className="profile-scroll">
          <div className="profile-section">
            <EmptyState
              image="/img/empty_state/hospital.png"
              alt=""
              title="Pharmacy unavailable"
              message={error || 'We could not load this pharmacy from the registry.'}
            />
            <button type="button" className="view-all-reviews" onClick={load}>Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="doctor-profile page-push-in has-cta">
      <ProfileHeader title="Pharmacy Profile" onBack={goBack} actions={headerActions} />

      <div className="profile-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing || status === 'refreshing'} />

        <div className="profile-hero-card">
          <PharmacyHeroCard pharmacy={pharmacy} />
        </div>

        <div className="profile-body is-ready">
          <div className="profile-section">
            <div className="profile-section-label">About</div>
            <p className="profile-about-text">{about}</p>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <strong>{services.length}</strong>
              <span>Services</span>
            </div>
            <div className="profile-stat">
              <strong>{hours.length || '—'}</strong>
              <span>Open days</span>
            </div>
            <div className="profile-stat">
              <strong>{rating || '—'}</strong>
              <span>Rating</span>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Services</div>
            {services.length ? (
              <div className="specialty-grid">
                {services.slice(0, 8).map((item, index) => (
                  <div className="specialty-tag" key={item.id || item.name}>
                    <div className="specialty-tag-icon" style={{ background: TAG_BACKGROUNDS[index % TAG_BACKGROUNDS.length] }}>
                      {String(item.name || '•').slice(0, 1)}
                    </div>
                    {item.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-about-text">No services published yet.</p>
            )}
          </div>

          {services.some((item) => item.fee != null || item.description) ? (
            <div className="profile-section">
              <div className="profile-section-label">Service details</div>
              {services.map((item) => (
                <div className="center-card" key={`detail-${item.id}`} style={{ cursor: 'default' }}>
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
          </div>

          <ProfileMap name={displayName} embedUrl={embedUrl} directionsUrl={directionsUrl} />

          <ProfileGallery images={galleryImages} onOpen={() => setGalleryOpen(true)} />

          <ProfileRatings
            summary={reviews}
            onViewAll={() => navigate(`/pharmacy/${pharmacyId}/reviews`, {
              state: flowState(location, {
                returnTo: `/pharmacy/${pharmacyId}`,
                subjectName: displayName,
              }),
            })}
          />

          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </div>
      </div>

      <div className="app-flow-footer">
        <button type="button" className="app-flow-cta" onClick={openShop}>
          Shop this pharmacy
        </button>
      </div>

      <GalleryLightbox images={galleryImages} isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  )
}
