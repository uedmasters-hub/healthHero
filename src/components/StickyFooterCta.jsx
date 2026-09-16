/**
 * Shared sticky footer CTA used by Appointment Details and Ready for Visit.
 * Layout tokens live in index.css (.sticky-footer-cta*) — do not override spacing per page.
 */
export default function StickyFooterCta({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel = 'Back to Home',
  onSecondary,
  pending = false,
}) {
  return (
    <div className={`sticky-footer-cta${pending ? ' is-pending' : ''}`}>
      <button
        type="button"
        className="sticky-footer-cta__primary"
        disabled={primaryDisabled}
        onClick={onPrimary}
      >
        {primaryLabel}
      </button>
      <button type="button" className="sticky-footer-cta__secondary" onClick={onSecondary}>
        {secondaryLabel}
      </button>
    </div>
  )
}
