export default function TokensPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Tokens</div>
        <h1 className="ds-page-title">Design tokens</h1>
        <p className="ds-page-description">
          PocketPills production primitives adopted as eMedicalls&apos; visual system — colors, spacing,
          typography, radius, elevation, and form foundations. Motion tokens are intentionally preserved.
        </p>
      </div>

      <h2>What are design tokens?</h2>
      <p>
        Design tokens are the smallest pieces of a design system — named entities that store
        visual design attributes. Instead of using raw values like <code>#4e2a84</code> or <code>16px</code>,
        we reference semantic tokens like <code>var(--primary)</code> or <code>var(--space-4)</code>.
      </p>

      <div className="ds-callout ds-callout-info">
        <span className="ds-callout-icon">ℹ</span>
        <div>
          All tokens are defined as CSS custom properties in <code>src/index.css</code> under the <code>:root</code> selector.
          Motion tokens are intentionally unchanged in visual-system passes.
        </div>
      </div>

      <h2>Token categories</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Category</th><th>Prefix</th><th>Purpose</th><th>Reference</th></tr>
        </thead>
        <tbody>
          <tr><td>Brand / Primary</td><td><code>--primary-*</code></td><td>Primary brand colors and gradients</td><td><a href="/design/foundations/color">Color</a></td></tr>
          <tr><td>Surfaces</td><td><code>--card-bg</code>, <code>--bg</code></td><td>Background and surface colors</td><td><a href="/design/foundations/color">Color</a></td></tr>
          <tr><td>Text</td><td><code>--text-*</code></td><td>Typography colors</td><td><a href="/design/foundations/color">Color</a></td></tr>
          <tr><td>Borders</td><td><code>--border-*</code></td><td>Border colors and widths</td><td><a href="/design/foundations/border">Border</a></td></tr>
          <tr><td>Status</td><td><code>--success</code>, <code>--danger</code></td><td>Semantic status colors</td><td><a href="/design/foundations/color">Color</a></td></tr>
          <tr><td>Shadow</td><td><code>--shadow-*</code></td><td>Elevation levels</td><td><a href="/design/foundations/elevation">Elevation</a></td></tr>
          <tr><td>Radius</td><td><code>--radius-*</code></td><td>Border radius values</td><td><a href="/design/foundations/radius">Radius</a></td></tr>
          <tr><td>Spacing</td><td><code>--space-*</code></td><td>4px-based spacing scale</td><td><a href="/design/foundations/spacing">Spacing</a></td></tr>
          <tr><td>Typography</td><td><code>--text-*-size</code></td><td>Font sizes and line heights</td><td><a href="/design/foundations/typography">Typography</a></td></tr>
          <tr><td>Icons</td><td><code>--icon-*</code></td><td>Icon sizing scale</td><td><a href="/design/foundations/iconography">Iconography</a></td></tr>
          <tr><td>Motion</td><td><code>--duration-*</code></td><td>Animation durations</td><td><a href="/design/foundations/motion">Motion</a></td></tr>
        </tbody>
      </table>

      <h2>Using tokens</h2>
      <h3>In CSS</h3>
      <pre><code>{`.my-component {
  color: var(--text-primary);
  background: var(--card-bg);
  padding: var(--space-4);
  border-radius: var(--radius);
  font-size: var(--text-body-size);
  box-shadow: var(--shadow-card);
}`}</code></pre>

      <h3>Token naming convention</h3>
      <p>Tokens follow a hierarchical naming pattern:</p>
      <pre><code>{`--category-variant
--text-primary        (text > primary)
--text-secondary      (text > secondary)
--shadow-card         (shadow > card)
--radius-lg           (radius > large)
--space-4             (space > step 4 = 16px)`}</code></pre>

      <h2>Primitive vs. semantic tokens</h2>
      <p>
        <strong>Primitive tokens</strong> represent raw values (<code>--white: #FFFFFF</code>).
        <strong>Semantic tokens</strong> represent purpose (<code>--card-bg: #FFFFFF</code>).
        Always use semantic tokens in your code so theme changes propagate automatically.
      </p>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use <code>var(--card-bg)</code> for card backgrounds. If the theme changes, cards update automatically.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use <code>#FFFFFF</code> directly. This won't respond to theme changes and creates maintenance debt.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/color">Color tokens</a></li>
        <li><a href="/design/foundations/spacing">Spacing tokens</a></li>
        <li><a href="/design/foundations/typography">Typography tokens</a></li>
        <li><a href="/design/foundations/elevation">Elevation tokens</a></li>
      </ul>
    </>
  )
}
