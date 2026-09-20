export default function IllustrationsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Illustrations</div>
        <h1 className="ds-page-title">Illustrations</h1>
        <p className="ds-page-description">
          Illustrative imagery used for empty states, onboarding, and feature promotion.
        </p>
      </div>

      <h2>Illustration style</h2>
      <p>
        eMedicalls illustrations use a friendly, minimal style with the primary color palette.
        They are never photorealistic — they communicate concepts simply and warmly.
      </p>

      <h3>Style guidelines</h3>
      <ul>
        <li><strong>Line weight</strong> — Consistent 2px strokes, matching icon system.</li>
        <li><strong>Color</strong> — Primary palette only. Use <code>--primary</code>, <code>--primary-light</code>, and <code>--primary-soft</code>.</li>
        <li><strong>Complexity</strong> — Minimal detail. Convey the concept in the simplest visual form.</li>
        <li><strong>Human presence</strong> — When people appear, use abstract shapes, not detailed faces.</li>
      </ul>

      <h2>Use cases</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Context</th><th>Style</th><th>Size</th></tr>
        </thead>
        <tbody>
          <tr><td>Empty states</td><td>Simple concept illustration</td><td>120×120px</td></tr>
          <tr><td>Onboarding</td><td>Step-by-step feature illustrations</td><td>200×200px</td></tr>
          <tr><td>Error pages</td><td>Friendly recovery illustration</td><td>160×160px</td></tr>
          <tr><td>Promotional</td><td>Detailed feature showcase</td><td>320×240px</td></tr>
        </tbody>
      </table>

      <h2>Placement rules</h2>
      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Center illustrations in their container with consistent spacing. Let them breathe.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Stretch or compress illustrations. Always maintain aspect ratio and use object-fit.</p>
        </div>
      </div>

      <h2>Creating illustrations</h2>
      <p>
        All illustrations should be created as SVG for scalability. Export from Figma using
        the eMedicalls illustration template. Optimize SVGs before committing to remove
        unnecessary metadata.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/color">Color</a></li>
        <li><a href="/design/foundations/iconography">Iconography</a></li>
        <li><a href="/design/foundations/logos">Logos</a></li>
      </ul>
    </>
  )
}
