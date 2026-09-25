/**
 * Empty state that offers expanding the global search radius.
 */
export default function ExpandRadiusEmpty({
  radiusKm,
  nextRadiusKm,
  locality,
  onExpand,
  onChangeLocation,
  entityLabel = 'results',
}) {
  return (
    <div className="expand-radius-empty" role="status">
      <p className="expand-radius-empty__title">
        No {entityLabel} within {radiusKm} km
        {locality ? ` of ${locality}` : ''}
      </p>
      <p className="expand-radius-empty__sub">
        Try a wider search radius, or pick another location.
      </p>
      <div className="expand-radius-empty__actions">
        {nextRadiusKm != null ? (
          <button type="button" className="expand-radius-empty__primary" onClick={onExpand}>
            Expand to {nextRadiusKm} km
          </button>
        ) : null}
        {onChangeLocation ? (
          <button type="button" className="expand-radius-empty__secondary" onClick={onChangeLocation}>
            Change location
          </button>
        ) : null}
      </div>
    </div>
  )
}
