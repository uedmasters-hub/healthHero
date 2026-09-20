import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import { PharmacyIcon } from './PharmacyIcons'
import './PharmacyModules.css'

export function PharmacyTipCard({ tip, onClick, className = '' }) {
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    delay: 320,
    namespace: `pharmacy-tip:${tip?.id || 'tip'}`,
  })
  if (!tip) return null

  return (
    <RevealItem
      as="button"
      type="button"
      className={`pharmacy-tip ${className}`.trim()}
      revealed={isRevealed(0)}
      cached={isCached}
      ref={setItemRef(0)}
      onClick={onClick}
    >
      <span className="pharmacy-tip__icon" aria-hidden="true">
        <PharmacyIcon name="spark" size={20} />
      </span>
      <span className="pharmacy-tip__copy">
        {tip.eyebrow ? <span className="pharmacy-tip__eyebrow">{tip.eyebrow}</span> : null}
        <span className="pharmacy-tip__title">{tip.title}</span>
        {tip.body ? <span className="pharmacy-tip__body">{tip.body}</span> : null}
      </span>
    </RevealItem>
  )
}

export function PharmacySupportCard({
  title = 'Need help with medicines?',
  body = 'Chat with a pharmacist for dosage guidance, interactions, and refill questions.',
  cta = 'Start Live Chat',
  onClick,
  className = '',
}) {
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    delay: 340,
    namespace: 'pharmacy-support',
  })

  return (
    <RevealItem
      as="button"
      type="button"
      className={`pharmacy-support ${className}`.trim()}
      revealed={isRevealed(0)}
      cached={isCached}
      ref={setItemRef(0)}
      onClick={onClick}
    >
      <span className="pharmacy-support__icon" aria-hidden="true">
        <PharmacyIcon name="chat" size={22} />
      </span>
      <span className="pharmacy-support__copy">
        <span className="pharmacy-support__title">{title}</span>
        <span className="pharmacy-support__body">{body}</span>
        <span className="pharmacy-support__cta">{cta}</span>
      </span>
      <span className="pharmacy-support__chevron" aria-hidden="true">
        <PharmacyIcon name="chevron" />
      </span>
    </RevealItem>
  )
}
