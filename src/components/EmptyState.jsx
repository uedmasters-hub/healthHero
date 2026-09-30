import { EmptyState as DsEmptyState } from './ui'

/**
 * Illustrated empty state — thin adapter over the shared `ui/EmptyState`
 * (`.ds-empty`). Kept for existing call sites (image / alt / title / message).
 */
export default function EmptyState({
  image,
  alt = '',
  title = 'Coming soon',
  message,
  action = null,
  icon = null,
  card = false,
  compact = false,
}) {
  return (
    <DsEmptyState
      image={image}
      imageAlt={alt}
      icon={icon}
      title={title}
      message={message}
      action={action}
      card={card}
      compact={compact}
    />
  )
}
