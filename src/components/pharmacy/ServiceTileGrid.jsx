import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import { PharmacyIcon } from './PharmacyIcons'
import './ServiceTileGrid.css'

/* Tile tone → shared icon-well / badge tone */
const TONE = { mint: 'success', sky: 'info', lavender: 'primary', peach: 'warning' }
const WELL = { success: 'is-success', info: 'is-info', primary: '', warning: 'is-warning' }

/**
 * Two-column service tiles — white surfaces + icon accents (Home service language).
 */
export default function ServiceTileGrid({ items = [], onSelect, className = '' }) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: `pharmacy-services:${items.length}`,
  })

  return (
    <div className={`service-tile-grid ${className}`.trim()} ref={containerRef}>
      {items.map((item, index) => {
        const tone = TONE[item.tone] || 'success'
        return (
        <RevealItem
          as="button"
          type="button"
          key={item.id}
          className={[
            'service-tile ds-card is-interactive',
            item.badge || item.subtitle ? 'service-tile--detail' : '',
          ].filter(Boolean).join(' ')}
          revealed={isRevealed(index)}
          cached={isCached}
          ref={setItemRef(index)}
          onClick={() => onSelect?.(item)}
        >
          <span className={`service-tile__icon ds-icon-well is-tile is-lg ${WELL[tone]}`.trim()} aria-hidden="true">
            <PharmacyIcon name={item.icon} size={20} />
          </span>
          {item.badge ? <span className={`service-tile__badge ds-badge is-${tone}`}>{item.badge}</span> : null}
          <span className="service-tile__label">{item.label}</span>
          {item.subtitle ? <span className="service-tile__subtitle">{item.subtitle}</span> : null}
          {item.badge || item.subtitle ? null : (
            <span className="service-tile__chevron" aria-hidden="true">
              <PharmacyIcon name="chevron" />
            </span>
          )}
        </RevealItem>
        )
      })}
    </div>
  )
}
