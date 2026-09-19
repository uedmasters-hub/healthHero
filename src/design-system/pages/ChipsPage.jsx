export default function ChipsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Chips</div>
        <h1 className="ds-page-title">Chips</h1>
        <p className="ds-page-description">
          Compact elements for labels, tags, filters, and status indicators.
        </p>
      </div>

      <h2>Chip variants</h2>
      <div className="ds-preview">
        <div className="ds-preview-stage">
          <span className="ds-showcase-chip ds-showcase-chip-default">Default</span>
          <span className="ds-showcase-chip ds-showcase-chip-brand">Brand</span>
          <span className="ds-showcase-chip ds-showcase-chip-success">Success</span>
          <span className="ds-showcase-chip ds-showcase-chip-warning">Warning</span>
          <span className="ds-showcase-chip ds-showcase-chip-danger">Danger</span>
        </div>
        <div className="ds-preview-code">
          <pre><code>{`<span className="ds-chip">Default</span>
<span className="ds-chip is-brand">Brand</span>
<span className="ds-chip is-success">Success</span>
<span className="ds-chip is-warning">Warning</span>
<span className="ds-chip is-danger">Danger</span>`}</code></pre>
        </div>
      </div>

      <h2>Tokens</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Property</th><th>Token</th><th>Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Background (default)</td><td><code>--badge-bg</code></td><td>#F2F4F7</td></tr>
          <tr><td>Background (brand)</td><td><code>--primary-soft</code></td><td>#EEF0FF</td></tr>
          <tr><td>Background (success)</td><td><code>--success-bg</code></td><td>#E8F5E9</td></tr>
          <tr><td>Border radius</td><td><code>--radius-full</code></td><td>999px</td></tr>
          <tr><td>Font size</td><td><code>--text-label-size</code></td><td>13px</td></tr>
          <tr><td>Icon size</td><td><code>--icon-chip-size</code></td><td>28px</td></tr>
        </tbody>
      </table>

      <h2>Use cases</h2>
      <ul>
        <li><strong>Tags</strong> — Categorize content (specialties, symptoms, tags).</li>
        <li><strong>Status</strong> — Show appointment status (upcoming, completed, cancelled).</li>
        <li><strong>Filters</strong> — Active filter indicators in search and browse.</li>
        <li><strong>Counters</strong> — Badge counts on notifications, messages.</li>
      </ul>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use chips for short, scannable labels. Keep text under 20 characters for clean layout.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use chips for long text or multi-line content. Use a card or list item instead.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/color">Color</a></li>
        <li><a href="/design/foundations/radius">Radius</a></li>
      </ul>
    </>
  )
}
