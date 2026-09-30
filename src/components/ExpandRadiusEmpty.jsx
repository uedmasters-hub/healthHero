import { Button, EmptyState } from './ui'

/**
 * Empty state that offers expanding the global search radius (`.ds-empty`).
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
    <EmptyState
      role="status"
      className="expand-radius-empty"
      title={`No ${entityLabel} within ${radiusKm} km${locality ? ` of ${locality}` : ''}`}
      message="Try a wider search radius, or pick another location."
      action={(
        <>
          {nextRadiusKm != null ? (
            <Button size="sm" onClick={onExpand}>
              Expand to {nextRadiusKm} km
            </Button>
          ) : null}
          {onChangeLocation ? (
            <Button size="sm" variant="secondary" onClick={onChangeLocation}>
              Change location
            </Button>
          ) : null}
        </>
      )}
    />
  )
}
