export default function LogosPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Logos</div>
        <h1 className="ds-page-title">Logos</h1>
        <p className="ds-page-description">
          eMedicalls brand mark usage, clear space, and sizing guidelines.
        </p>
      </div>

      <h2>Brand mark</h2>
      <p>
        The eMedicalls logo consists of the brand mark and wordmark. Use the horizontal
        lockup when space permits; use the mark alone only at small sizes where the wordmark
        becomes illegible.
      </p>

      <div className="ds-preview">
        <div className="ds-preview-stage" style={{ padding: 40 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '16px 24px', background: 'white', borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary-950), var(--primary-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 16,
            }}>H</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>eMedicalls</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>DESIGN SYSTEM</div>
            </div>
          </div>
        </div>
      </div>

      <h2>Clear space</h2>
      <p>
        Maintain a minimum clear space around the logo equal to the height of the "H" mark.
        This ensures the logo remains distinct from surrounding elements.
      </p>

      <h2>Sizing</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Context</th><th>Width</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td>Compact</td><td>24px mark</td><td>Favicons, small UI elements</td></tr>
          <tr><td>Standard</td><td>32px mark</td><td>Sidebar headers, app bars</td></tr>
          <tr><td>Prominent</td><td>48px mark</td><td>Login screens, splash</td></tr>
          <tr><td>Full lockup</td><td>140px+</td><td>Marketing, documentation</td></tr>
        </tbody>
      </table>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use the logo on white or very light backgrounds for maximum contrast and legibility.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Rotate, distort, recolor, or add effects to the logo. Never place it on busy backgrounds.</p>
        </div>
      </div>

      <h2>File formats</h2>
      <ul>
        <li><strong>SVG</strong> — Preferred for all digital use. Scalable and crisp at any size.</li>
        <li><strong>PNG</strong> — For contexts that don't support SVG (email signatures, etc.).</li>
        <li><strong>PDF</strong> — For print materials.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/color">Color</a></li>
        <li><a href="/design/foundations/illustrations">Illustrations</a></li>
      </ul>
    </>
  )
}
