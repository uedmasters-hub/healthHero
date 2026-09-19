const elevations = [
  { name: 'Shadow XS', token: '--shadow-xs', value: '0 1px 3px rgba(17, 24, 39, 0.08)' },
  { name: 'Shadow SM', token: '--shadow-sm', value: '0 1px 3px rgba(17, 24, 39, 0.08)' },
  { name: 'Shadow', token: '--shadow', value: '0 2px 8px rgba(0, 0, 0, 0.08)' },
  { name: 'Card', token: '--shadow-card', value: '0 4px 16px rgba(17, 24, 39, 0.05)' },
  { name: 'Hover', token: '--shadow-hover', value: '0 4px 16px rgba(91, 95, 198, 0.12)' },
  { name: 'Sheet', token: '--shadow-sheet', value: '0 8px 28px rgba(17, 24, 39, 0.12)' },
  { name: 'Modal', token: '--shadow-modal', value: '0 16px 40px rgba(17, 24, 39, 0.18)' },
  { name: 'Focus', token: '--shadow-focus', value: '0 0 0 3px rgba(91, 95, 198, 0.28)' },
]

export default function ElevationPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Elevation</div>
        <h1 className="ds-page-title">Elevation</h1>
        <p className="ds-page-description">
          Shadow system that communicates depth and spatial relationships between surfaces.
        </p>
      </div>

      <h2>Elevation philosophy</h2>
      <p>
        Elevation in Health Hero is communicated through shadows, not color changes. Higher
        elevation means the surface is closer to the user — like a modal floating above the page.
        Each elevation level has a specific purpose.
      </p>

      <h2>Elevation levels</h2>
      <div className="ds-elevation-grid">
        {elevations.map((e) => (
          <div key={e.token} className="ds-elevation-item">
            <div className="ds-elevation-box" style={{ boxShadow: e.value }} />
            <div className="ds-elevation-label">{e.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{e.token}</div>
          </div>
        ))}
      </div>

      <h2>Token reference</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          {elevations.map((e) => (
            <tr key={e.token}>
              <td className="ds-token-name">{e.token}</td>
              <td className="ds-token-value" style={{ fontSize: 11 }}>{e.value}</td>
              <td>{e.name === 'Card' && 'Cards, panels'}
                {e.name === 'Hover' && 'Interactive hover states'}
                {e.name === 'Sheet' && 'Bottom sheets, drawers'}
                {e.name === 'Modal' && 'Modal dialogs, lightboxes'}
                {e.name === 'Focus' && 'Focus ring indicator'}
                {!['Card', 'Hover', 'Sheet', 'Modal', 'Focus'].includes(e.name) && 'Subtle depth'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Usage guidelines</h2>
      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use elevation progressively. Higher elements should have stronger shadows to communicate z-depth.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use heavy shadows on already-elevated surfaces. Stacking shadows looks muddy and unprofessional.</p>
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
