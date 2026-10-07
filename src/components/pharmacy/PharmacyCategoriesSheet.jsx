import { useCallback, useEffect } from 'react'
import { SheetPortal, useAppSheet } from '../PageTransition'
import { SheetHeader } from '../ui'
import { CategoryArt } from './PharmacyHome'
import '../SpecialisationsPage.css'

/** "See All" for Popular categories — same sheet shell as Home's All Specialisations. */
export default function PharmacyCategoriesSheet({ open, items = [], onClose, onSelect }) {
  const { isPresented, isClosing, show, hide } = useAppSheet()

  const close = useCallback((after) => {
    hide(() => {
      onClose?.()
      after?.()
    })
  }, [hide, onClose])

  useEffect(() => {
    if (open) show()
  }, [open, show])

  useEffect(() => {
    if (!isPresented || isClosing) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresented, isClosing, close])

  if (!isPresented) return null

  return (
    <SheetPortal to="screen">
      <div
        className={`specialisations-overlay rx-categories-sheet ${isClosing ? 'closing' : 'opening'}`}
        onClick={() => close()}
      >
        <div
          className="specialisations-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rx-categories-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="ds-sheet-handle" aria-hidden="true" />
          <SheetHeader
            as="h2"
            className="sheet-page-header"
            titleId="rx-categories-title"
            title="All Categories"
            onClose={() => close()}
          />
          <div className="specialisations-page">
            <div className="specialisations-grid">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="ds-card is-interactive specialisation-card"
                  style={{ '--item-index': index }}
                  onClick={() => close(() => onSelect?.(item))}
                >
                  <CategoryArt item={item} className="specialisation-icon" />
                  <span className="specialisation-name">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="specialisations-footer">- You&apos;ve reached the end -</div>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
