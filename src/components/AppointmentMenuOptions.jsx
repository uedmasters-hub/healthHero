/** Renders shared appointment kebab/sheet options from getAppointmentActions().menuItems */
export default function AppointmentMenuOptions({ items = [], onAction, className = '' }) {
  if (!items.length) return null

  return (
    <div className={className || undefined}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ds-sheet-option${item.tone === 'danger' ? ' is-danger' : ''}`}
          onClick={() => onAction?.(item)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
