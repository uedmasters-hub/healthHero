import { cx } from './ui'
import './ActionGrid.css'

/**
 * Shortcut grid used by Home services, the All Services sheet, Pharmacy and
 * Healthcare centers: hairline-ruled card, outline icon over a caption.
 * Short rows are padded with empty cells so the rules always close.
 */
export default function ActionGrid({
  items = [],
  columns = 4,
  onSelect,
  label,
  className = '',
  style,
}) {
  if (!items.length) return null
  const spacers = (columns - (items.length % columns)) % columns
  return (
    <nav
      className={cx('action-grid', className)}
      aria-label={label}
      style={{ '--action-grid-columns': columns, ...style }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="action-grid__cell"
          onClick={() => onSelect?.(item)}
        >
          <span className="action-grid__icon" aria-hidden="true">{item.icon}</span>
          <span className="action-grid__label">{item.label}</span>
        </button>
      ))}
      {Array.from({ length: spacers }, (_, index) => (
        <span key={`spacer-${index}`} className="action-grid__cell is-spacer" aria-hidden="true" />
      ))}
    </nav>
  )
}
