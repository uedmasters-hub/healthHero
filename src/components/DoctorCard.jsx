import { useNavigate, useLocation } from 'react-router-dom'
import { flowState } from '../lib/careFlow'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import { useSharedHero } from './SharedHero'
import { formatMoney } from '../lib/paymentSession'
import './DoctorCard.css'

const doctorImages = {
  1: '/img/doctors/new/doctor.png',
  2: '/img/doctors/doctor-m1.png',
  3: '/img/doctors/doctor-w2.png',
  4: '/img/doctors/doctor-m2.png',
  5: '/img/doctors/doctor-w3.png',
  6: '/img/doctors/doctor-m3.png',
  7: '/img/doctors/doctor-w1.png',
  8: '/img/doctors/doctor-m1.png',
}

function displayName(name) {
  if (!name) return 'Doctor'
  return name.startsWith('Dr.') ? name : `Dr. ${name}`
}

export default function DoctorCard({
  doctor,
  className = '',
  onBeforeNavigate,
  onAfterNavigate,
  context,
  origin,
  returnTo,
  restore,
  disableNavigate,
  variant = 'row',
  replace = false,
  hideBook = false,
  onBookNow,
  recentlyViewed = false,
  showChat = false,
  onChat,
  chatBusy = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const shared = useSharedHero()
  const { guard, modal } = useDuplicateBookingGuard()
  const preferredVisitType = location.state?.preferredVisitType
  const isBooking = context === 'booking'
  const isIdentity = context === 'identity'

  const photo = doctor?.photo || doctorImages[doctor?.id] || '/img/doctors/new/doctor.png'
  const name = displayName(doctor?.name)
  const specialty = doctor?.specialty || 'Specialist'
  const experience = doctor?.experience || ''
  const rating = doctor?.rating ?? 4.8
  const phone = doctor?.phone || `+91987654321${doctor?.id || 0}`

  const sharedState = () => flowState(location, { origin, preferredVisitType, returnTo, restore })

  const handleClick = (e) => {
    if (isBooking || disableNavigate) return
    if (isIdentity) {
      guard(doctor, ({ forSomeoneElse }) => {
        if (forSomeoneElse) {
          navigate('/booking/slot', {
            state: flowState(sharedState(), {
              doctor,
              returnTo: origin === 'appointment' ? '/appointment' : (returnTo || location.pathname),
              fromProfile: origin === 'appointment',
              forSomeoneElse: true,
            }),
          })
          return
        }
        if (doctor?.id) {
          onBeforeNavigate?.()
          navigate(`/doctor/${doctor.id}`, { replace, state: sharedState() })
          onAfterNavigate?.()
        }
      })
      return
    }
    if (variant === 'grid' && shared?.startOpen && doctor?.id) {
      shared.startOpen({
        doctor,
        sourceEl: e.currentTarget,
        restore,
        swap: Boolean(replace && shared.active),
        hideBook: true,
        runNavigate: () => {
          onBeforeNavigate?.()
          navigate(`/doctor/${doctor.id}`, { replace, state: sharedState() })
          onAfterNavigate?.()
        },
      })
      return
    }
    onBeforeNavigate?.()
    if (doctor?.id) {
      navigate(`/doctor/${doctor.id}`, { replace, state: sharedState() })
      onAfterNavigate?.()
    }
  }

  const handleBookNow = (e) => {
    e.stopPropagation()
    onBeforeNavigate?.()
    if (onBookNow) {
      onBookNow(doctor)
      onAfterNavigate?.()
      return
    }
    if (doctor?.id) {
      guard(doctor, ({ forSomeoneElse }) => {
        navigate('/booking/slot', {
          state: flowState(sharedState(), {
            doctor,
            returnTo: returnTo || `/doctor/${doctor.id}`,
            fromProfile: Boolean(returnTo && returnTo.startsWith('/doctor/')),
            forSomeoneElse,
          }),
        })
      })
      onAfterNavigate?.()
    }
  }

  const handleCall = (e) => {
    e.stopPropagation()
    window.location.href = `tel:${phone.replace(/\s/g, '')}`
  }

  const handleChat = (e) => {
    e.stopPropagation()
    if (chatBusy) return
    onChat?.(e)
  }

  if (isIdentity) {
    return (
      <>
      <button type="button" className={`dc-identity ${className}`} onClick={handleClick} disabled={disableNavigate}>
        <img className="dc-identity-photo" src={photo} alt="" />
        <div className="dc-identity-info">
          <h3 className="dc-identity-name">{name}</h3>
          <p className="dc-identity-specialty">
            <span className="dc-identity-specialty-text">{specialty}</span>
            <span className="dc-rating">
              <span className="dc-star" aria-hidden="true">★</span>
              {rating}
            </span>
          </p>
        </div>
      </button>
      {modal}
      </>
    )
  }

  if (variant === 'profile') {
    return (
      <>
      <div className={`dc-card dc-card-profile ${className}`}>
        <div className="dc-profile-photo">
          <img src={photo} alt="" />
        </div>
        <div className="dc-profile-copy">
          <div className="dc-title-row">
            <h3 className="dc-name">{name}</h3>
            <span className="dc-rating">
              <span className="dc-star" aria-hidden="true">★</span>
              {rating}
            </span>
          </div>
          <p className="dc-specialty">{specialty}</p>
          {experience ? <span className="dc-exp">{experience}</span> : null}
          {doctor?.fee != null ? (
            <p className="dc-fee">
              <strong>{formatMoney(doctor.fee)}*</strong> Consultation fee
            </p>
          ) : null}
        </div>
        {showChat && typeof onChat === 'function' ? (
          <button
            type="button"
            className="dc-chat"
            onClick={handleChat}
            disabled={chatBusy}
            aria-label={`Message ${name}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        ) : null}
      </div>
      {modal}
      </>
    )
  }

  if (variant === 'list') {
    const visitTypes = doctor?.visitTypes || []
    return (
      <>
      <div className={`dc-card dc-card-list ${className}`} onClick={handleClick}>
        <div className="dc-list-top">
          <div className="dc-grid-photo">
            <img src={photo} alt="" />
          </div>
          <div className="dc-list-copy">
            <div className="dc-title-row">
              <h3 className="dc-name">{name}</h3>
              <span className="dc-rating">
                <span className="dc-star" aria-hidden="true">★</span>
                {rating}
              </span>
            </div>
            <p className="dc-specialty">{specialty}</p>
            {(experience || recentlyViewed) ? (
              <div className="dc-list-flags">
                {experience ? <span className="dc-exp">{experience}</span> : null}
                {recentlyViewed ? <span className="dc-recent">Recently viewed</span> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="dc-list-details">
          {doctor?.address ? (
            <p className="dc-list-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {doctor.address}
            </p>
          ) : null}
          <div className="dc-list-tags">
            {doctor?.travelTime ? (
              <span className="dc-list-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {doctor.travelTime}
              </span>
            ) : null}
            {visitTypes.map((type) => (
              <span className="dc-list-tag" key={type}>
                {type === 'In-Person' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                )}
                {type}
              </span>
            ))}
          </div>
          {doctor?.availability ? (
            <p className="dc-list-avail">{doctor.availability}</p>
          ) : null}
        </div>

        <div className="dc-list-footer">
          {doctor?.fee != null ? (
            <p className="dc-fee">
              <strong>{formatMoney(doctor.fee)}*</strong> Consultation fee
            </p>
          ) : <span />}
          <button type="button" className="dc-book" onClick={handleBookNow}>
            <svg className="dc-book-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
              <path d="M8 3.5v3.2M16 3.5v3.2M3.5 10h17" />
            </svg>
            Book Now
          </button>
        </div>
      </div>
      {modal}
      </>
    )
  }

  if (variant === 'grid') {
    return (
      <>
      <div
        className={`dc-card dc-card-grid is-mini ${className}`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick(e)
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="dc-grid-photo">
          <img src={photo} alt="" />
        </div>
        <h3 className="dc-name">{name}</h3>
        <p className="dc-grid-meta">
          <span className="dc-specialty">{specialty}</span>
          <span className="dc-rating">
            <span className="dc-star" aria-hidden="true">★</span>
            {rating}
          </span>
        </p>
        {experience ? <span className="dc-exp">{experience}</span> : null}
      </div>
      {modal}
      </>
    )
  }

  return (
    <>
    <div className={`dc-card ${isBooking ? 'dc-card-booking' : ''} ${className}`} onClick={handleClick}>
      <div className="dc-media">
        <img src={photo} alt={name} />
      </div>
      <div className="dc-content">
        <div className="dc-info">
          <div className="dc-title-row">
            <h3 className="dc-name">{name}</h3>
            <span className="dc-rating">
              <span className="dc-star" aria-hidden="true">★</span>
              {rating}
            </span>
          </div>
          <p className="dc-specialty">{specialty}</p>
          {experience ? <span className="dc-exp">{experience}</span> : null}
        </div>
        {!isBooking && (
          <div className="dc-actions">
            <button type="button" className="dc-book" onClick={handleBookNow}>
              <svg className="dc-book-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                <path d="M8 3.5v3.2M16 3.5v3.2M3.5 10h17" />
              </svg>
              Book Now
            </button>
            <button type="button" className="dc-call" onClick={handleCall} aria-label={`Call ${name}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
    {modal}
    </>
  )
}
