import { useState } from 'react'
import { Icon, List, ListRow, SectionHead, cx } from '../ui'
import ActionGrid from '../ActionGrid'
import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import { PharmacyIcon } from './PharmacyIcons'
import '../Categories.css'
import './PharmacyHome.css'

/**
 * Pharmacy home sections. Artwork comes from `src` / `srcs`; each slot walks
 * its sources in order and lands on `fallback` (usually an icon) when none load.
 */
export function RxImage({ src, srcs, alt = '', className = '', fallback = null }) {
  const sources = (srcs || [src]).filter(Boolean)
  const [index, setIndex] = useState(0)
  if (index >= sources.length) return fallback
  return (
    <img
      key={sources[index]}
      className={className}
      src={sources[index]}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setIndex((value) => value + 1)}
    />
  )
}

function RxGlyph({ image, icon, size = 24, className = '' }) {
  return (
    <RxImage
      src={image}
      className={cx('rx-glyph', className)}
      fallback={<PharmacyIcon name={icon} size={size} />}
    />
  )
}

export function RxSectionHead({ title, actionLabel, onAction }) {
  return (
    <SectionHead
      className="rx-section-head"
      title={title}
      action={actionLabel ? (
        <button type="button" className="ds-link rx-section-head__link" onClick={onAction}>
          {actionLabel}
          <Icon.ChevronRight />
        </button>
      ) : null}
    />
  )
}

export function ShopCategoryGrid({ items = [], onSelect }) {
  return (
    <ActionGrid
      className="rx-cat-grid"
      label="Shop by category"
      items={items.map((item) => ({ ...item, icon: <RxGlyph image={item.image} icon={item.icon} /> }))}
      onSelect={onSelect}
    />
  )
}

/** Category art: illustration when it exists, else the line icon in a soft well. */
export function CategoryArt({ item, className = '' }) {
  return (
    <span className={cx('rx-category-art', className)} aria-hidden="true">
      <RxImage
        src={item.image}
        fallback={(
          <span className="rx-category-art__well">
            <PharmacyIcon name={item.icon} size={30} />
          </span>
        )}
      />
    </span>
  )
}

/** Same rail as Home specialties: bordered cards, snap scroll; "See All" opens the full sheet. */
export function PopularCategories({ items = [], onSelect, onSeeAll }) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    dataset: 'pharmacy:popular-categories',
  })
  if (!items.length) return null

  return (
    <section className="rx-section rx-popular" aria-label="Popular categories">
      <div className="rx-section__inset">
        <RxSectionHead title="Popular categories" actionLabel="See All" onAction={onSeeAll} />
      </div>
      <div className="categories-scroll ds-chip-row" ref={containerRef}>
        {items.map((item, index) => (
          <RevealItem
            as="button"
            type="button"
            key={item.id}
            className="category-card ds-card is-interactive"
            revealed={isRevealed(index)}
            cached={isCached}
            ref={setItemRef(index)}
            onClick={() => onSelect?.(item)}
          >
            <CategoryArt item={item} className="category-icon" />
            <span className="category-name">{item.label}</span>
          </RevealItem>
        ))}
      </div>
    </section>
  )
}

export function OfferRail({ offers = [], onSelect }) {
  if (!offers.length) return null
  return (
    <section className="rx-rail rx-offers" aria-label="Offers">
      {offers.map((offer) => (
        <button
          key={offer.id}
          type="button"
          className={`rx-offer is-${offer.tone || 'mint'}`}
          onClick={() => onSelect?.(offer)}
        >
          <span className="rx-offer__copy">
            <span className="rx-offer__title">{offer.title}</span>
            <span className="rx-offer__body">{offer.body}</span>
            {offer.code ? <span className="rx-offer__code">Use code {offer.code}</span> : null}
          </span>
          <span className="rx-offer__art" aria-hidden="true">
            <RxImage src={offer.image} className="rx-offer__img" />
          </span>
          <span className="rx-offer__go" aria-hidden="true">
            <Icon.ArrowRight />
          </span>
        </button>
      ))}
    </section>
  )
}

export function PharmacyHelpList({ tip, support, onTip, onChat }) {
  return (
    <section className="rx-section rx-section__inset" aria-label="Pharmacist help">
      <RxSectionHead title="Pharmacist help" />
      <List>
        {tip ? (
          <ListRow
            className="rx-help-row"
            chevron={false}
            onClick={onTip}
            icon={(
              <span className="ds-icon-well is-tile is-lg" aria-hidden="true">
                <RxGlyph image={tip.image} icon="spark" size={20} />
              </span>
            )}
          >
            {tip.eyebrow ? <span className="ds-overline rx-help-row__eyebrow">{tip.eyebrow}</span> : null}
            <span className="ds-list-row__title">{tip.title}</span>
            {tip.body ? <span className="ds-list-row__sub">{tip.body}</span> : null}
          </ListRow>
        ) : null}
        {support ? (
          <ListRow
            className="rx-help-row"
            chevron={false}
            onClick={onChat}
            icon={(
              <span className="ds-icon-well is-tile is-lg" aria-hidden="true">
                <RxGlyph image={support.image} icon="chat" size={20} />
              </span>
            )}
          >
            <span className="ds-list-row__title">{support.title}</span>
            {support.body ? <span className="ds-list-row__sub">{support.body}</span> : null}
            {support.cta ? <span className="rx-help-row__cta">{support.cta}</span> : null}
          </ListRow>
        ) : null}
      </List>
    </section>
  )
}

function Stars({ count = 5 }) {
  return (
    <span className="rx-stars" role="img" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }, (_, index) => (
        <PharmacyIcon key={index} name="star" size={16} />
      ))}
    </span>
  )
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function TrustSection({ trust }) {
  if (!trust) return null
  const { stats = [], testimonial } = trust
  return (
    <section className="rx-section rx-section__inset" aria-label="Trusted by thousands">
      <RxSectionHead title="Trusted by thousands" />
      <div className="rx-stats">
        {stats.map((stat) => (
          <div key={stat.id} className="ds-card is-padded rx-stat">
            <span className="rx-stat__value">
              {stat.value}
              {stat.star ? <PharmacyIcon name="star" size={20} /> : null}
            </span>
            <span className="rx-stat__label">{stat.label}</span>
          </div>
        ))}
      </div>
      {testimonial ? (
        <figure className="rx-testimonial">
          <blockquote className="rx-testimonial__quote">“{testimonial.quote}”</blockquote>
          <figcaption className="rx-testimonial__by">
            <span className="rx-testimonial__avatar" aria-hidden="true">
              <RxImage
                src={testimonial.avatar}
                fallback={<span>{initials(testimonial.name)}</span>}
              />
            </span>
            <span className="rx-testimonial__who">
              <span className="rx-testimonial__name">{testimonial.name}</span>
              <span className="rx-testimonial__place">{testimonial.place}</span>
            </span>
            <Stars count={testimonial.rating} />
          </figcaption>
        </figure>
      ) : null}
    </section>
  )
}

export function CommitmentList({ items = [] }) {
  if (!items.length) return null
  return (
    <section className="rx-section rx-section__inset" aria-label="Our commitment">
      <RxSectionHead title="Our commitment" />
      <List>
        {items.map((item) => (
          <ListRow
            key={item.id}
            className="rx-commit-row"
            title={item.title}
            subtitle={item.body}
            icon={(
              <span className="ds-icon-well is-tile is-lg is-success" aria-hidden="true">
                <RxGlyph image={item.image} icon={item.icon} size={20} />
              </span>
            )}
          />
        ))}
      </List>
    </section>
  )
}
