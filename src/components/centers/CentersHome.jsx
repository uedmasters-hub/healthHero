import { Icon, SectionHead, cx } from '../ui'
import ActionGrid from '../ActionGrid'
import { RxImage } from '../pharmacy/PharmacyHome'
import { PharmacyIcon } from '../pharmacy/PharmacyIcons'
import './CentersHome.css'

/** Healthcare center home sections — scoped to the Centers page. */

const GLYPHS = {
  hospital: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
      <path d="M2 21h20M12 7v4M10 9h4M9 21v-4h6v4" />
    </>
  ),
  clinic: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" />
    </>
  ),
  emergency: (
    <>
      <path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11.4 8.8 11.4s8.8-6 8.8-11.4z" />
      <path d="M3.6 12h4l1.5-3 3 6 1.5-3h6.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" />
    </>
  ),
  departments: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3h6v1M12 10v5M9.5 12.5h5" />
    </>
  ),
  diagnostics: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M5 3v5a5 5 0 0 0 10 0V3M4 3h2M14 3h2" />
      <path d="M10 13v2a5 5 0 0 0 10 0v-1" />
      <circle cx="20" cy="12" r="2" />
    </>
  ),
  packages: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  care: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M8.8 15.5a3.6 3.6 0 0 1 6.4 0" />
    </>
  ),
  help: (
    <>
      <path d="M14 9a2 2 0 0 1-2 2H6l-3 3V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z" />
      <path d="M18 9h1a2 2 0 0 1 2 2v9l-3-3h-6a2 2 0 0 1-2-2v-1" />
    </>
  ),
}

function CentersIcon({ name, size = 24 }) {
  if (name === 'phone') return <Icon.Phone width={size} height={size} />
  if (name === 'chat') return <Icon.Message width={size} height={size} />
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name] || GLYPHS.hospital}
    </svg>
  )
}

export function HcSectionHead({ title, actionLabel, onAction }) {
  return (
    <SectionHead
      className="hc-section-head"
      title={title}
      action={actionLabel ? (
        <button type="button" className="ds-link hc-section-head__link" onClick={onAction}>
          {actionLabel}
          <Icon.ChevronRight />
        </button>
      ) : null}
    />
  )
}

export function CentersSegments({ items = [], activeId, onSelect }) {
  return (
    <div className="hc-segments" role="tablist" aria-label="Facility type">
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx('hc-segments__item', active && 'is-active')}
            onClick={() => onSelect?.(item)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function QuickActionGrid({ items = [], onSelect }) {
  return (
    <ActionGrid
      className="hc-actions"
      label="Healthcare shortcuts"
      items={items.map((item) => ({ ...item, icon: <CentersIcon name={item.icon} /> }))}
      onSelect={onSelect}
    />
  )
}

export function CentersPromoRail({ promos = [], onSelect }) {
  if (!promos.length) return null
  return (
    <section className="hc-rail hc-promos" aria-label="Emergency services">
      {promos.map((promo) => (
        <button
          key={promo.id}
          type="button"
          className={`hc-promo is-${promo.tone || 'rose'}`}
          onClick={() => onSelect?.(promo)}
        >
          <span className="hc-promo__copy">
            <span className="hc-promo__title">{promo.title}</span>
            <span className="hc-promo__body">{promo.body}</span>
          </span>
          <span className="hc-promo__art" aria-hidden="true">
            <RxImage srcs={promo.images} className="hc-promo__img" />
          </span>
        </button>
      ))}
    </section>
  )
}

export function ServiceGallery({ title, items = [], onSelect, onSeeAll }) {
  if (!items.length) return null
  return (
    <section className="hc-section hc-inset" aria-label={title}>
      <HcSectionHead title={title} actionLabel="See All" onAction={onSeeAll} />
      <ul className="hc-services">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="hc-service" onClick={() => onSelect?.(item)}>
              <span className="hc-service__media" aria-hidden="true">
                <RxImage
                  srcs={item.images}
                  className="hc-service__img"
                  fallback={<CentersIcon name="hospital" size={28} />}
                />
              </span>
              <span className="hc-service__title">{item.title}</span>
              <span className="hc-service__body">{item.body}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function CentersTrust({ trust }) {
  if (!trust) return null
  const { stats = [], testimonial } = trust
  return (
    <section className="hc-section hc-inset" aria-label="Trusted by thousands">
      <HcSectionHead title="Trusted by thousands" />
      <div className="hc-stats">
        {stats.map((stat) => (
          <div key={stat.id} className="hc-stat">
            <span className="hc-stat__value">
              {stat.value}
              {stat.star ? <PharmacyIcon name="star" size={22} /> : null}
            </span>
            <span className="hc-stat__label">{stat.label}</span>
          </div>
        ))}
      </div>
      {testimonial ? (
        <figure className="hc-quote">
          <span className="hc-quote__mark" aria-hidden="true">“</span>
          <blockquote className="hc-quote__text">“{testimonial.quote}”</blockquote>
          <figcaption className="hc-quote__by">
            <span className="hc-quote__avatar" aria-hidden="true">
              <RxImage src={testimonial.avatar} fallback={<span>{initials(testimonial.name)}</span>} />
            </span>
            <span className="hc-quote__who">
              <span className="hc-quote__name">{testimonial.name}</span>
              <span className="hc-quote__place">{testimonial.place}</span>
            </span>
            <span className="hc-stars" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
              {Array.from({ length: testimonial.rating }, (_, index) => (
                <PharmacyIcon key={index} name="star" size={16} />
              ))}
            </span>
          </figcaption>
        </figure>
      ) : null}
    </section>
  )
}

export function CentersHelpList({ items = [], onSelect }) {
  if (!items.length) return null
  return (
    <section className="hc-section hc-inset" aria-label="Need help?">
      <HcSectionHead title="Need help?" />
      <div className="hc-help">
        {items.map((item) => {
          const content = (
            <>
              <span className="hc-help__well" aria-hidden="true">
                <CentersIcon name={item.icon} size={22} />
              </span>
              <span className="hc-help__copy">
                <span className="hc-help__title">{item.title}</span>
                <span className="hc-help__body">{item.body}</span>
              </span>
            </>
          )
          return item.href ? (
            <a key={item.id} className="hc-help__row" href={item.href}>{content}</a>
          ) : (
            <button key={item.id} type="button" className="hc-help__row" onClick={() => onSelect?.(item)}>
              {content}
            </button>
          )
        })}
      </div>
    </section>
  )
}
