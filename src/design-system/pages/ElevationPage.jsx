const elevations = [
  { name: 'Shadow XS', token: '--shadow-xs', value: '0 1px 2px rgba(24, 7, 48, 0.06)', usage: 'Hairline depth' },
  { name: 'Shadow SM', token: '--shadow-sm', value: '0 1px 3px / 0 1px 2px', usage: 'Subtle lift (PP card)' },
  { name: 'Shadow', token: '--shadow', value: '0 2px 4px rgba(0,0,0,0.05)', usage: 'Menus, popovers' },
  { name: 'Card', token: '--shadow-card', value: '0 1px 3px / 0 1px 2px', usage: 'Optional elevated cards' },
  { name: 'Button', token: '--shadow-btn', value: '0 2px 4px rgba(0,0,0,0.05)', usage: 'Secondary button lift' },
  { name: 'Hover', token: '--shadow-hover', value: '0 10px 15px / 0 4px 6px', usage: 'Interactive hover (PP float)' },
  { name: 'Sheet', token: '--shadow-sheet', value: '0 8px 28px rgba(24, 7, 48, 0.12)', usage: 'Bottom sheets' },
  { name: 'Modal', token: '--shadow-modal', value: '0 16px 48px rgba(24, 7, 48, 0.16)', usage: 'Dialogs / overlays' },
]

export default function ElevationPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Elevation</div>
        <h1 className="ds-page-title">Elevation</h1>
        <p className="ds-page-description">
          PocketPills elevation: edge-first surfaces with soft shadows reserved for true lift
          (menus, sheets, modals).
        </p>
      </div>

      <h2>Elevation philosophy</h2>
      <p>
        Resting cards and panels are defined by a <strong>hairline lavender border</strong>, not a heavy drop shadow.
        Shadows escalate only when a surface floats above the lavender page canvas — sheets, modals, and transient menus.
      </p>
      <p>
        Default <code>.ds-card</code> uses border only. Add <code>.ds-card-elevated</code> (or <code>.is-elevated</code>)
        when a soft card shadow is intentional.
      </p>

      <h2>Elevation levels</h2>
      <div className="ds-elevation-grid">
        {elevations.map((e) => (
          <div key={e.token} className="ds-elevation-item">
            <div className="ds-elevation-box" style={{ boxShadow: `var(${e.token})` }} />
            <div className="ds-elevation-label">{e.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{e.token}</div>
          </div>
        ))}
      </div>

      <h2>Token reference</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Usage</th></tr>
        </thead>
        <tbody>
          {elevations.map((e) => (
            <tr key={e.token}>
              <td className="ds-token-name">{e.token}</td>
              <td>{e.usage}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Prefer border + white island on the tinted canvas for resting content.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Stack strong shadows on every card. It muddies hierarchy and fights the soft canvas.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/color">Color</a></li>
        <li><a href="/design/foundations/border">Border</a></li>
        <li><a href="/design/components/cards">Cards</a></li>
      </ul>
    </>
  )
}
