import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import './CategoryChips.css'

export default function CategoryChips({
  items = [],
  title = 'Categories',
  activeId = null,
  variant = 'quiet',
  hideHeader = false,
  onSelect,
  className = '',
}) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: `pharmacy-cats:${items.length}`,
  })

  return (
    <section className={`category-chips ${className}`.trim()} aria-label={title}>
      {hideHeader ? null : (
        <div className="section-header category-chips__header">
          <h2 className="section-title">{title}</h2>
        </div>
      )}
      <div className="category-chips__scroll" ref={containerRef}>
        {items.map((item, index) => {
          const selected = activeId != null && item.id === activeId
          return (
            <RevealItem
              as="button"
              type="button"
              key={item.id}
              className={[
                'category-chip',
                variant === 'solid' ? 'is-solid' : '',
                selected ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
              aria-pressed={selected}
              revealed={isRevealed(index)}
              cached={isCached}
              ref={setItemRef(index)}
              onClick={() => onSelect?.(item)}
            >
              {item.label}
            </RevealItem>
          )
        })}
      </div>
    </section>
  )
}
