import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getDoctorById, getDoctorList, getDoctorPhoto, fetchProviderById, queryProviders, subscribeProviders, pickDoctorCredentials } from '../features/providers'
import { formatPlaceParts } from '../features/geography/formatPlace'
import { getDoctorReviewSummary } from '../data/reviews'
import { flowState, goBackToOrigin } from '../lib/careFlow'
import { getSlotWindow } from '../lib/bookingPolicy'
import { resolveVisitType } from '../lib/serviceActions'
import { VISIT_TYPES, generateDates } from './DatePicker'
import WeeklySchedule from './WeeklySchedule'
import { useTransition } from './PageTransition'
import { useSharedHero } from './SharedHero'
import DoctorCard from './DoctorCard'
import GalleryLightbox from './GalleryLightbox'
import { useRegisteredScroller, useScrollLock } from '../hooks/useScrollLock'
import { markDoctorViewed } from '../lib/recentDoctors'
import useNow from '../hooks/useNow'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshDoctorsData } from '../features/sync/pageRefresh'
import './DoctorProfile.css'

const LOGO_BADGES = [
  '/img/logo-badges/LogoBadge-1.png',
  '/img/logo-badges/LogoBadge-2.png',
  '/img/logo-badges/LogoBadge-03.png',
  '/img/logo-badges/LogoBadge-04.png',
  '/img/logo-badges/LogoBadge-05.png',
]

const GALLERY_IMAGES = [
  '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
  '/img/clinic/martha-dominguez-de-gouveia-KF-h9HMxRKg-unsplash.jpg',
  '/img/clinic/adhy-savala-zbpgmGe27p8-unsplash.jpg',
  '/img/clinic/akram-huseyn-V_0ES17m9Tc-unsplash.jpg',
  '/img/clinic/sander-sammy-38Un6Oi5beE-unsplash.jpg',
]

const defaultSpecialties = [
  { name: 'General Checkup', icon: '🩺', bg: '#DBEAFE' },
  { name: 'Consultation', icon: '💬', bg: '#D1FAE5' },
]

const defaultCenters = [
  { name: 'City Hospital', address: 'Kathmandu, Nepal', distance: '2.0 km' },
]

function yearsFromExperience(experience = '') {
  const n = parseInt(experience, 10)
  return Number.isFinite(n) ? n : 10
}

function casesLabel(total) {
  if (!total) return '120+'
  if (total >= 200) return '200+'
  return `${Math.max(50, Math.round(total / 10) * 10)}+`
}

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
      <div className="profile-section">
        <div className="profile-skel-label shimmer" />
        <div className="profile-skel-dates shimmer" />
      </div>
      <div className="profile-section">
        <div className="profile-skel-label shimmer" />
        <div className="profile-skel-center shimmer" />
      </div>
    </div>
  )
}

export default function DoctorProfile() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { openTopDoctors, openSpecialisations } = useTransition()
  const { guard, modal } = useDuplicateBookingGuard()
  const shared = useSharedHero()
  const origin = location.state?.origin
  const preferredVisitType = location.state?.preferredVisitType
  const restore = location.state?.restore
  const [registryDoctor, setRegistryDoctor] = useState(() => getDoctorById(id))
  const heroRef = useRef(null)

  useEffect(() => {
    if (id) markDoctorViewed(id)
  }, [id])

  useEffect(() => {
    let cancelled = false
    const cached = getDoctorById(id)
    if (cached) setRegistryDoctor(cached)
    // Always revalidate against live public.providers so nmc_number/degree are current.
    fetchProviderById(id, { force: true }).then((row) => {
      if (!cancelled && row) setRegistryDoctor(row)
    })
    return subscribeProviders(() => {
      const next = getDoctorById(id)
      if (next) setRegistryDoctor(next)
    })
  }, [id])

  const pageRef = useRef(null)
  useRegisteredScroller('profile', pageRef)
  const onRefresh = useCallback(() => refreshDoctorsData(), [])
  const ptr = usePullToRefresh(pageRef, onRefresh, {
    enabled: !shared?.morphing,
  })
  const now = useNow(15000)
  const [peerDoctors, setPeerDoctors] = useState(() => getDoctorList())

  useEffect(() => {
    const specialty = registryDoctor?.specialty
    if (!specialty) return undefined
    let cancelled = false
    queryProviders({ specialty, page: 0, pageSize: 8, sort: 'rating' }).then((res) => {
      if (!cancelled) setPeerDoctors(res.doctors)
    })
    return () => { cancelled = true }
  }, [registryDoctor?.specialty])

  const dbDoctor = registryDoctor
  const liveCreds = dbDoctor ? pickDoctorCredentials(dbDoctor) : null
  const doctor = dbDoctor ? {
    id: dbDoctor.id,
    providerUuid: dbDoctor.providerUuid,
    name: dbDoctor.name,
    shortName: dbDoctor.shortName,
    specialty: dbDoctor.specialty,
    rating: dbDoctor.rating,
    experience: dbDoctor.experience,
    address: formatPlaceParts(dbDoctor.address),
    color: dbDoctor.color,
    initial: dbDoctor.initial,
    visitTypes: dbDoctor.visitTypes,
    fee: dbDoctor.fee,
    photo: dbDoctor.photo || getDoctorPhoto(dbDoctor.id),
    phone: dbDoctor.phone || '',
    about: dbDoctor.about || `${dbDoctor.name} is a registered ${dbDoctor.specialty} on the eMedicalls provider registry.`,
    specialties: dbDoctor.specialties || defaultSpecialties,
    centers: dbDoctor.primaryCenterName
      ? [{ name: dbDoctor.primaryCenterName, address: formatPlaceParts(dbDoctor.address) || 'Nepal', distance: '' }]
      : (dbDoctor.centers || defaultCenters),
    reviews: getDoctorReviewSummary(dbDoctor.id),
    nmcNumber: liveCreds.nmcNumber,
    degree: liveCreds.degree,
    isVerified: dbDoctor.isVerified,
  } : null

  const bookingDoctor = doctor ? {
    ...doctor,
    name: doctor.name,
    photo: doctor.photo,
  } : null

  const otherConsultants = (peerDoctors || [])
    .filter((item) => String(item.providerUuid || item.id) !== String(doctor?.providerUuid || doctor?.id))
    .slice(0, 4)
    .map((item) => ({
      ...item,
      name: item.name?.startsWith('Dr') ? item.name : `Dr. ${item.name}`,
    }))

  const [isFavorite, setIsFavorite] = useState(false)
  const [scheduleType, setScheduleType] = useState(() => location.state?.visitType || resolveVisitType(preferredVisitType, dbDoctor?.visitTypes))
  const [selectedDate, setSelectedDate] = useState(() => location.state?.date || generateDates({ count: 7 })[0])
  const [selectedTime, setSelectedTime] = useState(() => location.state?.time || null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const profileIdRef = useRef(id)

  const sharedFlow = shared?.active && doctor && String(shared.doctor?.id) === String(doctor.id)
  const hideHero = sharedFlow && shared.phase !== 'settled' && shared.phase !== 'hero-settled'
  const contentReady = Boolean(doctor?.id) && (!sharedFlow || shared.phase !== 'preparing')
  const showSkeletons = !doctor || (sharedFlow && shared.phase === 'preparing')
  useScrollLock('profile', showSkeletons)
  const previewReviews = doctor?.reviews?.items?.slice(0, 2) || []

  useEffect(() => {
    if (profileIdRef.current === id) return
    profileIdRef.current = id
    setSelectedTime(null)
    setScheduleType(resolveVisitType(preferredVisitType, dbDoctor?.visitTypes))
    setSelectedDate(generateDates({ count: 7 })[0])
    pageRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [id, preferredVisitType, dbDoctor?.visitTypes])

  useLayoutEffect(() => {
    if (!doctor) return
    if (shared?.phase === 'preparing' && String(shared.doctor?.id) === String(doctor.id) && heroRef.current) {
      shared.registerDest(heroRef.current)
    }
  }, [shared?.phase, doctor, shared])

  const slotMeta = (slot) => {
    const window = getSlotWindow(selectedDate, slot, now)
    return {
      disabled: window.isPast,
      quick: window.isQuickBook,
    }
  }

  const selectedWindow = selectedTime ? getSlotWindow(selectedDate, selectedTime, now) : null
  const years = yearsFromExperience(doctor?.experience)
  const cases = casesLabel(doctor?.reviews?.total)
  const statRating = doctor?.reviews?.rating ?? doctor?.rating ?? 0

  const goBack = usePushBack(() => {
    if (sharedFlow) shared.startClose()
    goBackToOrigin(navigate, location, { openTopDoctors, openSpecialisations })
  })

  const bookAppointment = () => {
    if (!doctor || !bookingDoctor || !selectedTime || selectedWindow?.isPast) return
    guard(bookingDoctor, ({ forSomeoneElse }) => {
      navigate('/booking/slot', {
        state: flowState(location, {
          doctor: bookingDoctor,
          date: selectedDate,
          time: selectedTime,
          visitType: scheduleType,
          duration: '30 min',
          origin,
          restore,
          returnTo: `/doctor/${doctor.providerUuid || doctor.id}`,
          fromProfile: true,
          bookingMode: selectedWindow?.mode || 'standard',
          preferredVisitType: preferredVisitType || scheduleType,
          forSomeoneElse,
        }),
      })
    })
  }

  const shareProfile = useCallback(async () => {
    const url = window.location.href
    const title = doctor?.name ? `${doctor.name} on eMedicalls` : 'Doctor on eMedicalls'
    const text = doctor?.specialty
      ? `Check out ${doctor.name}, ${doctor.specialty}, on eMedicalls`
      : 'Check out this doctor on eMedicalls'
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
  }, [doctor])

  if (!doctor) {
    return (
      <div className="doctor-profile is-skeleton has-cta">
        <div className="profile-header">
          <button type="button" className="ds-icon-btn is-xl profile-back-btn" data-push-back onClick={goBack} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="profile-header-title">Doctor Profile</h1>
          <div className="profile-header-actions" />
        </div>
        <div className="profile-scroll is-loading">
          <ProfileSkeletons />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`doctor-profile ${sharedFlow ? 'is-shared-hero' : restore?.topDoctors ? 'is-under-overlay' : 'page-push-in'} ${showSkeletons ? 'is-skeleton' : ''} ${contentReady ? 'is-content-ready' : ''} has-cta`}
    >
      <div className="profile-header">
        <button type="button" className="ds-icon-btn is-xl profile-back-btn" data-push-back onClick={goBack} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="profile-header-title">Doctor Profile</h1>
        <div className="profile-header-actions">
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
            onClick={() => setIsFavorite(!isFavorite)}
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
        </div>
      </div>

      <div ref={pageRef} className={`profile-scroll ${contentReady ? '' : 'is-loading'}`.trim()}>
      <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
      <div className={`profile-hero-card ${hideHero ? 'is-morphing' : ''}`}>
        <div className="profile-hero-morph-target" ref={heroRef}>
          <DoctorCard doctor={doctor} variant="profile" disableNavigate />
        </div>
      </div>

      <div className="profile-stack">
        <div className={`profile-skeletons-layer ${contentReady ? 'is-gone' : ''}`} aria-hidden={contentReady}>
          <ProfileSkeletons />
        </div>
        <div className={`profile-body ${contentReady ? 'is-ready' : ''}`} {...(!contentReady ? { inert: true } : {})}>
          <div className="profile-section">
            <div className="profile-section-label">About</div>
            <p className="profile-about-text">{doctor.about}</p>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <strong>{cases}</strong>
              <span>Cases Covered</span>
            </div>
            <div className="profile-stat">
              <strong>{years}+</strong>
              <span>Yrs of experience</span>
            </div>
            <div className="profile-stat">
              <strong>{statRating}</strong>
              <span>Rating</span>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Specialty</div>
            <div className="specialty-grid">
              {doctor.specialties.map((s) => (
                <div className="specialty-tag" key={s.name}>
                  <div className="specialty-tag-icon" style={{ background: s.bg }}>{s.icon}</div>
                  {s.name}
                </div>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Institutions & Accreditation</div>
            <div className="profile-logos">
              {LOGO_BADGES.map((src) => (
                <div className="profile-logo" key={src}>
                  <img src={src} alt="" />
                </div>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <WeeklySchedule
              title="Weekly Schedule"
              doctorId={doctor.id}
              visitType={scheduleType}
              onVisitTypeChange={setScheduleType}
              visitTypeItems={VISIT_TYPES.filter((item) => !doctor.visitTypes?.length || doctor.visitTypes.includes(item.id))}
              selectedDate={selectedDate}
              onDateChange={(next) => { setSelectedDate(next); setSelectedTime(null) }}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              getMeta={slotMeta}
            />
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Practicing Centers</div>
            {doctor.centers.map((c) => (
              <div className="center-card" key={c.name}>
                <div className="center-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="center-info">
                  <div className="center-name">{c.name}</div>
                  <div className="center-address">{c.address}</div>
                </div>
                <div className="center-distance">{c.distance}</div>
              </div>
            ))}
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Gallery</div>
            <div className="gallery-grid">
              {GALLERY_IMAGES.map((src) => (
                <button type="button" className="gallery-img-btn" key={src} onClick={() => setGalleryOpen(true)}>
                  <img className="gallery-img" src={src} alt="Clinic" width="400" height="280" decoding="async" />
                </button>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-label">Ratings & Reviews</div>
            <div className="ratings-summary">
              <div className="ratings-big">
                <div className="ratings-big-num">{doctor.reviews.rating}</div>
                <div className="ratings-big-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <div className="ratings-big-count">{doctor.reviews.total} reviews</div>
              </div>
              <div className="ratings-bars">
                {doctor.reviews.distribution.map((d) => (
                  <div className="rating-bar-row" key={d.stars}>
                    <span className="rating-bar-label">{d.stars}</span>
                    <span className="rating-bar-star">★</span>
                    <div className="rating-bar-track">
                      <div className="rating-bar-fill" style={{ width: `${d.percent}%` }} />
                    </div>
                    <span className="rating-bar-percent">{d.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-list">
              {previewReviews.map((r) => (
                <div className="review-card" key={r.id}>
                  <div className="review-header">
                    <span className="review-author">{r.author}</span>
                    <span className="review-date">{r.date}</span>
                  </div>
                  <div className="review-stars">
                    {[...Array(r.rating)].map((_, i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <p className="review-text">{r.text}</p>
                </div>
              ))}
            </div>

            <button
              className="view-all-reviews"
              type="button"
              onClick={() => navigate(`/doctor/${doctor.id}/reviews`, {
                state: flowState(location, { returnTo: `/doctor/${doctor.id}` }),
              })}
            >
              View All Reviews →
            </button>
          </div>

          {otherConsultants.length > 0 && (
            <div className="profile-section">
              <div className="profile-section-label">Other Consultants</div>
              <div className="profile-consultants">
                {otherConsultants.map((peer) => (
                  <DoctorCard
                    key={peer.id}
                    doctor={peer}
                    variant="grid"
                    hideBook
                    replace
                    origin={origin}
                    restore={restore}
                    returnTo={location.state?.returnTo || '/'}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </div>
      </div>
      </div>

      {contentReady ? (
      <div className="app-flow-footer">
        <button type="button" className="app-flow-cta" disabled={!selectedTime} onClick={bookAppointment}>
          Book appointment
        </button>
      </div>
      ) : null}

      <GalleryLightbox images={GALLERY_IMAGES} isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
      {modal}
    </div>
  )
}
