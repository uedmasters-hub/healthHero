/**
 * Shared UI primitives — thin React wrappers over the classes in
 * src/styles/primitives.css. Every screen builds from these so buttons,
 * cards, chips, fields, badges, skeletons and empty states look and behave
 * the same everywhere (PocketPills design language).
 *
 * Wrappers only compose class names and forward props/refs; they own no
 * business logic, so swapping one in never changes behaviour.
 */
import { forwardRef } from 'react'

export const cx = (...parts) => parts.filter(Boolean).join(' ')

/* ── Icons (stroke 1.7, round caps — PP nav geometry) ─────────────────── */
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const Icon = {
  Back: (p) => (
    <svg {...iconProps} {...p}><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
  ),
  Close: (p) => (
    <svg {...iconProps} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  ChevronRight: (p) => (
    <svg {...iconProps} {...p}><path d="m9 18 6-6-6-6" /></svg>
  ),
  ChevronDown: (p) => (
    <svg {...iconProps} {...p}><path d="m6 9 6 6 6-6" /></svg>
  ),
  Search: (p) => (
    <svg {...iconProps} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  More: (p) => (
    <svg {...iconProps} {...p}><circle cx="12" cy="5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="19" r="1.2" fill="currentColor" /></svg>
  ),
  Plus: (p) => (
    <svg {...iconProps} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Check: (p) => (
    <svg {...iconProps} {...p}><path d="M20 6 9 17l-5-5" /></svg>
  ),
}

/* ── Button ───────────────────────────────────────────────────────────── */
/**
 * @param {'primary'|'secondary'|'ghost'|'outline'|'text'|'danger'|'danger-quiet'|'wellness'|'glass'|'inverse'} variant
 * @param {'lg'|'md'|'sm'} size
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    icon = null,
    trailingIcon = null,
    as: As = 'button',
    className = '',
    type,
    children,
    ...rest
  },
  ref,
) {
  const isButton = As === 'button'
  return (
    <As
      ref={ref}
      type={isButton ? type || 'button' : type}
      className={cx(
        'ds-btn',
        `ds-btn--${variant}`,
        `ds-btn--${size}`,
        block && 'ds-btn--block',
        loading && 'is-loading',
        className,
      )}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {children}
      {trailingIcon}
    </As>
  )
})

/* ── Icon button ──────────────────────────────────────────────────────── */
/**
 * @param {'ghost'|'subtle'|'filled'|'brand'} tone
 */
export const IconButton = forwardRef(function IconButton(
  { label, tone = 'ghost', size, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cx(
        'ds-icon-btn',
        tone !== 'ghost' && `is-${tone}`,
        size && `is-${size}`,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

export function BackButton({ onClick, label = 'Back', className = '', ...rest }) {
  return (
    <IconButton label={label} onClick={onClick} className={cx('is-ink', className)} data-push-back {...rest}>
      <Icon.Back />
    </IconButton>
  )
}

/* ── App bar (pushed pages) ───────────────────────────────────────────── */
/**
 * Centred title with a back control and optional trailing actions.
 * `lead` replaces the back button (e.g. a close icon); pass `lead={null}` for none.
 */
export function AppBar({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  lead,
  actions = null,
  flush = false,
  canvas = false,
  className = '',
  titleId,
  as: As = 'header',
  children,
}) {
  const leading = lead !== undefined
    ? lead
    : onBack
      ? <BackButton onClick={onBack} label={backLabel} />
      : null
  return (
    <As className={cx('ds-app-bar', flush && 'is-flush', canvas && 'is-canvas', className)}>
      <div className="ds-app-bar__lead">{leading}</div>
      {title != null ? (
        <h1 className="ds-app-bar__title" id={titleId}>
          {title}
          {subtitle ? <span className="ds-app-bar__sub">{subtitle}</span> : null}
        </h1>
      ) : (
        children || <span />
      )}
      <div className="ds-app-bar__actions">{actions}</div>
    </As>
  )
}

/* ── Card ─────────────────────────────────────────────────────────────── */
/**
 * Hairline-edged white island. `interactive` renders a <button> with the
 * shared hover/pressed tints; `padded` applies the card inset.
 */
export const Card = forwardRef(function Card(
  {
    as,
    interactive = false,
    padded = false,
    selected = false,
    compact = false,
    muted = false,
    className = '',
    type,
    ...rest
  },
  ref,
) {
  const As = as || (interactive ? 'button' : 'div')
  return (
    <As
      ref={ref}
      type={As === 'button' ? type || 'button' : type}
      className={cx(
        'ds-card',
        interactive && 'is-interactive',
        padded === 'lg' ? 'is-padded-lg' : padded && 'is-padded',
        selected && 'is-selected',
        compact && 'is-compact',
        muted && 'is-muted',
        className,
      )}
      {...rest}
    />
  )
})

/* ── Chip ─────────────────────────────────────────────────────────────── */
export const Chip = forwardRef(function Chip(
  { selected = false, soft = false, size, className = '', type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cx('ds-chip', soft && 'ds-chip--soft', size === 'sm' && 'ds-chip--sm', className)}
      {...rest}
    >
      {children}
    </button>
  )
})

export function ChipRow({ bleed = false, className = '', label, children, ...rest }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('ds-chip-row', bleed && 'is-bleed', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

/* ── Badge ────────────────────────────────────────────────────────────── */
/**
 * @param {'neutral'|'primary'|'info'|'success'|'warning'|'danger'|'wellness'|'processing'|'muted'|'solid'|'glass'|'ready'} tone
 */
export function Badge({ tone = 'neutral', caps = false, className = '', children, ...rest }) {
  return (
    <span className={cx('ds-badge', `is-${tone}`, caps && 'is-caps', className)} {...rest}>
      {children}
    </span>
  )
}

/* ── Field ────────────────────────────────────────────────────────────── */
export const TextField = forwardRef(function TextField(
  { label, hint, error, id, leading = null, trailing = null, className = '', fieldClassName = '', ...inputProps },
  ref,
) {
  const fieldId = id || (label ? `f-${String(label).toLowerCase().replace(/\W+/g, '-')}` : undefined)
  const hintId = hint && !error ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  return (
    <div className={className}>
      {label ? <label className="ds-field-label" htmlFor={fieldId}>{label}</label> : null}
      <div className={cx('ds-field', error && 'is-error', inputProps.disabled && 'is-disabled', fieldClassName)}>
        {leading}
        <input
          ref={ref}
          id={fieldId}
          className="ds-field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && !error ? <p id={hintId} className="ds-field-hint">{hint}</p> : null}
      {error ? <p id={errorId} className="ds-field-error" role="alert">{error}</p> : null}
    </div>
  )
})

export const SearchField = forwardRef(function SearchField(
  { className = '', trailing = null, label = 'Search', ...inputProps },
  ref,
) {
  return (
    <label className={cx('ds-search', className)}>
      <Icon.Search className="ds-search__icon" />
      <input ref={ref} type="search" className="ds-search__input" aria-label={label} {...inputProps} />
      {trailing}
    </label>
  )
})

export function Switch({ checked, onChange, label, className = '', ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx('ds-switch', className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    />
  )
}

/* ── Section head ─────────────────────────────────────────────────────── */
export function SectionHead({ title, eyebrow, sub, action = null, as: As = 'h2', className = '', id }) {
  return (
    <div className={cx('ds-section-head', className)}>
      <div>
        {eyebrow ? <p className="ds-overline">{eyebrow}</p> : null}
        <As className="ds-section-head__title" id={id}>{title}</As>
        {sub ? <p className="ds-section-head__sub">{sub}</p> : null}
      </div>
      {action ? <div className="ds-section-head__action">{action}</div> : null}
    </div>
  )
}

/* ── List ─────────────────────────────────────────────────────────────── */
export function List({ as: As = 'div', className = '', ...rest }) {
  return <As className={cx('ds-list', className)} {...rest} />
}

export function ListRow({
  as,
  icon = null,
  title,
  subtitle,
  trailing = null,
  chevron,
  danger = false,
  className = '',
  type,
  children,
  ...rest
}) {
  const As = as || (rest.onClick ? 'button' : 'div')
  const showChevron = chevron ?? As !== 'div'
  return (
    <As
      type={As === 'button' ? type || 'button' : type}
      className={cx('ds-list-row', danger && 'is-danger', className)}
      {...rest}
    >
      {icon}
      <span className="ds-list-row__body">
        {title != null ? <span className="ds-list-row__title">{title}</span> : null}
        {subtitle ? <span className="ds-list-row__sub">{subtitle}</span> : null}
        {children}
      </span>
      {trailing || showChevron ? (
        <span className="ds-list-row__trail">
          {trailing}
          {showChevron ? <Icon.ChevronRight className="ds-list-row__chevron" /> : null}
        </span>
      ) : null}
    </As>
  )
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
export function Skeleton({ shape, width, height, className = '', style, ...rest }) {
  return (
    <span
      aria-hidden="true"
      className={cx('ds-skel', shape && `is-${shape}`, className)}
      style={{ width, height, ...style }}
      {...rest}
    />
  )
}

export function SkeletonText({ lines = 2, className = '' }) {
  return (
    <span className={cx('ds-stack is-tight', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} shape="text" width={i === lines - 1 && lines > 1 ? '62%' : '100%'} />
      ))}
    </span>
  )
}

/* ── Empty state ──────────────────────────────────────────────────────── */
export function EmptyState({
  icon = null,
  image,
  imageAlt = '',
  title,
  message,
  action = null,
  card = false,
  compact = false,
  className = '',
  role,
}) {
  return (
    <div className={cx('ds-empty', card && 'is-card', compact && 'is-compact', className)} role={role}>
      {image ? (
        <div className="ds-empty__media"><img src={image} alt={imageAlt} loading="lazy" /></div>
      ) : icon ? (
        <div className="ds-empty__media"><span className="ds-icon-well is-lg">{icon}</span></div>
      ) : null}
      {title ? <p className="ds-empty__title">{title}</p> : null}
      {message ? <p className="ds-empty__copy">{message}</p> : null}
      {action ? <div className="ds-empty__actions">{action}</div> : null}
    </div>
  )
}
