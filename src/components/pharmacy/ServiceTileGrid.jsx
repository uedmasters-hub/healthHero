import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import { PharmacyIcon } from './PharmacyIcons'
import './ServiceTileGrid.css'

/**
 * Two-column service tiles — white surfaces + icon accents (Home service language).
 */
export default function ServiceTileGrid({ items = [], onSelect, className = '' }) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    delay: 200,
    namespace: `pharmacy-services:${items.length}`,
  })

  return (
    <div className={`service-tile-grid ${className}`.trim()} ref={containerRef}>
      {items.map((item, index) => (
        <RevealItem
          as="button"
          type="button"
          key={item.id}
          className={`service-tile service-tile--${item.tone || 'mint'}`}
          revealed={isRevealed(index)}
          cached={isCached}
          ref={setItemRef(index)}
          onClick={() => onSelect?.(item)}
        >
          <span className="service-tile__icon" aria-hidden="true">
            <PharmacyIcon name={item.icon} size={22} />
          </span>
          <span className="service-tile__label">{item.label}</span>
          <span className="service-tile__chevron" aria-hidden="true">
            <PharmacyIcon name="chevron" />
          </span>
        </RevealItem>
      ))}
    </div>
  )
}
