import { useCallback } from 'react'
import useStaggerReveal from '../useStaggerReveal'
import { useOriginBack } from '../../features/pushNav'
import { BRAND_SUPPORT_EMAIL } from '../../lib/brand'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../PullToRefreshIndicator'
import { refreshProfileData } from '../../features/sync/pageRefresh'
import { AppBar, Button, DetailRow, EmptyState, List, ListRow, Progress, SectionHead as UiSectionHead, cx } from '../ui'
import '../PatientProfile.css'

export const CARE_SUPPORT = {
  phone: '+9779845271970',
  phoneLabel: '+977 9845 271 970',
  email: BRAND_SUPPORT_EMAIL,
}

export function dash(value) {
  if (value == null || String(value).trim() === '') return ''
  return value
}

export function ProfilePage({ title, onBack, action, children, dataset }) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({ dataset })
  // Prefer real history / returnTo over a hardcoded Profile hub jump.
  const defaultBack = useOriginBack('/profile')
  const goBack = onBack || defaultBack
  const pageRef = containerRef
  // Profile page itself scrolls (.ds-page)
  const onRefresh = useCallback(() => refreshProfileData(), [])
  const ptr = usePullToRefresh(pageRef, onRefresh)

  return (
    <div className="ds-page user-profile-page" ref={pageRef}>
      <AppBar title={title} onBack={goBack} actions={action} />
      <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
      <div className="ds-page__body">
        {typeof children === 'function' ? children({ setItemRef, isRevealed, isCached }) : children}
        <p className="ds-page__note user-profile-footer">You&apos;ve reached the end</p>
      </div>
    </div>
  )
}

/** Caps group label + optional text action ("Edit", "Add") */
export function SectionHead({ title, action, onAction }) {
  return (
    <UiSectionHead
      group
      as="h3"
      title={title}
      action={action ? <Button variant="text" size="sm" onClick={onAction}>{action}</Button> : null}
    />
  )
}

export function InfoCard({ children, className = '' }) {
  return <List className={className}>{children}</List>
}

/** Detail row — caption label above the value, optional trailing aside */
export function InfoRow({ label, value, extra, emptyLabel = 'Add this detail' }) {
  return <DetailRow label={label} value={value} extra={extra} emptyLabel={emptyLabel} />
}

export function NavGroup({ children }) {
  return <List>{children}</List>
}

export function NavRow({ icon, label, onClick, href, progress }) {
  return (
    <ListRow
      as={href ? 'a' : 'button'}
      href={href}
      onClick={onClick}
      icon={icon ? <span className="ds-icon-well" aria-hidden="true">{icon}</span> : null}
      title={label}
      chevron
      trailing={progress ? (
        <span className={cx('profile-nav-progress', `is-${progress.tone || 'partial'}`)}>
          <span className="profile-nav-progress__meta">{progress.statusLabel}</span>
          <Progress thin tone="brand" value={progress.percent} />
        </span>
      ) : null}
    />
  )
}

export function GuidedEmpty({ title, body, cta, onClick }) {
  return (
    <EmptyState
      card
      compact
      title={title}
      message={body}
      action={cta ? <Button variant="secondary" size="sm" onClick={onClick}>{cta}</Button> : null}
    />
  )
}

/** Stylised map tile for saved addresses — colours come from tokens */
export function MapThumb({ seed = '' }) {
  const n = [...String(seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const y1 = 18 + (n % 10)
  const y2 = 38 + (n % 8)
  const x = 22 + (n % 18)
  return (
    <div className="profile-map-thumb" aria-hidden="true">
      <svg viewBox="0 0 84 64" className="keep-stroke">
        <rect width="84" height="64" fill="var(--map-land)" />
        <path d={`M0 ${y1} H84`} stroke="var(--map-road)" strokeWidth="6" />
        <path d={`M0 ${y2} H84`} stroke="var(--map-road-minor)" strokeWidth="4" />
        <path d={`M${x} 0 V64`} stroke="var(--map-road)" strokeWidth="5" />
        <path d={`M${x + 28} 0 V64`} stroke="var(--map-road-minor)" strokeWidth="3" />
        <circle cx="42" cy="32" r="7" fill="var(--primary-950)" />
        <circle cx="42" cy="32" r="3" fill="var(--neutral-0)" />
      </svg>
    </div>
  )
}

const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

export const ProfileIcons = {
  person: (
    <svg {...iconProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  medical: (
    <svg {...iconProps}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  records: (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  insurance: (
    <svg {...iconProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  message: (
    <svg {...iconProps}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  call: (
    <svg {...iconProps}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  account: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  email: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  district: (
    <svg {...iconProps}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  payment: (
    <svg {...iconProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
}
