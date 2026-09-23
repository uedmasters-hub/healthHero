const spacings = [
  { token: '--space-0-5', value: 2, label: 'space-0.5' },
  { token: '--space-1', value: 4, label: 'space-1' },
  { token: '--space-1-5', value: 6, label: 'space-1.5' },
  { token: '--space-2', value: 8, label: 'space-2' },
  { token: '--space-2-5', value: 10, label: 'space-2.5' },
  { token: '--space-3', value: 12, label: 'space-3' },
  { token: '--space-3-5', value: 14, label: 'space-3.5' },
  { token: '--space-4', value: 16, label: 'space-4' },
  { token: '--space-5', value: 20, label: 'space-5' },
  { token: '--space-6', value: 24, label: 'space-6' },
  { token: '--space-7', value: 28, label: 'space-7' },
  { token: '--space-8', value: 32, label: 'space-8' },
  { token: '--space-10', value: 40, label: 'space-10' },
  { token: '--space-12', value: 48, label: 'space-12' },
  { token: '--space-16', value: 64, label: 'space-16' },
]

export default function SpacingPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Spacing</div>
        <h1 className="ds-page-title">Spacing</h1>
        <p className="ds-page-description">
          PocketPills spacing ladder (rem) mapped onto eMedicalls step names for rhythm across all surfaces.
        </p>
      </div>

      <h2>The spacing scale</h2>
      <p>
        Values follow PocketPills production rem steps (<code>--space-xxs</code>…<code>--space-5xl</code>),
        exposed through eMedicalls aliases like <code>--space-1</code>…<code>--space-16</code>.
      </p>

      <div style={{ margin: '0 0 32px' }}>
        {spacings.map((s) => (
          <div key={s.token} className="ds-spacing-row">
            <span className="ds-spacing-label">{s.label}</span>
            <div className="ds-spacing-bar" style={{ width: Math.min(s.value * 4, 400) }} />
            <span className="ds-spacing-px">{s.value}px</span>
          </div>
        ))}
      </div>

      <h2>Spacing tokens</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Use case</th></tr>
        </thead>
        <tbody>
          <tr><td className="ds-token-name">--space-0-5</td><td>2px</td><td>Inline icon offset</td></tr>
          <tr><td className="ds-token-name">--space-1</td><td>4px</td><td>Tight inline gaps</td></tr>
          <tr><td className="ds-token-name">--space-2</td><td>8px</td><td>Compact element spacing</td></tr>
          <tr><td className="ds-token-name">--space-3</td><td>12px</td><td>Component inner padding</td></tr>
          <tr><td className="ds-token-name">--space-4</td><td>16px</td><td>Card padding, standard gaps</td></tr>
          <tr><td className="ds-token-name">--space-5</td><td>20px</td><td>Page padding (mobile)</td></tr>
          <tr><td className="ds-token-name">--space-6</td><td>24px</td><td>Section gaps</td></tr>
          <tr><td className="ds-token-name">--space-8</td><td>32px</td><td>Large section separation</td></tr>
          <tr><td className="ds-token-name">--space-10</td><td>40px</td><td>Major layout divisions</td></tr>
          <tr><td className="ds-token-name">--space-12</td><td>48px</td><td>Page-level spacing</td></tr>
          <tr><td className="ds-token-name">--space-16</td><td>64px</td><td>Major layout breathing room</td></tr>
        </tbody>
      </table>

      <h2>Composite tokens</h2>
      <p>Some tokens combine base spacing values for specific contexts:</p>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td className="ds-token-name">--page-padding</td><td>var(--space-5)</td><td>Mobile page horizontal padding</td></tr>
          <tr><td className="ds-token-name">--content-padding</td><td>var(--space-5)</td><td>Content horizontal padding</td></tr>
          <tr><td className="ds-token-name">--layout-gutter</td><td>var(--space-5)</td><td>Standard layout gutter</td></tr>
          <tr><td className="ds-token-name">--section-gap</td><td>var(--space-6)</td><td>Gap between page sections</td></tr>
          <tr><td className="ds-token-name">--section-header-gap</td><td>var(--space-3)</td><td>Title ↔ content within a section</td></tr>
          <tr><td className="ds-token-name">--card-gap</td><td>var(--space-4)</td><td>Gap between adjacent cards</td></tr>
          <tr><td className="ds-token-name">--card-padding</td><td>var(--space-4)</td><td>Inner padding of card surfaces</td></tr>
        </tbody>
      </table>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use spacing tokens consistently. The 4px grid ensures elements align visually across screens.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use arbitrary pixel values like 13px or 17px. These break the visual rhythm and look inconsistent.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/grid">Grid system</a></li>
      </ul>
    </>
  )
}
