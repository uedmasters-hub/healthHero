/**
 * Large iOS-style tab page header — Treat / Centers / Settings language.
 * Sticky outside the scroll region; circular action slots on the right.
 */
export default function TabPageHeader({
  title,
  subtitle,
  actions = null,
  className = '',
}) {
  return (
    <header className={`tab-page-header ${className}`.trim()}>
      <div className="tab-page-header__left">
        <h1 className="tab-page-header__title">{title}</h1>
        {subtitle ? (
          <p className="tab-page-header__subtitle">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="tab-page-header__actions">{actions}</div>
      ) : null}
    </header>
  )
}
