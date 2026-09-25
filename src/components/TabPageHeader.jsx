/**
 * Large iOS-style tab page header — Pharmacy reference.
 * Sticky outside the scroll region; optional leading control + action slots.
 */
export default function TabPageHeader({
  title,
  leading = null,
  actions = null,
  className = '',
}) {
  return (
    <header className={`tab-page-header ${className}`.trim()}>
      {leading}
      <div className="tab-page-header__left">
        <h1 className="tab-page-header__title">{title}</h1>
      </div>
      {actions ? (
        <div className="tab-page-header__actions">{actions}</div>
      ) : (
        <span className="tab-page-header__actions-spacer" aria-hidden="true" />
      )}
    </header>
  )
}
