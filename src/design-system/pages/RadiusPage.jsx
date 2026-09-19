const radii = [
  { token: '--radius-2xs', value: '4px', label: '2XS' },
  { token: '--radius-xs', value: '6px', label: 'XS' },
  { token: '--radius-sm', value: '8px', label: 'SM' },
  { token: '--radius', value: '12px', label: 'Default' },
  { token: '--radius-md', value: '14px', label: 'MD' },
  { token: '--radius-lg', value: '16px', label: 'LG' },
  { token: '--radius-card', value: '22px', label: 'Card' },
  { token: '--radius-cta', value: '26px', label: 'CTA' },
  { token: '--radius-full', value: '999px', label: 'Full' },
]

export default function RadiusPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Radius</div>
        <h1 className="ds-page-title">Radius</h1>
        <p className="ds-page-description">
          Border radius tokens that create consistent, rounded corners across all components.
        </p>
      </div>

      <div className="ds-callout ds-callout-info">
        <span className="ds-callout-icon">ℹ</span>
        <div>This foundation is in <strong>Beta</strong>. API may change in future releases.</div>
      </div>

      <h2>Radius scale</h2>
      <div className="ds-radius-grid">
        {radii.map((r) => (
          <div key={r.token} className="ds-radius-item">
            <div className="ds-radius-box" style={{ borderRadius: r.value }} />
            <div className="ds-radius-label">{r.label}</div>
            <div className="ds-radius-value">{r.value}</div>
          </div>
        ))}
      </div>

      <h2>Token reference</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td className="ds-token-name">--radius-2xs</td><td>4px</td><td>Badges, small indicators</td></tr>
          <tr><td className="ds-token-name">--radius-xs</td><td>6px</td><td>Tags, tiny elements</td></tr>
          <tr><td className="ds-token-name">--radius-sm</td><td>8px</td><td>Input fields, small buttons</td></tr>
          <tr><td className="ds-token-name">--radius</td><td>12px</td><td>Standard components</td></tr>
          <tr><td className="ds-token-name">--radius-md</td><td>14px</td><td>Medium panels</td></tr>
          <tr><td className="ds-token-name">--radius-lg</td><td>16px</td><td>Large panels, bottom sheets</td></tr>
          <tr><td className="ds-token-name">--radius-card</td><td>22px</td><td>Card surfaces, doctor cards</td></tr>
          <tr><td className="ds-token-name">--radius-cta</td><td>26px</td><td>Primary CTA buttons</td></tr>
          <tr><td className="ds-token-name">--radius-full</td><td>999px</td><td>Avatars, pills, circular controls</td></tr>
        </tbody>
      </table>

      <h2>Radius semantics</h2>
      <p>Each radius level has a specific role in the visual hierarchy:</p>
      <ul>
        <li><strong>Smaller elements</strong> (badges, tags) use smaller radii — 4-8px.</li>
        <li><strong>Content containers</strong> (cards, panels) use medium-large radii — 16-22px.</li>
        <li><strong>Primary actions</strong> (CTA buttons) use generous radii — 26px.</li>
        <li><strong>Circular elements</strong> (avatars, toggles) use full radius — 999px.</li>
      </ul>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use the radius token that matches the element's visual hierarchy. Cards get card-radius, buttons get CTA-radius.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use the same radius for everything. Mixing scales creates visual confusion and breaks hierarchy.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/border">Border</a></li>
        <li><a href="/design/foundations/elevation">Elevation</a></li>
        <li><a href="/design/components/cards">Cards</a></li>
      </ul>
    </>
  )
}
