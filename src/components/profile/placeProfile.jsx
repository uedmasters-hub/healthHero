import ProviderAvatar from '../ProviderAvatar'
import { AppBar } from '../ui'
import { getDoctorReviewSummary, placeReviewKey } from '../../data/reviews'
import { pharmacyDisplayTitle } from '../../lib/pharmacyModel'

/** Pushed-page header — the shared AppBar (`.ds-app-bar`). */
export function ProfileHeader({ title, onBack, actions = null }) {
  return <AppBar className="profile-header" title={title} onBack={onBack} actions={actions} as="div" />
}

function Star({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F59E0B" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function ProfileRatings({ summary, onViewAll }) {
  const preview = summary?.items?.slice(0, 2) || []
  return (
    <div className="profile-section">
      <div className="profile-section-label">Ratings & Reviews</div>
      <div className="ratings-summary">
        <div className="ratings-big">
          <div className="ratings-big-num">{summary?.rating || '—'}</div>
          <div className="ratings-big-stars">
            {[...Array(5)].map((_, i) => <Star key={i} />)}
          </div>
          <div className="ratings-big-count">{summary?.total || 0} reviews</div>
        </div>
        <div className="ratings-bars">
          {(summary?.distribution || []).map((row) => (
            <div className="rating-bar-row" key={row.stars}>
              <span className="rating-bar-label">{row.stars}</span>
              <span className="rating-bar-star">★</span>
              <div className="rating-bar-track">
                <div className="rating-bar-fill" style={{ width: `${row.percent}%` }} />
              </div>
              <span className="rating-bar-percent">{row.percent}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="review-list">
        {preview.map((item) => (
          <div className="review-card" key={item.id}>
            <div className="review-header">
              <span className="review-author">{item.author}</span>
              <span className="review-date">{item.date}</span>
            </div>
            <div className="review-stars">
              {[...Array(item.rating)].map((_, i) => <Star key={i} size={12} />)}
            </div>
            <p className="review-text">{item.text}</p>
          </div>
        ))}
      </div>
      <button className="ds-btn ds-btn--secondary ds-btn--md ds-btn--block view-all-reviews" type="button" onClick={onViewAll}>
        View all reviews
      </button>
    </div>
  )
}

export function ProfileMap({ name, embedUrl, directionsUrl }) {
  if (!embedUrl) return null
  return (
    <div className="profile-section">
      <div className="profile-section-label">Location</div>
      <div className="profile-map">
        <iframe
          title={name ? `Map of ${name}` : 'Map'}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {directionsUrl ? (
        <a className="profile-map-link" href={directionsUrl} target="_blank" rel="noreferrer">
          Get directions
        </a>
      ) : null}
    </div>
  )
}

export function PharmacyHeroCard({ pharmacy, onClick }) {
  if (!pharmacy) return null
  const displayName = pharmacyDisplayTitle(pharmacy) || pharmacy.name || 'Pharmacy'
  const id = pharmacy.pharmacyUuid || pharmacy.id
  const reviews = id ? getDoctorReviewSummary(placeReviewKey('pharmacy', id)) : null
  const rating = reviews?.total
    ? reviews.rating
    : (pharmacy.rating != null && Number(pharmacy.rating) > 0 ? Number(pharmacy.rating).toFixed(1) : null)
  const kind = pharmacy.pharmacyType || pharmacy.systemType || 'Pharmacy'
  const license = pharmacy.shortLicense || pharmacy.licenseNumber || pharmacy.pharmacyCode || ''
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`dc-card dc-card-profile ds-card${onClick ? ' is-interactive' : ''}`}
      onClick={onClick}
      aria-label={onClick ? `Open ${displayName} profile` : undefined}
    >
      <div className="dc-profile-photo">
        <ProviderAvatar
          name={displayName}
          src={pharmacy.image || pharmacy.logoUrl || null}
          imgClassName="dc-profile-photo-img"
          alt=""
        />
      </div>
      <div className="dc-profile-copy">
        <div className="dc-title-row">
          <h3 className="dc-name">{displayName}</h3>
          {rating ? (
            <span className="dc-rating">
              <span className="dc-star" aria-hidden="true">★</span>
              {rating}
            </span>
          ) : null}
        </div>
        <p className="dc-specialty">{kind}</p>
        {license ? <p className="dc-degree">Lic. {license}</p> : null}
        {pharmacy.delivers ? (
          <p className="dc-fee"><strong>Delivery</strong> available</p>
        ) : null}
      </div>
    </Tag>
  )
}

export function ProfileGallery({ images, onOpen }) {
  if (!images?.length) return null
  return (
    <div className="profile-section">
      <div className="profile-section-label">Gallery</div>
      <div className="gallery-grid">
        {images.map((src) => (
          <button type="button" className="gallery-img-btn" key={src} onClick={onOpen}>
            <img className="gallery-img" src={src} alt="" width="400" height="280" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  )
}
