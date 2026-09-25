import Avatar from './Avatar'
import './EntityCard.css'

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/**
 * Shared directory entity card shell.
 */
export default function EntityCard({
  name,
  subtitle,
  meta,
  location,
  locationPin = true,
  locationInline = false,
  stackLines = [],
  chips = [],
  footerBadge = null,
  avatarSrc,
  avatarName,
  doctor,
  badge,
  priceLabel,
  priceSuffix,
  actionLabel,
  actionIcon,
  actionVariant = 'link',
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionVariant = 'outline',
  onSecondaryAction,
  onClick,
  className = '',
}) {
  const hasPrimary = Boolean(actionLabel)
  const hasSecondary = Boolean(secondaryActionLabel || secondaryActionHref)
  const hasFooterBadge = Boolean(footerBadge)
  const pillFooter = (hasPrimary && actionVariant !== 'link')
    || (hasSecondary && secondaryActionVariant !== 'link')
  const splitFooter = hasFooterBadge && hasPrimary && !hasSecondary
  const showFooter = Boolean(priceLabel || hasPrimary || hasSecondary || hasFooterBadge)
  const showDetails = Boolean((location && !locationInline && !stackLines.length) || chips.length > 0)

  const renderAction = ({
    label,
    icon,
    variant,
    href,
    onPress,
  }) => {
    if (!label && !href) return null
    const classNameAction = [
      'dir-entity__action',
      variant === 'solid' ? 'is-solid' : '',
      variant === 'outline' ? 'is-outline' : '',
      variant === 'link' ? 'is-link' : '',
    ].filter(Boolean).join(' ')

    if (href) {
      return (
        <a
          className={classNameAction}
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation()
            onPress?.(e)
          }}
        >
          {icon || null}
          {label}
        </a>
      )
    }

    return (
      <button
        type="button"
        className={classNameAction}
        onClick={(e) => {
          e.stopPropagation()
          onPress?.(e)
        }}
      >
        {icon || null}
        {label}
      </button>
    )
  }

  const footerClass = [
    'dir-entity__footer',
    pillFooter ? 'is-pills' : '',
    splitFooter ? 'is-split' : '',
  ].filter(Boolean).join(' ')

  return (
    <article
      className={`dir-entity ${pillFooter ? 'dir-entity--pills' : ''} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(e)
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="dir-entity__top">
        <Avatar
          name={avatarName || name}
          src={avatarSrc}
          doctor={doctor}
          size={56}
          className="dir-entity__avatar"
        />
        <div className="dir-entity__copy">
          <div className="dir-entity__title-row">
            <h3 className="dir-entity__name">{name}</h3>
            {badge ? <span className="dir-entity__badge">{badge}</span> : null}
          </div>
          {subtitle ? <p className="dir-entity__subtitle">{subtitle}</p> : null}
          {meta ? <p className="dir-entity__meta">{meta}</p> : null}
          {locationInline && location ? (
            <p className="dir-entity__location is-inline">
              {locationPin ? <PinIcon /> : null}
              <span>{location}</span>
            </p>
          ) : null}
          {stackLines.map((line) => (
            <p
              key={line.id || line.label}
              className={`dir-entity__stack-line${line.tone === 'muted' ? ' is-muted' : ''}`}
            >
              {line.label}
            </p>
          ))}
        </div>
      </div>

      {showDetails ? (
        <div className="dir-entity__details">
          {location ? (
            <p className="dir-entity__location">
              {locationPin ? <PinIcon /> : null}
              <span>{location}</span>
            </p>
          ) : null}
          {chips.length > 0 ? (
            <div className="dir-entity__chips">
              {chips.map((chip) => (
                <span className="dir-entity__chip" key={chip.id || chip.label}>
                  {chip.icon || null}
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showFooter ? (
        <div className={footerClass}>
          {priceLabel ? (
            <p className="dir-entity__price">
              <strong>{priceLabel}</strong>
              {priceSuffix ? <span> {priceSuffix}</span> : null}
            </p>
          ) : null}
          {hasFooterBadge ? (
            <span className="dir-entity__footer-badge">{footerBadge}</span>
          ) : null}
          {hasSecondary ? (
            renderAction({
              label: secondaryActionLabel,
              variant: secondaryActionVariant,
              href: secondaryActionHref,
              onPress: onSecondaryAction,
            })
          ) : (!pillFooter && !priceLabel && !hasFooterBadge ? <span /> : null)}
          {hasPrimary ? (
            renderAction({
              label: actionLabel,
              icon: actionIcon,
              variant: actionVariant,
              onPress: onAction,
            })
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function EntityCardSkeleton() {
  return (
    <div className="dir-entity dir-entity--skel dir-entity--pharmacy-list" aria-hidden="true">
      <div className="dir-entity__top">
        <span className="dir-entity__avatar-skel shimmer" />
        <div className="dir-entity__copy">
          <span className="dir-entity__line wide shimmer" />
          <span className="dir-entity__line mid shimmer" />
          <span className="dir-entity__line short shimmer" />
        </div>
      </div>
      <div className="dir-entity__footer is-split">
        <span className="dir-entity__chip-skel shimmer" />
        <span className="dir-entity__btn-skel shimmer" />
      </div>
    </div>
  )
}

export function EntityCardSkeletonStack({ count = 3 }) {
  return (
    <div className="dir-entity-stack" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <EntityCardSkeleton key={i} />
      ))}
    </div>
  )
}
