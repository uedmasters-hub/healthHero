import {
  facilityAvatarName,
  facilityDisplayTitle,
} from '../../lib/facilityModel'
import EntityCard from './EntityCard'

/**
 * Facility card — classification in subtitle, location only in the location row.
 * Avatar initials come from the cleaned display name (facilityModel).
 */
export default function FacilityEntityCard({ center, onOpen }) {
  const name = facilityDisplayTitle(center)
  const locationLabel = center?.locationLabel
    || [center?.city, center?.district].filter(Boolean)
      .filter((part, i, arr) => arr.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i)
      .join(', ')
    || center?.address
    || null

  const classification = center?.classification
    || center?.typeLabel
    || center?.facilityLevel
    || center?.type
    || 'Healthcare Center'

  const meta = [
    center?.hfCode || center?.shortHfCode
      ? `HF #${center.shortHfCode || String(center.hfCode).slice(-6)}`
      : null,
    center?.isVerified ? 'Verified' : null,
    center?.rating != null ? `★ ${Number(center.rating).toFixed(1)}` : null,
  ].filter(Boolean).join(' · ')

  const chips = [
    center?.openLabel ? { id: 'hours', label: center.openLabel } : null,
    center?.distance ? { id: 'distance', label: center.distance } : null,
    center?.departmentCount > 0
      ? { id: 'depts', label: `${center.departmentCount} dept${center.departmentCount === 1 ? '' : 's'}` }
      : null,
    center?.serviceCount > 0
      ? { id: 'services', label: `${center.serviceCount} service${center.serviceCount === 1 ? '' : 's'}` }
      : null,
  ].filter(Boolean)

  return (
    <EntityCard
      name={name}
      subtitle={classification}
      meta={meta || null}
      location={locationLabel || null}
      chips={chips}
      avatarSrc={center?.image || null}
      avatarName={facilityAvatarName(center)}
      badge={center?.isVerified ? 'Verified' : null}
      actionLabel="View"
      onAction={() => onOpen?.(center)}
      onClick={() => onOpen?.(center)}
    />
  )
}
