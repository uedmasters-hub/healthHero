import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import './RecentStrip.css'

export default function RecentStrip({
  items = [],
  title = 'Recently Ordered',
  onSelect,
  className = '',
}) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: `pharmacy-recent:${items.length}`,
  })

  if (!items.length) return null

  return (
    <section className={`recent-strip ${className}`.trim()} aria-label={title}>
      <div className="section-header recent-strip__header">
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="recent-strip__scroll" ref={containerRef}>
        {items.map((item, index) => (
          <RevealItem
            as="button"
            type="button"
            key={item.id}
            className="recent-card"
            revealed={isRevealed(index)}
            cached={isCached}
            ref={setItemRef(index)}
            onClick={() => onSelect?.(item)}
          >
            <span className="recent-card__thumb" aria-hidden="true">
              <img src={item.thumbnail} alt="" />
            </span>
            <span className="recent-card__name">{item.name}</span>
            {item.detail ? (
              <span className="recent-card__detail">{item.detail}</span>
            ) : null}
          </RevealItem>
        ))}
      </div>
    </section>
  )
}
