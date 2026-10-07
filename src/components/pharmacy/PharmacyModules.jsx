import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import { PharmacyIcon } from './PharmacyIcons'
import './PharmacyModules.css'

export function PharmacySupportCard({
  title = 'Need help with medicines?',
  body = 'Chat with a pharmacist for dosage guidance, interactions, and refill questions.',
  cta = 'Start Live Chat',
  ctaAs = 'link',
  icon = 'chat',
  onClick,
  className = '',
}) {
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: 'pharmacy-support',
  })

  return (
    <RevealItem
      as="button"
      type="button"
      className={`pharmacy-support ds-card is-interactive ${className}`.trim()}
      revealed={isRevealed(0)}
      cached={isCached}
      ref={setItemRef(0)}
      onClick={onClick}
    >
      <span className="pharmacy-support__icon ds-icon-well is-tile is-lg" aria-hidden="true">
        <PharmacyIcon name={icon} size={22} />
      </span>
      <span className="pharmacy-support__copy">
        <span className="pharmacy-support__title">{title}</span>
        {body ? <span className="pharmacy-support__body">{body}</span> : null}
        {ctaAs === 'button' ? null : <span className="pharmacy-support__cta ds-link">{cta}</span>}
      </span>
      {ctaAs === 'button' ? <span className="pharmacy-support__cta is-pill ds-btn ds-btn--primary ds-btn--sm">{cta}</span> : null}
      {ctaAs === 'button' ? null : (
        <span className="pharmacy-support__chevron" aria-hidden="true">
          <PharmacyIcon name="chevron" />
        </span>
      )}
    </RevealItem>
  )
}
