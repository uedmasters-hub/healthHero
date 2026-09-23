export default function BorderPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Border</div>
        <h1 className="ds-page-title">Border</h1>
        <p className="ds-page-description">
          Border colors, widths, and usage patterns for surfaces and interactive elements.
        </p>
      </div>

      <div className="ds-callout ds-callout-info">
        <span className="ds-callout-icon">ℹ</span>
        <div>This foundation is in <strong>Beta</strong>. API may change in future releases.</div>
      </div>

      <h2>Border tokens</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td className="ds-token-name">--border</td><td>primary-800 @ 12%</td><td>Default hairline — cards, inputs, sheets</td></tr>
          <tr><td className="ds-token-name">--border-subtle / --divider</td><td>primary-800 @ 9%</td><td>Hairline dividers inside surfaces</td></tr>
          <tr><td className="ds-token-name">--border-strong</td><td>primary-800 @ 20%</td><td>Emphasized separators, footers</td></tr>
          <tr><td className="ds-token-name">--border-focus</td><td>#8c60ff (primary-500)</td><td>Focus accent</td></tr>
        </tbody>
      </table>

      <h2>Border widths</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td className="ds-token-name">--border-width</td><td>1px</td><td>Standard borders</td></tr>
          <tr><td className="ds-token-name">--border-width-emphasis</td><td>1.5px</td><td>Emphasized borders</td></tr>
          <tr><td className="ds-token-name">--border-width-strong</td><td>2px</td><td>Active indicators, focus rings</td></tr>
        </tbody>
      </table>

      <h2>Border usage patterns</h2>
      <pre><code>{`/* Card border */
border: var(--border-width) solid var(--border);

/* Divider between sections */
border-top: var(--border-width) solid var(--border-subtle);

/* Active nav item indicator */
border-left: var(--border-width-strong) solid var(--primary);

/* Focus ring */
outline: 3px solid var(--primary-500);
outline-offset: 2px;`}</code></pre>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use <code>--border-subtle</code> for internal dividers. It creates separation without visual weight.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use <code>--border-strong</code> for every border. Strong borders should be reserved for emphasis.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/elevation">Elevation</a></li>
        <li><a href="/design/foundations/radius">Radius</a></li>
      </ul>
    </>
  )
}
