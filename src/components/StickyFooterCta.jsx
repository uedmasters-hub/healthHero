/**
 * Shared sticky footer CTA used by Appointment Details, Ready for Visit, Payment, etc.
 * Layout tokens live in index.css (.sticky-footer-cta*) — do not override spacing per page.
 *
 * Interaction rule: this footer owns the bottom safe area. Screens that render it are
 * sticky-CTA surfaces — Home-style scroll FAB motion is disabled, and secondary actions
 * must stay above (--fab-cta-gap), never overlapping the primary CTA.
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
