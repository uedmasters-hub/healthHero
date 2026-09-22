import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { flowState } from '../lib/careFlow'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import { useSharedHero } from './SharedHero'
import { formatMoney } from '../lib/paymentSession'
import { presentBookingCard } from '../booking'
import { pickDoctorCredentials, subscribeProviders } from '../features/providers'
import { formatPlaceParts } from '../features/geography/formatPlace'
import ProviderAvatar from './ProviderAvatar'
import './DoctorCard.css'

function displayName(name) {
  if (!name) return 'Doctor'
  return name.startsWith('Dr.') ? name : `Dr. ${name}`
}

function CredentialsLine({ text, className = 'dc-degree' }) {
  if (!text) return null
  return <p className={className}>{text}</p>
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

  const presented = presentBookingCard({ doctor, serviceType: 'doctor_consultation' })
  const merged = presented?.doctor || doctor || {}
  // Re-render when the live registry indexes/updates nmc_number for this provider.
  const [, bumpRegistry] = useState(0)
  useEffect(() => subscribeProviders(() => bumpRegistry((n) => n + 1)), [])

  const photo = presented?.photo || '/img/doctors/new/doctor.png'
  const name = displayName(merged?.name || doctor?.name)
  const specialty = merged?.specialty || doctor?.specialty || 'Specialist'
  const experience = merged?.experience || doctor?.experience || ''
  const rating = merged?.rating ?? doctor?.rating
  const hasRating = Number(rating) > 0
  const creds = pickDoctorCredentials({ ...doctor, ...merged })
  const degree = creds.degree
  const nmcNumber = creds.nmcNumber
  const credentials = creds.line
  const phone = merged?.phone || doctor?.phone || ''
  const address = formatPlaceParts(merged?.address || doctor?.address || '')
  const doctorForNav = {
    ...doctor,
    ...merged,
    photo,
    name,
    specialty,
    experience,
    rating,
    phone,
    degree,
    nmcNumber,
    address,
  }

  const sharedState = () => flowState(location, { origin, preferredVisitType, returnTo, restore })

  const handleClick = (e) => {
    if (isBooking || disableNavigate) return
    if (isIdentity) {
      guard(doctorForNav, ({ forSomeoneElse }) => {
        if (forSomeoneElse) {
          navigate('/booking/slot', {
            state: flowState(sharedState(), {
              doctor: doctorForNav,
              returnTo: origin === 'appointment' ? '/appointment' : (returnTo || location.pathname),
              fromProfile: origin === 'appointment',
              forSomeoneElse: true,
            }),
          })
          return
        }
        if (doctorForNav?.id) {
          onBeforeNavigate?.()
          navigate(`/doctor/${doctorForNav.id}`, { replace, state: sharedState() })
          onAfterNavigate?.()
        }
      })
      return
    }
    if (variant === 'grid' && shared?.startOpen && doctorForNav?.id) {
      shared.startOpen({
        doctor: doctorForNav,
        sourceEl: e.currentTarget,
        restore,
        swap: Boolean(replace && shared.active),
        hideBook: true,
        runNavigate: () => {
          onBeforeNavigate?.()
          navigate(`/doctor/${doctorForNav.id}`, { replace, state: sharedState() })
          onAfterNavigate?.()
        },
      })
      return
    }
    onBeforeNavigate?.()
    if (doctorForNav?.id) {
      navigate(`/doctor/${doctorForNav.id}`, { replace, state: sharedState() })
      onAfterNavigate?.()
    }
  }

  const handleBookNow = (e) => {
    e.stopPropagation()
    onBeforeNavigate?.()
    if (onBookNow) {
      onBookNow(doctorForNav)
      onAfterNavigate?.()
      return
    }
    if (doctorForNav?.id) {
      guard(doctorForNav, ({ forSomeoneElse }) => {
        navigate('/booking/slot', {
          state: flowState(sharedState(), {
            doctor: doctorForNav,
            returnTo: returnTo || `/doctor/${doctorForNav.id}`,
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
        <ProviderAvatar
          className="dc-identity-photo"
          imgClassName="dc-identity-photo-img"
          doctor={doctorForNav}
          src={photo}
          alt=""
        />
        <div className="dc-identity-info">
          <h3 className="dc-identity-name">{name}</h3>
          <p className="dc-identity-specialty">
            <span className="dc-identity-specialty-text">{specialty}</span>
            <span className="dc-rating">
              <span className="dc-star" aria-hidden="true">★</span>
              {rating}
            </span>
          </p>
          <CredentialsLine text={credentials} className="dc-degree dc-identity-degree" />
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
          <ProviderAvatar
            doctor={doctorForNav}
            src={photo}
            imgClassName="dc-profile-photo-img"
            alt=""
          />
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
          <CredentialsLine text={credentials} />
          {experience ? <span className="dc-exp">{experience}</span> : null}
          {doctorForNav?.fee != null ? (
            <p className="dc-fee">
              <strong>{formatMoney(doctorForNav.fee)}*</strong> Consultation fee
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
  const visitTypes = doctorForNav?.visitTypes || doctor?.visitTypes || []
    return (
      <>
      <div className={`dc-card dc-card-list ${className}`} onClick={handleClick}>
        <div className="dc-list-top">
          <div className="dc-grid-photo">
            <ProviderAvatar doctor={doctorForNav} src={photo} alt="" />
          </div>
          <div className="dc-list-copy">
            <div className="dc-title-row">
              <h3 className="dc-name">{name}</h3>
              {hasRating ? (
                <span className="dc-rating">
                  <span className="dc-star" aria-hidden="true">★</span>
                  {rating}
                </span>
              ) : null}
            </div>
            <p className="dc-specialty">{specialty}</p>
            <CredentialsLine text={credentials} />
            {(experience || recentlyViewed || doctorForNav?.isVerified) ? (
              <div className="dc-list-flags">
                {experience ? <span className="dc-exp">{experience}</span> : null}
                {doctorForNav?.isVerified ? <span className="dc-recent">Verified</span> : null}
                {recentlyViewed ? <span className="dc-recent">Recently viewed</span> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="dc-list-details">
          {doctorForNav?.address ? (
            <p className="dc-list-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {doctorForNav.address}
            </p>
          ) : null}
          {visitTypes.length > 0 ? (
            <div className="dc-list-tags">
              {doctorForNav?.travelTime || doctor?.travelTime ? (
                <span className="dc-list-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {doctorForNav.travelTime || doctor.travelTime}
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
          ) : null}
          {doctorForNav?.availability ? (
            <p className="dc-list-avail">{doctorForNav.availability}</p>
          ) : null}
        </div>

        <div className="dc-list-footer">
          {doctorForNav?.fee != null ? (
            <p className="dc-fee">
              <strong>{formatMoney(doctorForNav.fee)}*</strong> Consultation fee
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
          <ProviderAvatar doctor={doctorForNav} src={photo} alt="" />
        </div>
        <h3 className="dc-name">{name}</h3>
        <p className="dc-grid-meta">
          <span className="dc-specialty">{specialty}</span>
          {hasRating ? (
            <span className="dc-rating">
              <span className="dc-star" aria-hidden="true">★</span>
              {rating}
            </span>
          ) : null}
        </p>
        <CredentialsLine text={credentials} />
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
        <ProviderAvatar doctor={doctorForNav} src={photo} alt={name} />
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
          <CredentialsLine text={credentials} />
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
