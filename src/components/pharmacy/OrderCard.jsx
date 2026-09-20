import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import StatusChip from './StatusChip'
import { PharmacyIcon } from './PharmacyIcons'
import { getPharmacyOrderStatus } from '../../data/pharmacy'
import './OrderCard.css'

export function OrderCard({ order, onClick, revealed = true, cached = false, itemRef }) {
  const status = getPharmacyOrderStatus(order.status)

  return (
    <RevealItem
      as="button"
      type="button"
      className="order-card"
      revealed={revealed}
      cached={cached}
      ref={itemRef}
      onClick={() => onClick?.(order)}
    >
      <span className="order-card__thumb" aria-hidden="true">
        <img src={order.thumbnail} alt="" />
      </span>
      <span className="order-card__copy">
        <span className="order-card__name">{order.name}</span>
        <StatusChip label={status.label} tone={status.tone} />
        {order.window ? (
          <span className="order-card__window">{order.window}</span>
        ) : null}
      </span>
      <span className="order-card__chevron" aria-hidden="true">
        <PharmacyIcon name="chevron" />
      </span>
    </RevealItem>
  )
}

export default function OrderList({
  orders = [],
  title = 'Your Orders',
  onViewAll,
  onSelect,
  className = '',
}) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    delay: 240,
    namespace: `pharmacy-orders:${orders.length}`,
  })

  return (
    <section className={`order-list ${className}`.trim()} aria-label={title}>
      <div className="section-header order-list__header">
        <h2 className="section-title">{title}</h2>
        {onViewAll ? (
          <button type="button" className="view-all-link" onClick={onViewAll}>
            View All &gt;
          </button>
        ) : null}
      </div>
      <div className="order-list__rows" ref={containerRef}>
        {orders.map((order, index) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={onSelect}
            revealed={isRevealed(index)}
            cached={isCached}
            itemRef={setItemRef(index)}
          />
        ))}
      </div>
    </section>
  )
}
