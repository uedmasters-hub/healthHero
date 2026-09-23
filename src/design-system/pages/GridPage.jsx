export default function GridPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Grid</div>
        <h1 className="ds-page-title">Grid</h1>
        <p className="ds-page-description">
          Layout structure for responsive, consistent content organization.
        </p>
      </div>

      <h2>Mobile-first layout</h2>
      <p>
        eMedicalls is primarily a mobile-first product. The base layout uses a single-column
        structure with consistent horizontal padding defined by <code>--page-padding</code> /
        <code>--layout-gutter</code> (1.25rem). Sections stack with <code>--section-gap</code> (1.5rem).
      </p>

      <h3>Base layout</h3>
      <pre><code>{`.page {
  padding: 0 var(--page-padding);
  max-width: var(--phone-width);
  margin: 0 auto;
}`}</code></pre>

      <h2>Breakpoints</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Context</th><th>Width</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td>Mobile (default)</td><td>0–440px</td><td>Single column, standard padding</td></tr>
          <tr><td>Tablet</td><td>768px+</td><td>Two-column cards possible</td></tr>
          <tr><td>Desktop</td><td>1024px+</td><td>Multi-column layouts for dashboards</td></tr>
          <tr><td>Wide</td><td>1440px+</td><td>Max content width with centered layout</td></tr>
        </tbody>
      </table>

      <h2>Content width constraints</h2>
      <p>
        On larger screens, content should never stretch beyond readability limits. Use max-width
        constraints to maintain comfortable reading line lengths (60-80 characters).
      </p>

      <h2>Gutters and padding</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td className="ds-token-name">--page-padding</td><td>1.25rem</td><td>Mobile page edges</td></tr>
          <tr><td className="ds-token-name">--card-padding</td><td>1rem</td><td>Card internal padding</td></tr>
          <tr><td className="ds-token-name">--card-gap</td><td>1rem</td><td>Space between cards in a grid</td></tr>
          <tr><td className="ds-token-name">--section-gap</td><td>1.5rem</td><td>Space between content sections</td></tr>
        </tbody>
      </table>

      <h2>Card grids</h2>
      <p>
        For card-based layouts, use CSS Grid with responsive column counts. Cards should
        maintain consistent gaps and stretch to equal heights within a row.
      </p>
      <pre><code>{`.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--card-gap);
}`}</code></pre>

      <div className="ds-callout ds-callout-info">
        <span className="ds-callout-icon">ℹ</span>
        <div>
          eMedicalls' phone frame constrains content to 440px. The design system documentation
          site uses full browser width for optimal reading experience.
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/spacing">Spacing</a></li>
        <li><a href="/design/components/cards">Cards</a></li>
      </ul>
    </>
  )
}
