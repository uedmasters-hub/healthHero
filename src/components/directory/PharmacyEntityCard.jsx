import {
  pharmacyAvatarName,
  pharmacyDisplayTitle,
  shortRegNo,
} from '../../lib/pharmacyModel'
import { mapsPharmacyDirectionsUrl } from '../../features/providers/pharmaciesRepository'
import EntityCard from './EntityCard'

/**
 * Pharmacy card — homepage nearby + browse listing.
 *
 * @param {'browse'|'nearby'} [variant='browse']
 *   nearby — stacked lines, Directions + View
 *   browse — pin location under title, delivery badge + Order
 */
export default function PharmacyEntityCard({
  pharmacy,
  onOpen,
  variant = 'browse',
}) {
  const title = pharmacyDisplayTitle(pharmacy)
  const locationLabel = pharmacy?.locationLabel
    || [pharmacy?.area || pharmacy?.place, pharmacy?.city, pharmacy?.district]
      .filter(Boolean)
      .filter((part, i, arr) => arr.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i)
      .join(', ')
    || pharmacy?.address
    || null

  const license = pharmacy?.licenseNumber || pharmacy?.pharmacyCode || pharmacy?.registrationNo
  const licenseShort = pharmacy?.shortLicense || shortRegNo(license)
  const meta = [
    licenseShort ? `Lic. ${licenseShort}` : null,
    pharmacy?.ddaVerifiedLabel || (pharmacy?.isVerified ? 'DDA verified' : (license ? 'DDA registered' : null)),
  ].filter(Boolean).join(' · ')

  const directionsUrl = mapsPharmacyDirectionsUrl(pharmacy)
  const avatarName = pharmacyAvatarName(pharmacy)
  const isNearby = variant === 'nearby'

  if (isNearby) {
    const stackLines = [
      pharmacy?.distance
        ? { id: 'distance', label: pharmacy.distance }
        : null,
      locationLabel ? { id: 'location', label: locationLabel } : null,
      pharmacy?.openLabel
        ? { id: 'hours', label: pharmacy.openLabel, tone: 'muted' }
        : null,
      pharmacy?.delivers ? { id: 'delivery', label: 'Delivery available', tone: 'muted' } : null,
    ].filter(Boolean)

    return (
      <EntityCard
        className="dir-entity--pharmacy-home"
        name={title}
        meta={meta || null}
        stackLines={stackLines}
        avatarSrc={pharmacy?.logoUrl || pharmacy?.image || null}
        avatarName={avatarName}
        actionLabel="View"
        actionVariant="solid"
        onAction={() => onOpen?.(pharmacy)}
        secondaryActionLabel="Directions"
        secondaryActionHref={directionsUrl || undefined}
        secondaryActionVariant="outline"
        onSecondaryAction={!directionsUrl ? () => onOpen?.(pharmacy) : undefined}
        onClick={() => onOpen?.(pharmacy)}
      />
    )
  }

  return (
    <EntityCard
      className="dir-entity--pharmacy-list"
      name={title}
      meta={meta || null}
      location={locationLabel}
      locationInline
      locationPin
      chips={pharmacy?.distance ? [{ id: 'distance', label: pharmacy.distance }] : []}
      footerBadge={pharmacy?.delivers ? 'Delivery available' : null}
      avatarSrc={pharmacy?.logoUrl || pharmacy?.image || null}
      avatarName={avatarName}
      actionLabel="Order"
      actionVariant="outline"
      onAction={() => onOpen?.(pharmacy)}
      onClick={() => onOpen?.(pharmacy)}
    />
  )
}
