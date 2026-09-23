const radii = [
  { token: '--radius-2xs', value: '0.125rem', label: '2XS (PP xs)' },
  { token: '--radius-xs', value: '0.375rem', label: 'XS' },
  { token: '--radius-sm / --radius', value: '0.5rem', label: 'SM (PP s)' },
  { token: '--radius-md', value: '0.75rem', label: 'MD' },
  { token: '--radius-lg / --field-radius', value: '1rem', label: 'LG / Field (PP m)' },
  { token: '--radius-card / --radius-xl', value: '24px', label: 'Card' },
  { token: '--radius-device', value: '2.25rem', label: 'Device (PP x)' },
  { token: '--radius-cta / --radius-full', value: '9999px', label: 'Pill' },
]

export default function RadiusPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Radius</div>
        <h1 className="ds-page-title">Radius</h1>
        <p className="ds-page-description">
          PocketPills radius ladder — compact chrome, 1rem fields, 1.5rem cards, and pill CTAs.
        </p>
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
          <tr><td className="ds-token-name">--radius-pp-xs / --radius-2xs</td><td>0.125rem</td><td>Badges, small indicators</td></tr>
          <tr><td className="ds-token-name">--radius-pp-s / --radius-sm</td><td>0.5rem</td><td>Compact chips, small controls</td></tr>
          <tr><td className="ds-token-name">--radius-pp-m / --field-radius</td><td>1rem</td><td>Text fields, structured inputs</td></tr>
          <tr><td className="ds-token-name">--radius-pp-l / --radius-card</td><td>24px</td><td>Cards, content islands, sheets</td></tr>
          <tr><td className="ds-token-name">--radius-pp-x / --radius-device</td><td>2.25rem</td><td>Large device frames</td></tr>
          <tr><td className="ds-token-name">--radius-cta</td><td>pill</td><td>Primary CTA buttons</td></tr>
          <tr><td className="ds-token-name">--app-sheet-radius</td><td>24px</td><td>Sheet top corners only</td></tr>
          <tr><td className="ds-token-name">--radius-full</td><td>9999px</td><td>Avatars, icon buttons, pills</td></tr>
        </tbody>
      </table>

      <h2>Radius semantics</h2>
      <ul>
        <li><strong>Smaller elements</strong> (badges, tags) use 0.125–0.5rem.</li>
        <li><strong>Fields</strong> use 1rem (<code>--field-radius</code> / PP <code>radius-m</code>).</li>
        <li><strong>Cards / sheets</strong> use 1.5rem for a soft island feel.</li>
        <li><strong>Primary actions</strong> use full pill radius.</li>
        <li><strong>Never</strong> apply pill radius to sheet top corners — use <code>--app-sheet-radius</code>.</li>
      </ul>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Match radius to role: field → 1rem, card → 24px, CTA → pill.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use the same radius for fields, cards, and sheets. Mixing roles flattens hierarchy.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/border">Border</a></li>
        <li><a href="/design/components/buttons">Buttons</a></li>
        <li><a href="/design/components/cards">Cards</a></li>
      </ul>
    </>
  )
}
